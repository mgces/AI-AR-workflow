#!/usr/bin/env python3
"""Generate source-domain, subsystem, component, and process knowledge pages."""

from __future__ import annotations

import argparse
import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def read_tsv(path: Path) -> list[dict[str, str]]:
    lines = path.read_text(encoding="utf-8").rstrip("\n").splitlines()
    if not lines:
        return []
    header = lines[0].split("\t")
    return [dict(zip(header, line.split("\t"))) for line in lines[1:]]


def safe(value: str) -> str:
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9._-]+", "-", value.lower()))


def md(value: Any) -> str:
    return re.sub(r"[\t\r\n]+", " ", str(value or "")).replace("|", "\\|").strip()


def split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def source_link(workspace: Path, relative: str, document: Path) -> str:
    target = workspace / relative
    return os.path.relpath(target, document.parent).replace(os.sep, "/")


def doc_link(target: Path, document: Path) -> str:
    return os.path.relpath(target, document.parent).replace(os.sep, "/")


def weak_description(description: str, component: str) -> bool:
    value = description.strip().lower()
    return not value or value == component.lower() or len(value) < 32


def extract_readme_summary(component_dir: Path) -> tuple[str, Path | None]:
    candidates = [
        component_dir / "README_zh.md", component_dir / "README_ZH.md",
        component_dir / "README.md", component_dir / "README_en.md",
    ]
    for file_path in candidates:
        if not file_path.exists():
            continue
        text = file_path.read_text(encoding="utf-8", errors="replace")
        text = re.sub(r"```[\s\S]*?```", "\n", text)
        text = re.sub(r"<table[\s\S]*?</table>", "\n", text, flags=re.I)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"!\[[^]]*]\([^)]*\)", " ", text)
        text = re.sub(r"\[([^]]+)]\([^)]*\)", r"\1", text)
        paragraphs = []
        for block in re.split(r"\n\s*\n", text):
            block = re.sub(r"^#{1,6}\s+.*$", "", block, flags=re.M)
            block = re.sub(r"^[-*+]\s+", "", block, flags=re.M)
            block = re.sub(r"\s+", " ", block).strip()
            if 40 <= len(block) <= 1200 and not re.search(
                    r"when you're done|software architecture description|fork the repository|gitee feature", block, re.I):
                paragraphs.append(block)
        if paragraphs:
            return " ".join(paragraphs[:2])[:1200], file_path
    return "", None


AREA_DESCRIPTIONS = {
    "interfaces": "对外或系统内部接口定义，包括 Kit、Inner Kit、IDL 和多语言绑定。",
    "frameworks": "客户端框架、公共运行库和面向上层的能力封装。",
    "framework": "客户端框架、公共运行库和面向上层的能力封装。",
    "services": "服务端核心实现、状态管理、调度逻辑和 IPC Stub。",
    "service": "服务端核心实现、状态管理、调度逻辑和 IPC Stub。",
    "sa_profile": "System Ability 注册、宿主进程和装载策略。",
    "etc": "安装到系统的启动、权限、策略或运行配置。",
    "plugins": "由框架或服务动态选择、加载的插件实现。",
    "plugin": "由框架或服务动态选择、加载的插件实现。",
    "adapter": "平台、硬件、协议或系统形态适配。",
    "adapters": "平台、硬件、协议或系统形态适配。",
    "utils": "跨模块复用的工具和基础数据结构。",
    "common": "组件内部共享的公共定义和基础实现。",
    "tools": "开发、诊断或命令行辅助工具。",
    "core": "核心模型、状态机和关键执行逻辑。",
    "engine": "核心引擎、算法或数据处理管线。",
    "config": "编译期和运行期功能配置。",
    "resources": "运行资源、界面资源或随包资源。",
}


def describe_area(name: str) -> str:
    lower = name.lower()
    if lower in AREA_DESCRIPTIONS:
        return AREA_DESCRIPTIONS[lower]
    for key, description in AREA_DESCRIPTIONS.items():
        if key in lower:
            return description
    return "按源码命名划分的独立实现区域，边界以构建目标和公开接口为准。"


def source_areas(component_dir: Path, workspace: Path, modules: list[dict[str, str]]) -> list[dict[str, Any]]:
    ignored = {".git", ".gitee", ".github", "build", "test", "tests", "docs", "doc", "figures", "examples", "example", "benchmark"}
    result = []
    if not component_dir.exists():
        return result
    component_relative = component_dir.relative_to(workspace).as_posix()
    for entry in component_dir.iterdir():
        if not entry.is_dir() or entry.name.lower() in ignored:
            continue
        relative = f"{component_relative}/{entry.name}"
        count = sum(row["build_file"] == f"{relative}/BUILD.gn" or row["build_file"].startswith(relative + "/") for row in modules)
        children = [child.name for child in entry.iterdir() if child.is_dir() and not child.name.startswith(".")][:8]
        result.append({"name": entry.name, "relative": relative, "targets": count, "children": children})
    return sorted(result, key=lambda item: (-item["targets"], item["name"]))[:16]


def write(path: Path, content: str, manifest: list[str], workspace: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")
    manifest.append(path.relative_to(workspace).as_posix() if path.is_relative_to(workspace) else str(path))


def create_entry_readme(path: Path, title: str, links: list[tuple[str, str]]) -> None:
    if path.exists():
        return
    lines = [f"# {title}", ""]
    lines.extend(f"- [{label}]({target})" for label, target in links)
    lines += ["", "具体能力继续放入 `capabilities/<domain>/features/<feature>/`。", ""]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-root", required=True)
    parser.add_argument("--source-path", required=True)
    parser.add_argument("--domain-name", required=True)
    parser.add_argument("--index-dir", required=True)
    parser.add_argument("--knowledge-base", required=True)
    args = parser.parse_args()

    workspace = Path(args.workspace_root).resolve()
    source = Path(args.source_path)
    if not source.is_absolute():
        source = workspace / source
    source = source.resolve()
    index_dir = Path(args.index_dir).resolve()
    kb = Path(args.knowledge_base)
    if not kb.is_absolute():
        kb = workspace / kb
    kb = kb.resolve()
    domain = safe(args.domain_name)

    summary = json.loads((index_dir / "summary.json").read_text(encoding="utf-8"))
    components = read_tsv(index_dir / "components.tsv")
    modules = read_tsv(index_dir / "modules.tsv")
    processes = read_tsv(index_dir / "processes.tsv")
    runtime = read_tsv(index_dir / "runtime-entities.tsv")
    subsystems = read_tsv(index_dir / "subsystems.tsv")
    changes = json.loads((index_dir / "changes.json").read_text(encoding="utf-8"))
    manifest: list[str] = []

    duplicate_counts = Counter((item["subsystem"], item["component"]) for item in components)
    component_doc_names: dict[tuple[str, str, str], str] = {}
    for item in components:
        key = (item["subsystem"], item["component"], item["metadata_path"])
        component_doc_names[key] = safe(item["component"]) if duplicate_counts[(item["subsystem"], item["component"])] == 1 else \
            f"{safe(item['component'])}-{safe(item['repository_path'])}"

    process_docs: dict[tuple[str, str], Path] = {}
    for process in processes:
        host = safe(process["host_subsystem"])
        process_dir = kb / "subsystems" / host / "processes" / safe(process["process"])
        runtime_doc = process_dir / f"{domain}-runtime.md"
        process_docs[(process["host_subsystem"], process["process"])] = runtime_doc
        create_entry_readme(process_dir / "README.md", f"{process['process']} 进程", [
            (f"{args.domain_name} 运行时说明", runtime_doc.name),
        ])
        entities = [item for item in runtime if item["host_subsystem"] == process["host_subsystem"] and item["process"] == process["process"]]
        init_entries = [item for item in entities if item["entity_type"] == "init-service"]
        sa_entries = [item for item in entities if item["entity_type"] == "system-ability"]
        lines = [
            f"# {process['process']}：{args.domain_name} 运行时说明", "",
            f"> 由知识库 Skill 根据 `{args.domain_name}` 源码中的生产 init 配置、SA profile 和可执行目标生成。", "",
            "## 运行定位", "",
            f"`{process['process']}` 的宿主子系统为 `{process['host_subsystem']}`，识别到 "
            f"{process['init_service_count']} 条 init 配置、{process['system_ability_count']} 个 SA 和 "
            f"{process['participating_component_count']} 个参与部件。", "",
            "## 运行身份与启动", "",
        ]
        if init_entries:
            lines += ["| 可执行路径 | 启动模式 | uid | gid | SELinux | 证据 |", "| --- | --- | --- | --- | --- | --- |"]
            for item in init_entries:
                link = source_link(workspace, item["evidence_file"], runtime_doc)
                lines.append(f"| `{md(item['executable'] or '-')}` | {md(item['start_mode'] or '-')} | "
                             f"{md(item['uid'] or '-')} | {md(item['gid'] or '-')} | {md(item['selinux_domain'] or '-')} | "
                             f"[{md(item['evidence_file'])}]({link}) |")
        else:
            lines.append("当前源码域没有找到 init/service 强证据，宿主归属来自 SA 或可执行目标，需要真机确认启动者。")
        lines += ["", "## 承载的 System Ability", ""]
        if sa_entries:
            lines += ["| SA ID | 实现库 | run-on-create | 提供部件 | Profile |", "| ---: | --- | --- | --- | --- |"]
            for item in sa_entries:
                owner_key = (item["owner_subsystem"], item["owner_component"])
                owner_matches = [component for component in components if component["subsystem"] == owner_key[0] and component["component"] == owner_key[1]]
                owner_text = f"`{item['owner_subsystem']}:{item['owner_component']}`" if item["owner_component"] else "-"
                if owner_matches:
                    owner = owner_matches[0]
                    name = component_doc_names[(owner["subsystem"], owner["component"], owner["metadata_path"])]
                    owner_doc = kb / "subsystems" / safe(owner["subsystem"]) / "components" / name / f"{domain}-functional-overview.md"
                    owner_text = f"[{owner['subsystem']}:{owner['component']}]({doc_link(owner_doc, runtime_doc)})"
                link = source_link(workspace, item["evidence_file"], runtime_doc)
                lines.append(f"| {md(item['sa_id'])} | `{md(item['library'] or '-')}` | {md(item['run_on_create'] or '-')} | "
                             f"{owner_text} | [{md(item['evidence_file'])}]({link}) |")
        else:
            lines.append("没有识别到 SA profile；该进程可能是独立 daemon、渲染服务或其他非 SA 运行实体。")
        lines += ["", "## 部件与进程关系", "", "| 子系统 | 部件 | 角色 |", "| --- | --- | --- |"]
        relations = defaultdict(set)
        for item in entities:
            if item["owner_component"]:
                relations[(item["owner_subsystem"], item["owner_component"])].add(
                    "init-owner" if item["entity_type"] == "init-service" else "sa-provider")
        for (subsystem, component), roles in sorted(relations.items()):
            lines.append(f"| `{subsystem}` | `{component}` | {', '.join(sorted(roles))} |")
        lines += [
            "", "## 生命周期与验证", "",
            "- 根据 boot、ondemand、condition 或应用生命周期确认实际启动时机。",
            "- 校验 uid/gid、SELinux、权限、SA ID、实现库和宿主 profile 一致。",
            "- 验证首次调用、并发加载、死亡重启、资源释放和多能力共进程故障隔离。",
            "- 使用进程列表、SA 查询、hilog、hidumper 和 SELinux 上下文进行真机确认。",
            "", "## 扫描边界", "",
            "- 测试、示例、benchmark 和 CLI 不作为生产进程。",
            "- 条件编译可能产生多个配置变体，当前页面保留全部静态证据。",
        ]
        write(runtime_doc, "\n".join(lines), manifest, workspace)

    component_docs: dict[tuple[str, str, str], Path] = {}
    for component in components:
        doc_name = component_doc_names[(component["subsystem"], component["component"], component["metadata_path"])]
        component_dir = kb / "subsystems" / safe(component["subsystem"]) / "components" / doc_name
        functional_doc = component_dir / f"{domain}-functional-overview.md"
        index_doc = component_dir / f"{domain}-index.md"
        component_docs[(component["subsystem"], component["component"], component["metadata_path"])] = functional_doc
        create_entry_readme(component_dir / "README.md", f"{component['component']} 部件", [
            (f"{args.domain_name} 功能说明", functional_doc.name),
            (f"{args.domain_name} 模块索引", index_doc.name),
        ])
        component_modules = [item for item in modules if item["subsystem"] == component["subsystem"] and item["component"] == component["component"]]
        component_runtime = [item for item in runtime if item["owner_subsystem"] == component["subsystem"] and item["owner_component"] == component["component"]]
        source_component_dir = workspace / Path(component["metadata_path"]).parent
        readme_summary, readme_file = extract_readme_summary(source_component_dir)
        description = readme_summary if weak_description(component["description"], component["component"]) and readme_summary else component["description"] or readme_summary
        areas = source_areas(source_component_dir, workspace, component_modules)
        lines = [
            f"# {component['component']}：{args.domain_name} 功能说明", "",
            f"> 基于组件元数据、源码 README、公开接口、运行证据和静态构建目标生成。完整目标见 [{args.domain_name} 模块索引]({index_doc.name})。", "",
            "## 功能定位", "", md(description or f"{component['component']} 是 {component['subsystem']} 子系统的实现部件。"), "",
            "| 属性 | 值 |", "| --- | --- |",
            f"| 子系统 | `{component['subsystem']}` |",
            f"| 产品选入 | {component['product_selected']} |",
            f"| 适配系统 | {md(component['adapted_system_types'] or '-')} |",
            f"| ROM/RAM | {md(component['rom'] or '-')} / {md(component['ram'] or '-')} |",
            f"| 源码仓 | `{component['repository_path']}` |", "",
            "## 核心能力", "",
        ]
        syscaps = split_csv(component["syscaps"])
        features = split_csv(component["features"])
        if syscaps:
            lines.extend(f"- `{item}`" for item in syscaps)
        else:
            lines.append("- 元数据未声明 SystemCapability，需结合接口和服务实现确定能力边界。")
        lines += ["", "## 产品功能开关", ""]
        lines.extend(f"- `{item}`" for item in features) if features else lines.append("- 未声明独立产品 feature。")
        lines += ["", "## 进程归属", ""]
        groups = defaultdict(list)
        for item in component_runtime:
            groups[(item["host_subsystem"], item["process"])].append(item)
        if groups:
            lines += ["| 宿主子系统 | 进程 | 角色 | SA | 实现库 |", "| --- | --- | --- | --- | --- |"]
            for (host, process), entities in sorted(groups.items()):
                process_doc = process_docs.get((host, process))
                process_text = f"[{process}]({doc_link(process_doc, functional_doc)})" if process_doc else f"`{process}`"
                roles = sorted({"启动配置" if item["entity_type"] == "init-service" else "SA 实现" for item in entities})
                sa_ids = sorted({item["sa_id"] for item in entities if item["sa_id"]})
                libraries = sorted({item["library"] for item in entities if item["library"]})
                lines.append(f"| `{host}` | {process_text} | {', '.join(roles)} | {', '.join(f'`{x}`' for x in sa_ids) or '-'} | "
                             f"{', '.join(f'`{x}`' for x in libraries) or '-'} |")
        else:
            lines.append("当前没有生产 init 或 SA profile 证据；该部件通常以库、接口、资源、插件或工具形式被其他部件使用。")
        lines += ["", "## 源码职责区", ""]
        if areas:
            lines += ["| 目录 | 职责 | 静态目标 | 主要子目录 |", "| --- | --- | ---: | --- |"]
            for area in areas:
                link = source_link(workspace, area["relative"], functional_doc)
                children = ", ".join(f"`{child}`" for child in area["children"]) or "-"
                lines.append(f"| [{area['relative']}]({link}) | {describe_area(area['name'])} | {area['targets']} | {children} |")
        else:
            lines.append("未形成可独立列出的一级源码职责目录。")
        lines += ["", "## 接口、依赖与测试", "",
                  f"- Inner Kit：{md(component['inner_kit_targets'] or '未声明')}。",
                  f"- 组件依赖：{md(component['component_dependencies'] or '无声明')}。",
                  f"- 三方依赖：{md(component['third_party_dependencies'] or '无声明')}。",
                  f"- 测试入口：{md(component['test_entries'] or '未声明')}。",
                  f"- 静态目标：生产 {component['production_target_count']}，测试 {component['test_target_count']}，总计 {component['static_target_count']}。",
                  "", "## 继续深入", "",
                  f"- 组件元数据：[{component['metadata_path']}]({source_link(workspace, component['metadata_path'], functional_doc)})",
                  f"- 原始 README：{f'[{readme_file.relative_to(workspace).as_posix()}]({source_link(workspace, readme_file.relative_to(workspace).as_posix(), functional_doc)})' if readme_file else '未找到'}",
                  "- 对高风险能力继续补充实际调用链、状态机、安全边界和真机证据。"]
        write(functional_doc, "\n".join(lines), manifest, workspace)

        index_lines = [
            f"# {component['component']}：{args.domain_name} 完整模块索引", "",
            "> 本文件由知识库 Skill 生成，不承担功能解释。", "",
            f"[功能说明]({functional_doc.name})", "",
            "| 分类 | 类型 | Label | 构建文件 | 行 |", "| --- | --- | --- | --- | ---: |",
        ]
        for item in component_modules:
            link = source_link(workspace, item["build_file"], index_doc)
            index_lines.append(f"| {item['category']} | `{item['target_type']}` | `{md(item['target_label'])}` | "
                               f"[{item['build_file']}]({link}) | {item['line']} |")
        index_lines += ["", "动态模板、循环或变量生成的目标仍需直接阅读构建文件。"]
        write(index_doc, "\n".join(index_lines), manifest, workspace)

    subsystem_map = {item["subsystem"]: item for item in subsystems}
    for subsystem, aggregate in subsystem_map.items():
        subsystem_dir = kb / "subsystems" / safe(subsystem)
        functional_doc = subsystem_dir / f"{domain}-functional-overview.md"
        process_doc = subsystem_dir / f"{domain}-processes.md"
        index_doc = subsystem_dir / f"{domain}-index.md"
        create_entry_readme(subsystem_dir / "README.md", f"{subsystem} 子系统", [
            (f"{args.domain_name} 功能全景", functional_doc.name),
            (f"{args.domain_name} 运行进程", process_doc.name),
            (f"{args.domain_name} 模块索引", index_doc.name),
        ])
        items = [item for item in components if item["subsystem"] == subsystem]
        lines = [
            f"# {subsystem}：{args.domain_name} 功能全景", "",
            f"该源码域在本子系统包含 {aggregate['component_count']} 个部件、{aggregate['process_count']} 个宿主进程和 "
            f"{aggregate['static_target_count']} 个静态目标。", "",
            "## 部件功能分工", "", "| 部件 | 功能定位 | 产品 | 进程证据 | 说明 |", "| --- | --- | --- | ---: | --- |",
        ]
        for item in sorted(items, key=lambda row: row["component"]):
            name = component_doc_names[(item["subsystem"], item["component"], item["metadata_path"])]
            target = component_docs[(item["subsystem"], item["component"], item["metadata_path"])]
            lines.append(f"| `{item['component']}` | {md(item['description'] or '-')} | {item['product_selected']} | "
                         f"{item['runtime_entity_count']} | [查看]({doc_link(target, functional_doc)}) |")
        lines += ["", "## 运行进程与跨部件宿主", ""]
        involved = defaultdict(list)
        for entity in runtime:
            if entity["owner_subsystem"] == subsystem:
                involved[(entity["host_subsystem"], entity["process"])].append(entity)
        if involved:
            lines += ["| 宿主子系统 | 进程 | 参与部件 | SA | 说明 |", "| --- | --- | --- | ---: | --- |"]
            for (host, process), entities in sorted(involved.items()):
                target = process_docs.get((host, process))
                process_text = f"[{process}]({doc_link(target, functional_doc)})" if target else f"`{process}`"
                owners = sorted({item["owner_component"] for item in entities if item["owner_component"]})
                sa_count = len({item["sa_id"] for item in entities if item["sa_id"]})
                lines.append(f"| `{host}` | {process_text} | {', '.join(f'`{x}`' for x in owners) or '-'} | {sa_count} | "
                             f"{f'[查看]({doc_link(target, functional_doc)})' if target else '-'} |")
        else:
            lines.append("该子系统在当前源码域没有生产进程证据。")
        write(functional_doc, "\n".join(lines), manifest, workspace)

        host_processes = [item for item in processes if item["host_subsystem"] == subsystem]
        process_lines = [f"# {subsystem}：{args.domain_name} 运行进程", "", "| 进程 | init | SA | 部件 | 启动模式 | uid | SELinux | 说明 |", "| --- | ---: | ---: | ---: | --- | --- | --- | --- |"]
        for item in host_processes:
            target = process_docs[(item["host_subsystem"], item["process"])]
            process_lines.append(f"| `{item['process']}` | {item['init_service_count']} | {item['system_ability_count']} | "
                                 f"{item['participating_component_count']} | {md(item['start_modes'] or '-')} | {md(item['uids'] or '-')} | "
                                 f"{md(item['selinux_domains'] or '-')} | [查看]({doc_link(target, process_doc)}) |")
        if not host_processes:
            process_lines += ["", "本子系统没有宿主进程；相关部件可能被其他子系统进程装载，见功能全景。"]
        write(process_doc, "\n".join(process_lines), manifest, workspace)

        subsystem_modules = [item for item in modules if item["subsystem"] == subsystem]
        index_lines = [f"# {subsystem}：{args.domain_name} 模块索引", "", "| 部件 | 生产 | 测试 | 总目标 | 说明 |", "| --- | ---: | ---: | ---: | --- |"]
        for item in sorted(items, key=lambda row: row["component"]):
            name = component_doc_names[(item["subsystem"], item["component"], item["metadata_path"])]
            target = kb / "subsystems" / safe(subsystem) / "components" / name / f"{domain}-index.md"
            index_lines.append(f"| `{item['component']}` | {item['production_target_count']} | {item['test_target_count']} | "
                               f"{item['static_target_count']} | [查看]({doc_link(target, index_doc)}) |")
        mapped = sum(bool(item["component"]) for item in subsystem_modules)
        index_lines += ["", f"子系统静态目标 {len(subsystem_modules)} 个，其中已映射部件 {mapped} 个。"]
        write(index_doc, "\n".join(index_lines), manifest, workspace)

    source_doc = kb / "source-domains" / domain / "README.md"
    source_lines = [
        f"# {args.domain_name} 源码域", "",
        f"`{summary['sourcePath']}` 是物理源码扫描边界，不自动视为子系统。", "",
        "## 覆盖范围", "", "| 指标 | 数量 |", "| --- | ---: |",
        f"| Git 子仓 | {summary['repositories']} |", f"| 部件 | {summary['components']} |",
        f"| 子系统 | {summary['subsystems']} |", f"| BUILD.gn | {summary['buildFiles']} |",
        f"| 静态目标 | {summary['staticTargets']} |", f"| 运行进程 | {summary['processes']} |",
        f"| init 服务 | {summary['initServiceEntries']} |", f"| System Ability | {summary['systemAbilityEntries']} |",
        f"| 未映射目标 | {summary['unmappedTargets']} |", "",
        "## 子系统入口", "", "| 子系统 | 部件 | 进程 | 目标 | 导航 |", "| --- | ---: | ---: | ---: | --- |",
    ]
    for item in subsystems:
        subsystem_dir = kb / "subsystems" / safe(item["subsystem"])
        functional = subsystem_dir / f"{domain}-functional-overview.md"
        process = subsystem_dir / f"{domain}-processes.md"
        index = subsystem_dir / f"{domain}-index.md"
        source_lines.append(f"| `{item['subsystem']}` | {item['component_count']} | {item['process_count']} | {item['static_target_count']} | "
                            f"[功能]({doc_link(functional, source_doc)}) / [进程]({doc_link(process, source_doc)}) / [模块]({doc_link(index, source_doc)}) |")
    source_lines += ["", "## 本次变化", ""]
    for name in ["repositories", "components", "modules", "processes", "runtime-entities"]:
        change = changes.get(name, {})
        source_lines.append(f"- `{name}`：新增 {change.get('addedCount', 0)}，删除 {change.get('removedCount', 0)}，变化 {change.get('changedCount', 0)}。")
    source_lines += ["", "## 机器索引", ""]
    for name in ["repositories.tsv", "components.tsv", "modules.tsv", "processes.tsv", "runtime-entities.tsv", "subsystems.tsv", "unmapped-modules.tsv", "summary.json", "changes.json"]:
        source_lines.append(f"- [{name}]({doc_link(index_dir / name, source_doc)})")
    write(source_doc, "\n".join(source_lines), manifest, workspace)

    generated_manifest = {"domain": args.domain_name, "sourcePath": summary["sourcePath"], "documents": sorted(manifest)}
    (index_dir / "generated-documents.json").write_text(json.dumps(generated_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary["functionalDocuments"] = len(manifest)
    (index_dir / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"documents": len(manifest), "sourceDomain": str(source_doc)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
