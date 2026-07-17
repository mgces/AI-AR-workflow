#!/usr/bin/env python3
"""Verify index equations, document coverage, links, and formatting."""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path


def read_tsv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    if not path.exists():
        return [], []
    lines = path.read_text(encoding="utf-8").rstrip("\n").splitlines()
    if not lines:
        return [], []
    header = lines[0].split("\t")
    return header, [dict(zip(header, line.split("\t"))) for line in lines[1:]]


def safe(value: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9._-]+", "-", value.lower()))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-root", required=True)
    parser.add_argument("--domain-name", required=True)
    parser.add_argument("--index-dir", required=True)
    parser.add_argument("--knowledge-base", required=True)
    args = parser.parse_args()

    workspace = Path(args.workspace_root).resolve()
    index_dir = Path(args.index_dir).resolve()
    kb = Path(args.knowledge_base)
    if not kb.is_absolute():
        kb = workspace / kb
    kb = kb.resolve()
    domain = safe(args.domain_name)
    errors: list[str] = []

    required = [
        "repositories.tsv", "components.tsv", "modules.tsv", "unmapped-modules.tsv",
        "processes.tsv", "runtime-entities.tsv", "subsystems.tsv", "summary.json",
        "changes.json", "generated-documents.json",
    ]
    for name in required:
        if not (index_dir / name).exists():
            errors.append(f"missing index: {name}")

    if errors:
        raise SystemExit("\n".join(errors))

    summary = json.loads((index_dir / "summary.json").read_text(encoding="utf-8"))
    _, repositories = read_tsv(index_dir / "repositories.tsv")
    _, components = read_tsv(index_dir / "components.tsv")
    _, modules = read_tsv(index_dir / "modules.tsv")
    _, unmapped = read_tsv(index_dir / "unmapped-modules.tsv")
    _, processes = read_tsv(index_dir / "processes.tsv")
    _, runtime = read_tsv(index_dir / "runtime-entities.tsv")
    _, subsystems = read_tsv(index_dir / "subsystems.tsv")
    manifest = json.loads((index_dir / "generated-documents.json").read_text(encoding="utf-8"))

    equations = {
        "repositories": (summary.get("repositories"), len(repositories)),
        "components": (summary.get("components"), len(components)),
        "subsystems": (summary.get("subsystems"), len(subsystems)),
        "staticTargets": (summary.get("staticTargets"), len(modules)),
        "unmappedTargets": (summary.get("unmappedTargets"), len(unmapped)),
        "processes": (summary.get("processes"), len(processes)),
        "runtimeEntities": (summary.get("runtimeEntities"), len(runtime)),
        "functionalDocuments": (summary.get("functionalDocuments"), len(manifest.get("documents", []))),
    }
    for name, (expected, actual) in equations.items():
        if expected != actual:
            errors.append(f"summary mismatch {name}: {expected} != {actual}")

    mapped = sum(bool(row.get("component")) for row in modules)
    if mapped + len(unmapped) != len(modules):
        errors.append(f"target equation failed: {mapped} + {len(unmapped)} != {len(modules)}")
    if summary.get("mappedTargets") != mapped:
        errors.append(f"mapped target mismatch: {summary.get('mappedTargets')} != {mapped}")

    component_target_sum = sum(int(row.get("static_target_count", 0)) for row in components)
    if component_target_sum != mapped:
        errors.append(f"component target sum mismatch: {component_target_sum} != {mapped}")
    subsystem_target_sum = sum(int(row.get("static_target_count", 0)) for row in subsystems)
    if subsystem_target_sum != len(modules):
        errors.append(f"subsystem target sum mismatch: {subsystem_target_sum} != {len(modules)}")

    init_count = sum(row.get("entity_type") == "init-service" for row in runtime)
    sa_count = sum(row.get("entity_type") == "system-ability" for row in runtime)
    if summary.get("initServiceEntries") != init_count:
        errors.append(f"init count mismatch: {summary.get('initServiceEntries')} != {init_count}")
    if summary.get("systemAbilityEntries") != sa_count:
        errors.append(f"SA count mismatch: {summary.get('systemAbilityEntries')} != {sa_count}")

    for component in components:
        doc_name = safe(component["component"])
        expected = kb / "subsystems" / safe(component["subsystem"]) / "components" / doc_name / f"{domain}-functional-overview.md"
        if not expected.exists():
            matches = list((kb / "subsystems" / safe(component["subsystem"]) / "components").glob(
                f"{doc_name}-*/{domain}-functional-overview.md"))
            if not matches:
                errors.append(f"missing component functional page: {component['subsystem']}:{component['component']}")
    for process in processes:
        expected = kb / "subsystems" / safe(process["host_subsystem"]) / "processes" / safe(process["process"]) / f"{domain}-runtime.md"
        if not expected.exists():
            errors.append(f"missing process page: {process['host_subsystem']}:{process['process']}")

    source_domain = kb / "source-domains" / domain
    if not (source_domain / "README.md").exists():
        errors.append("missing source-domain README")

    markdown_files = [Path(item) if Path(item).is_absolute() else workspace / item for item in manifest.get("documents", [])]
    markdown_files.append(source_domain / "README.md")
    checked_links = 0
    trailing_whitespace = 0
    link_re = re.compile(r"(?<!!)\[[^]]*]\(([^)]+)\)")
    for file_path in sorted(set(markdown_files)):
        if not file_path.exists() or file_path.suffix != ".md":
            continue
        content = file_path.read_text(encoding="utf-8")
        for number, line in enumerate(content.splitlines(), 1):
            if re.search(r"[ \t]+$", line):
                trailing_whitespace += 1
                errors.append(f"trailing whitespace: {file_path}:{number}")
        for match in link_re.finditer(content):
            target = match.group(1).strip()
            if not target or target.startswith("#") or re.match(r"^[a-z]+://", target, re.I):
                continue
            target = target.strip("<>").split("#", 1)[0]
            checked_links += 1
            if not (file_path.parent / target).resolve().exists():
                errors.append(f"broken link: {file_path} -> {target}")

    report = {
        "domain": args.domain_name,
        "errors": errors,
        "checks": {
            "repositories": len(repositories), "components": len(components),
            "modules": len(modules), "processes": len(processes), "runtimeEntities": len(runtime),
            "documents": len(manifest.get("documents", [])), "links": checked_links,
            "trailingWhitespace": trailing_whitespace,
        },
    }
    (index_dir / "verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = [
        f"# {args.domain_name} 知识库验证", "", "| 检查项 | 数量 |", "| --- | ---: |",
        f"| 仓库 | {len(repositories)} |", f"| 部件 | {len(components)} |",
        f"| 静态目标 | {len(modules)} |", f"| 进程 | {len(processes)} |",
        f"| 运行证据 | {len(runtime)} |", f"| 生成文档 | {len(manifest.get('documents', []))} |",
        f"| 检查链接 | {checked_links} |", f"| 错误 | {len(errors)} |", "",
        "## 结论", "", "验证通过。" if not errors else "验证失败，错误如下：", "",
    ]
    lines.extend(f"- {error}" for error in errors)
    (index_dir / "verification.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    if errors:
        raise SystemExit("\n".join(errors[:50]))
    print(json.dumps(report["checks"], ensure_ascii=False))


if __name__ == "__main__":
    main()
