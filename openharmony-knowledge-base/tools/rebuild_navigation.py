#!/usr/bin/env python3
"""Normalize subsystem README files into stable navigation-only nodes.

The generated pages intentionally contain no current code facts. They preserve
the ownership hierarchy and direct readers to the active OpenHarmony checkout
for repository, file, API, build, test, product, and runtime verification.
"""
import argparse
import os
import re
import shlex


NODE_MARKERS = {
    "components": "component",
    "processes": "process",
    "capabilities": "capability",
    "features": "feature",
    "common-modules": "kernel-module",
}


def _label(name):
    return name.replace("_", " ").replace("-", " ")


def _node_meta(rel_path):
    parts = rel_path.replace(os.sep, "/").split("/")[:-1]
    if not parts:
        return "subsystem-index", "subsystems", []
    kind = "subsystem"
    name = parts[-1]
    for marker, marker_kind in NODE_MARKERS.items():
        if marker in parts:
            idx = len(parts) - 1 - parts[::-1].index(marker)
            if idx + 1 < len(parts):
                kind = marker_kind
                name = parts[idx + 1]
    terms = [p for p in parts if p not in NODE_MARKERS]
    return kind, name, terms


def _parent_link(readme, root):
    current = os.path.dirname(readme)
    parent = os.path.dirname(current)
    while parent.startswith(root) and parent != current:
        candidate = os.path.join(parent, "README.md")
        if os.path.isfile(candidate):
            return os.path.relpath(candidate, current).replace(os.sep, "/")
        current, parent = parent, os.path.dirname(parent)
    return None


def _children(readme):
    current = os.path.dirname(readme)
    out = []
    try:
        names = sorted(os.listdir(current))
    except OSError:
        return out
    for name in names:
        candidate = os.path.join(current, name, "README.md")
        if os.path.isfile(candidate):
            out.append((name, (name + "/README.md").replace(os.sep, "/")))
    return out


def render(readme, subsystem_root):
    rel = os.path.relpath(readme, subsystem_root)
    kind, name, terms = _node_meta(rel)
    title = "OpenHarmony 子系统导航" if kind == "subsystem-index" \
        else "%s 导航" % _label(name)
    lines = [
        "# %s" % title,
        "",
        "> 本页属于 `stable-navigation`：只记录层级、名称和源码定位入口。",
        "> 它不声明当前文件、接口、GN target、依赖、产品选入或运行行为；这些事实必须",
        "> 在当前 `$OHOS_ROOT` 对应代码仓中验证。",
        "",
        "## 导航身份",
        "",
        "- 类型：`%s`" % kind,
        "- 节点：`%s`" % name,
    ]
    if terms:
        lines.append("- 层级：`%s`" % " -> ".join(terms))
    parent = _parent_link(readme, subsystem_root)
    if parent:
        lines.append("- 上级：[返回上级](%s)" % parent)
    lines.extend([
        "",
        "## 当前源码定位（必须执行）",
        "",
        "知识库只给出候选关键词。以当前源码仓输出为准：",
        "",
        "```bash",
        "test -d \"$OHOS_ROOT/.repo\"",
    ])
    query = "|".join(re.escape(term).replace(r"\-", "[-_]")
                     for term in (terms[-3:] or [name]))
    node_query = re.escape(name).replace(r"\-", "[-_]")
    lines.append("repo list | rg -i %s" % shlex.quote(query))
    lines.append("rg -n %s \"$OHOS_ROOT\" -g 'bundle.json' -g 'BUILD.gn' -g '*.gni'" %
                 shlex.quote(node_query))
    lines.extend([
        "```",
        "",
        "定位候选仓后，必须读取其当前 `bundle.json`、`BUILD.gn`、接口、测试和运行配置，",
        "并记录仓路径与 `git rev-parse HEAD`；不得把本页内容直接写入代码契约。",
    ])
    children = _children(readme)
    if children:
        lines.extend(["", "## 下级导航", ""])
        for child_name, link in children:
            lines.append("- [%s](%s)" % (_label(child_name), link))
    lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description="重建稳定导航层 README")
    ap.add_argument("--kb-root", default="openharmony-knowledge-base")
    ap.add_argument("--check", action="store_true",
                    help="只检查是否已规范化，不写文件")
    args = ap.parse_args()
    subsystem_root = os.path.abspath(os.path.join(args.kb_root, "subsystems"))
    readmes = []
    for dirpath, _dirnames, filenames in os.walk(subsystem_root):
        if "README.md" in filenames:
            readmes.append(os.path.join(dirpath, "README.md"))
    changed = []
    for readme in sorted(readmes):
        expected = render(readme, subsystem_root)
        with open(readme, "r", encoding="utf-8", errors="replace") as f:
            current = f.read()
        if current != expected:
            changed.append(os.path.relpath(readme, args.kb_root))
            if not args.check:
                with open(readme, "w", encoding="utf-8") as f:
                    f.write(expected)
    if args.check and changed:
        for path in changed:
            print("STALE %s" % path)
        raise SystemExit(1)
    print("navigation readmes: %d, changed: %d" % (len(readmes), len(changed)))


if __name__ == "__main__":
    main()
