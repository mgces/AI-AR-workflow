#!/usr/bin/env python3
"""Scan an OpenHarmony source path into deterministic TSV/JSON indexes."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


TARGET_RE = re.compile(r'^\s*([A-Za-z_][A-Za-z0-9_]*)\("([^"]+)"\)\s*\{')
DEFAULT_EXCLUDES = {
    ".git", ".repo", "out", "prebuilts", "node_modules", ".hvigor", "build-output"
}
NON_PRODUCTION_PARTS = {
    "test", "tests", "unittest", "fuzztest", "systemtest", "moduletest",
    "benchmark", "example", "examples", "demo", "demos",
}


def clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (list, tuple, set)):
        return ",".join(clean(item) for item in value if clean(item))
    return re.sub(r"[\t\r\n]+", " ", str(value)).strip()


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def rel(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def is_excluded_relative(relative: Path, excludes: set[str]) -> bool:
    return any(part in excludes for part in relative.parts)


def is_non_production(relative: str) -> bool:
    return any(part.lower() in NON_PRODUCTION_PARTS for part in Path(relative).parts)


def walk_files(source: Path, workspace: Path, excludes: set[str]) -> Iterable[Path]:
    for current, dirs, files in os.walk(source):
        current_path = Path(current)
        dirs[:] = [name for name in dirs if name not in excludes]
        relative_dir = current_path.relative_to(workspace)
        if is_excluded_relative(relative_dir, excludes):
            dirs[:] = []
            continue
        for name in files:
            yield current_path / name


def git(repo: Path, *args: str) -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(repo), *args], check=True, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def discover_repositories(source: Path, workspace: Path, excludes: set[str]) -> list[dict[str, Any]]:
    roots: set[Path] = set()
    for current, dirs, files in os.walk(source):
        current_path = Path(current)
        has_git = ".git" in dirs or ".git" in files
        if has_git:
            roots.add(current_path.resolve())
        dirs[:] = [name for name in dirs if name not in excludes]
    if not roots:
        top = git(source, "rev-parse", "--show-toplevel")
        if top:
            root = Path(top).resolve()
            if root == source.resolve() or source.resolve().is_relative_to(root):
                roots.add(root)

    repositories = []
    for root in sorted(roots):
        status = git(root, "status", "--porcelain=v1").splitlines()
        staged = unstaged = untracked = 0
        for line in status:
            if line.startswith("??"):
                untracked += 1
            else:
                staged += int(bool(line[:1].strip()))
                unstaged += int(bool(line[1:2].strip()))
        repositories.append({
            "path": rel(root, workspace),
            "repository": Path(git(root, "config", "--get", "remote.origin.url") or root.name).name,
            "head": git(root, "rev-parse", "HEAD"),
            "branch": git(root, "symbolic-ref", "--short", "-q", "HEAD") or "DETACHED",
            "changed_entries": len(status),
            "staged": staged,
            "unstaged": unstaged,
            "untracked": untracked,
        })
    return repositories


def load_product_parts(path: Path | None) -> set[str]:
    if not path or not path.exists():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return set()
    parts = data.get("parts", data if isinstance(data, list) else [])
    return {clean(item) for item in as_list(parts)}


def repository_for(file_path: str, repositories: list[dict[str, Any]]) -> dict[str, Any] | None:
    matches = [item for item in repositories if file_path == item["path"] or file_path.startswith(item["path"] + "/")]
    return max(matches, key=lambda item: len(item["path"]), default=None)


def component_for(file_path: str, components: list[dict[str, Any]]) -> dict[str, Any] | None:
    matches = [item for item in components if file_path == item["bundle_dir"] or file_path.startswith(item["bundle_dir"] + "/")]
    return max(matches, key=lambda item: len(item["bundle_dir"]), default=None)


def infer_subsystem(relative: str, source_relative: str) -> str:
    remainder = relative[len(source_relative):].lstrip("/") if relative.startswith(source_relative) else relative
    return remainder.split("/", 1)[0] or Path(source_relative).name


def classify_target(target_type: str, name: str, build_file: str) -> str:
    lower_type = target_type.lower()
    lower_name = name.lower()
    if lower_type in {"config", "template"}:
        return "build-support"
    if "test" in lower_type or "test" in lower_name or is_non_production(build_file):
        return "test"
    if (lower_type in {"group", "action", "action_foreach"} or "copy" in lower_type or
            lower_type.startswith(("generate_", "gen_")) or "asset" in lower_type or
            "resource" in lower_type):
        return "aggregate-codegen"
    return "production"


def read_previous(output: Path) -> dict[str, dict[str, dict[str, str]]]:
    result: dict[str, dict[str, dict[str, str]]] = {}
    key_fields = {
        "repositories.tsv": ["path"],
        "components.tsv": ["subsystem", "component", "metadata_path"],
        "modules.tsv": ["build_file", "line", "target_type", "target_name"],
        "processes.tsv": ["host_subsystem", "process"],
        "runtime-entities.tsv": ["process", "entity_type", "evidence_file", "sa_id", "executable"],
    }
    for name, keys in key_fields.items():
        file_path = output / name
        rows: dict[str, dict[str, str]] = {}
        if file_path.exists():
            lines = file_path.read_text(encoding="utf-8").rstrip("\n").splitlines()
            if lines:
                header = lines[0].split("\t")
                for line in lines[1:]:
                    fields = line.split("\t")
                    row = dict(zip(header, fields))
                    key = "\x1f".join(row.get(field, "") for field in keys)
                    rows[key] = row
        result[name] = rows
    return result


def write_tsv(output: Path, name: str, header: list[str], rows: list[dict[str, Any]]) -> None:
    lines = ["\t".join(header)]
    for row in rows:
        lines.append("\t".join(clean(row.get(field, "")) for field in header))
    (output / name).write_text("\n".join(lines) + "\n", encoding="utf-8")


def row_key(row: dict[str, Any], fields: list[str]) -> str:
    return "\x1f".join(clean(row.get(field, "")) for field in fields)


def calculate_changes(previous: dict[str, dict[str, dict[str, str]]], datasets: dict[str, tuple[list[dict[str, Any]], list[str]]]) -> dict[str, Any]:
    changes: dict[str, Any] = {"generatedAt": datetime.now(timezone.utc).isoformat()}
    for name, (rows, keys) in datasets.items():
        old = previous.get(name, {})
        new = {row_key(row, keys): {key: clean(value) for key, value in row.items()} for row in rows}
        added = sorted(set(new) - set(old))
        removed = sorted(set(old) - set(new))
        changed = sorted(key for key in set(new) & set(old) if new[key] != old[key])
        changes[name.removesuffix(".tsv")] = {
            "addedCount": len(added), "removedCount": len(removed), "changedCount": len(changed),
            "addedKeys": added, "removedKeys": removed, "changedKeys": changed,
        }
    return changes


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-root", required=True)
    parser.add_argument("--source-path", required=True)
    parser.add_argument("--domain-name", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--product-parts")
    parser.add_argument("--exclude", action="append", default=[])
    args = parser.parse_args()

    workspace = Path(args.workspace_root).resolve()
    source = Path(args.source_path)
    if not source.is_absolute():
        source = workspace / source
    source = source.resolve()
    if not source.exists() or not source.is_dir():
        raise SystemExit(f"source path does not exist: {source}")
    if not source.is_relative_to(workspace):
        raise SystemExit("source path must be inside workspace root")
    source_relative = rel(source, workspace)
    output = Path(args.output_dir).resolve()
    output.mkdir(parents=True, exist_ok=True)
    previous = read_previous(output)
    excludes = DEFAULT_EXCLUDES | set(args.exclude)
    product_parts = load_product_parts(Path(args.product_parts).resolve() if args.product_parts else None)

    files = list(walk_files(source, workspace, excludes))
    repositories = discover_repositories(source, workspace, excludes)
    repository_paths = sorted(repositories, key=lambda item: len(item["path"]), reverse=True)

    components: list[dict[str, Any]] = []
    for bundle_file in sorted(file for file in files if file.name == "bundle.json"):
        try:
            data = json.loads(bundle_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        metadata = data.get("component", {}) if isinstance(data, dict) else {}
        if not isinstance(metadata, dict) or not metadata.get("name"):
            continue
        build = metadata.get("build", {}) if isinstance(metadata.get("build"), dict) else {}
        deps = metadata.get("deps", {}) if isinstance(metadata.get("deps"), dict) else {}
        bundle_path = rel(bundle_file, workspace)
        repository = repository_for(bundle_path, repository_paths)
        subsystem = clean(metadata.get("subsystem")) or infer_subsystem(bundle_path, source_relative)
        component = clean(metadata.get("name"))
        part_key = f"{subsystem}:{component}"
        inner_kits = as_list(build.get("inner_kits"))
        components.append({
            "subsystem": subsystem,
            "component": component,
            "repository_path": repository["path"] if repository else "",
            "repository": repository["repository"] if repository else "",
            "metadata_path": bundle_path,
            "bundle_dir": str(Path(bundle_path).parent.as_posix()),
            "product_selected": "yes" if part_key in product_parts else "no",
            "adapted_system_types": clean(metadata.get("adapted_system_type")),
            "description": clean(data.get("description") or metadata.get("description")),
            "syscaps": clean(metadata.get("syscap")),
            "features": clean(metadata.get("features")),
            "component_dependencies": clean(deps.get("components")),
            "third_party_dependencies": clean(deps.get("third_party")),
            "sub_component_targets": clean(build.get("sub_component")),
            "inner_kit_targets": clean([item.get("name") for item in inner_kits if isinstance(item, dict)]),
            "test_entries": clean(build.get("test")),
            "rom": clean(metadata.get("rom")),
            "ram": clean(metadata.get("ram")),
            "static_target_count": 0,
            "production_target_count": 0,
            "test_target_count": 0,
            "build_support_target_count": 0,
            "aggregate_codegen_target_count": 0,
            "runtime_entity_count": 0,
        })
    components.sort(key=lambda item: (item["subsystem"], item["component"], item["metadata_path"]))

    directory_subsystems: dict[str, set[str]] = defaultdict(set)
    for component in components:
        relative = component["metadata_path"][len(source_relative):].lstrip("/")
        top_directory = relative.split("/", 1)[0] if relative else ""
        if top_directory:
            directory_subsystems[top_directory].add(component["subsystem"])

    def infer_mapped_subsystem(file_path: str) -> str:
        relative = file_path[len(source_relative):].lstrip("/") if file_path.startswith(source_relative) else file_path
        top_directory = relative.split("/", 1)[0] if relative else ""
        candidates = directory_subsystems.get(top_directory, set())
        return next(iter(candidates)) if len(candidates) == 1 else infer_subsystem(file_path, source_relative)

    repo_components: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for component in components:
        repo_components[component["repository_path"]].append(component)

    modules: list[dict[str, Any]] = []
    build_files = sorted(file for file in files if file.name == "BUILD.gn")
    for build_file in build_files:
        build_path = rel(build_file, workspace)
        repository = repository_for(build_path, repository_paths)
        try:
            lines = build_file.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            continue
        for line_number, line in enumerate(lines, 1):
            match = TARGET_RE.match(line)
            if not match:
                continue
            target_type, target_name = match.groups()
            component = component_for(build_path, components)
            mapping_method = "component-prefix" if component else ""
            if not component and repository and len(repo_components.get(repository["path"], [])) == 1:
                component = repo_components[repository["path"]][0]
                mapping_method = "single-component-repository"
            build_dir = str(Path(build_path).parent.as_posix())
            subsystem = component["subsystem"] if component else infer_mapped_subsystem(build_path)
            category = classify_target(target_type, target_name, build_path)
            module = {
                "subsystem": subsystem,
                "component": component["component"] if component else "",
                "repository_path": repository["path"] if repository else "",
                "repository": repository["repository"] if repository else "",
                "build_file": build_path,
                "line": line_number,
                "target_type": target_type,
                "target_name": target_name,
                "target_label": f"//{build_dir}:{target_name}",
                "category": category,
                "mapping_method": mapping_method or "unmapped",
            }
            modules.append(module)
            if component:
                component["static_target_count"] += 1
                component[f"{category.replace('-', '_')}_target_count"] += 1
    modules.sort(key=lambda item: (item["subsystem"], item["component"], item["build_file"], item["line"]))

    processes: dict[str, dict[str, Any]] = {}

    def process_node(name: str) -> dict[str, Any]:
        return processes.setdefault(name, {
            "process": name, "init": [], "sa": [], "components": set(), "executables": set()
        })

    for runtime_file in sorted(file for file in files if file.suffix in {".json", ".cfg"}):
        runtime_path = rel(runtime_file, workspace)
        if is_non_production(runtime_path):
            continue
        try:
            data = json.loads(runtime_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if not isinstance(data, dict):
            continue
        owner = component_for(runtime_path, components)
        services = data.get("services")
        if isinstance(services, list):
            for service in services:
                if not isinstance(service, dict) or not isinstance(service.get("name"), str):
                    continue
                node = process_node(service["name"])
                executable = clean(service.get("path"))
                item = {
                    "entity_type": "init-service", "owner": owner, "evidence_file": runtime_path,
                    "executable": executable, "sa_id": "", "library": "",
                    "start_mode": clean(service.get("start-mode") or service.get("start_mode") or
                                        ("ondemand" if service.get("ondemand") is True else
                                         "boot" if service.get("ondemand") is False else "")),
                    "ondemand": clean(service.get("ondemand")), "run_on_create": "",
                    "uid": clean(service.get("uid")), "gid": clean(service.get("gid")),
                    "selinux_domain": clean(service.get("secon")),
                }
                node["init"].append(item)
                if owner:
                    node["components"].add((owner["subsystem"], owner["component"], "init-owner"))
        if isinstance(data.get("process"), str) and isinstance(data.get("systemability"), list):
            node = process_node(data["process"])
            for ability in data["systemability"]:
                if not isinstance(ability, dict) or ability.get("name") is None:
                    continue
                item = {
                    "entity_type": "system-ability", "owner": owner, "evidence_file": runtime_path,
                    "executable": "", "sa_id": clean(ability.get("name")),
                    "library": clean(ability.get("libpath")), "start_mode": "", "ondemand": "",
                    "run_on_create": clean(ability.get("run-on-create")), "uid": "", "gid": "",
                    "selinux_domain": "",
                }
                node["sa"].append(item)
                if owner:
                    node["components"].add((owner["subsystem"], owner["component"], "sa-provider"))

    executable_modules = [item for item in modules if item["category"] == "production" and
                          "executable" in item["target_type"].lower() and
                          not is_non_production(item["build_file"]) and
                          not re.search(r"(^|/)(tools?|cli)(/|$)", item["build_file"], re.I)]
    for node in processes.values():
        executable_names = {Path(token).name for item in node["init"] for token in item["executable"].split()}
        for module in executable_modules:
            if module["target_name"] == node["process"] or module["target_name"] in executable_names:
                node["executables"].add(module["target_label"])
                if module["component"]:
                    node["components"].add((module["subsystem"], module["component"], "executable-owner"))

    def most_common(values: list[str]) -> str:
        return Counter(values).most_common(1)[0][0] if values else "unknown"

    runtime_entities: list[dict[str, Any]] = []
    process_rows: list[dict[str, Any]] = []
    component_lookup = {(item["subsystem"], item["component"]): item for item in components}
    for node in processes.values():
        init_subsystems = [item["owner"]["subsystem"] for item in node["init"] if item["owner"]]
        executable_subsystems = [subsystem for subsystem, _, role in node["components"] if role == "executable-owner"]
        sa_subsystems = [item["owner"]["subsystem"] for item in node["sa"] if item["owner"]]
        host_subsystem = most_common(init_subsystems or executable_subsystems or sa_subsystems)
        node["host_subsystem"] = host_subsystem
        for item in node["init"] + node["sa"]:
            owner = item["owner"]
            runtime_entities.append({
                "host_subsystem": host_subsystem, "process": node["process"],
                "entity_type": item["entity_type"],
                "owner_subsystem": owner["subsystem"] if owner else "",
                "owner_component": owner["component"] if owner else "",
                "executable": item["executable"], "sa_id": item["sa_id"], "library": item["library"],
                "start_mode": item["start_mode"], "ondemand": item["ondemand"],
                "run_on_create": item["run_on_create"], "uid": item["uid"], "gid": item["gid"],
                "selinux_domain": item["selinux_domain"], "evidence_file": item["evidence_file"],
                "mapping_method": "component-prefix" if owner else "unmapped",
            })
            if owner:
                owner["runtime_entity_count"] += 1
        process_rows.append({
            "host_subsystem": host_subsystem, "process": node["process"],
            "init_service_count": len(node["init"]), "system_ability_count": len(node["sa"]),
            "participating_component_count": len({(s, c) for s, c, _ in node["components"]}),
            "executable_targets": clean(sorted(node["executables"])),
            "start_modes": clean(sorted({item["start_mode"] for item in node["init"] if item["start_mode"]})),
            "uids": clean(sorted({item["uid"] for item in node["init"] if item["uid"]})),
            "gids": clean(sorted({item["gid"] for item in node["init"] if item["gid"]})),
            "selinux_domains": clean(sorted({item["selinux_domain"] for item in node["init"] if item["selinux_domain"]})),
            "sa_ids": clean(sorted({item["sa_id"] for item in node["sa"] if item["sa_id"]})),
            "libraries": clean(sorted({item["library"] for item in node["sa"] if item["library"]})),
            "evidence_files": clean(sorted({item["evidence_file"] for item in node["init"] + node["sa"]})),
            "mapping_confidence": "strong" if node["init"] else "medium",
        })
    process_rows.sort(key=lambda item: (item["host_subsystem"], item["process"]))
    runtime_entities.sort(key=lambda item: (item["host_subsystem"], item["process"], item["entity_type"], item["evidence_file"], item["sa_id"]))

    for repository in repositories:
        component_count = len(repo_components.get(repository["path"], []))
        target_count = sum(1 for item in modules if item["repository_path"] == repository["path"])
        if component_count and target_count:
            coverage = "component-and-targets"
        elif target_count:
            coverage = "repository-targets-only"
        elif component_count:
            coverage = "component-only"
        else:
            coverage = "repository-only"
        repository.update({
            "subsystem": most_common([item["subsystem"] for item in repo_components.get(repository["path"], [])]) or
                         infer_mapped_subsystem(repository["path"]),
            "component_count": component_count, "static_target_count": target_count,
            "coverage_status": coverage,
        })
    repositories.sort(key=lambda item: item["path"])

    subsystem_names = sorted({item["subsystem"] for item in components} |
                             {item["subsystem"] for item in modules} |
                             {item["host_subsystem"] for item in process_rows if item["host_subsystem"] != "unknown"})
    subsystem_rows = []
    for subsystem in subsystem_names:
        subsystem_rows.append({
            "subsystem": subsystem,
            "repository_count": len({item["repository_path"] for item in components if item["subsystem"] == subsystem and item["repository_path"]}),
            "component_count": sum(item["subsystem"] == subsystem for item in components),
            "product_selected_component_count": sum(item["subsystem"] == subsystem and item["product_selected"] == "yes" for item in components),
            "process_count": sum(item["host_subsystem"] == subsystem for item in process_rows),
            "static_target_count": sum(item["subsystem"] == subsystem for item in modules),
            "production_target_count": sum(item["subsystem"] == subsystem and item["category"] == "production" for item in modules),
            "test_target_count": sum(item["subsystem"] == subsystem and item["category"] == "test" for item in modules),
        })

    repository_header = ["subsystem", "path", "repository", "head", "branch", "changed_entries", "staged", "unstaged", "untracked", "component_count", "static_target_count", "coverage_status"]
    component_header = ["subsystem", "component", "repository_path", "repository", "metadata_path", "product_selected", "adapted_system_types", "description", "syscaps", "features", "component_dependencies", "third_party_dependencies", "sub_component_targets", "inner_kit_targets", "test_entries", "rom", "ram", "runtime_entity_count", "static_target_count", "production_target_count", "test_target_count", "build_support_target_count", "aggregate_codegen_target_count"]
    module_header = ["subsystem", "component", "repository_path", "repository", "build_file", "line", "target_type", "target_name", "target_label", "category", "mapping_method"]
    process_header = ["host_subsystem", "process", "init_service_count", "system_ability_count", "participating_component_count", "executable_targets", "start_modes", "uids", "gids", "selinux_domains", "sa_ids", "libraries", "evidence_files", "mapping_confidence"]
    runtime_header = ["host_subsystem", "process", "entity_type", "owner_subsystem", "owner_component", "executable", "sa_id", "library", "start_mode", "ondemand", "run_on_create", "uid", "gid", "selinux_domain", "evidence_file", "mapping_method"]
    subsystem_header = ["subsystem", "repository_count", "component_count", "product_selected_component_count", "process_count", "static_target_count", "production_target_count", "test_target_count"]

    write_tsv(output, "repositories.tsv", repository_header, repositories)
    write_tsv(output, "components.tsv", component_header, components)
    write_tsv(output, "modules.tsv", module_header, modules)
    write_tsv(output, "unmapped-modules.tsv", module_header, [item for item in modules if not item["component"]])
    write_tsv(output, "processes.tsv", process_header, process_rows)
    write_tsv(output, "runtime-entities.tsv", runtime_header, runtime_entities)
    write_tsv(output, "subsystems.tsv", subsystem_header, subsystem_rows)

    project = lambda rows, header: [{field: row.get(field, "") for field in header} for row in rows]
    datasets = {
        "repositories.tsv": (project(repositories, repository_header), ["path"]),
        "components.tsv": (project(components, component_header), ["subsystem", "component", "metadata_path"]),
        "modules.tsv": (project(modules, module_header), ["build_file", "line", "target_type", "target_name"]),
        "processes.tsv": (project(process_rows, process_header), ["host_subsystem", "process"]),
        "runtime-entities.tsv": (project(runtime_entities, runtime_header), ["process", "entity_type", "evidence_file", "sa_id", "executable"]),
    }
    changes = calculate_changes(previous, datasets)
    (output / "changes.json").write_text(json.dumps(changes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fingerprint_source = "\n".join(item["target_label"] + "@" + item["build_file"] for item in modules)
    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "workspaceRoot": str(workspace), "sourcePath": source_relative,
        "sourceDomain": args.domain_name, "repositories": len(repositories),
        "components": len(components), "subsystems": len(subsystem_rows),
        "buildFiles": len(build_files), "staticTargets": len(modules),
        "mappedTargets": sum(bool(item["component"]) for item in modules),
        "unmappedTargets": sum(not item["component"] for item in modules),
        "processes": len(process_rows),
        "initServiceEntries": sum(item["entity_type"] == "init-service" for item in runtime_entities),
        "systemAbilityEntries": sum(item["entity_type"] == "system-ability" for item in runtime_entities),
        "runtimeEntities": len(runtime_entities),
        "productSelectedComponents": sum(item["product_selected"] == "yes" for item in components),
        "sourceFingerprint": hashlib.sha256(fingerprint_source.encode()).hexdigest(),
        "limitations": [
            "Only literal target declarations on a single BUILD.gn line are indexed.",
            "Invalid or generated runtime JSON is skipped.",
            "Processes without init/SA evidence require manual runtime verification.",
        ],
    }
    (output / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
