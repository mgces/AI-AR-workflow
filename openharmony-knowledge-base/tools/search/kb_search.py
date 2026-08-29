#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
kb_search.py — P1 设计阶段的稳定导航检索入口(BM25,advisory)。

给一段查询文本，对稳定导航层做 BM25 检索，并把候选子系统/组件/进程节点与
当前 OHOS 源码仓候选写入 markdown。知识库不提供代码事实；文件、接口、GN target、
产品配置和运行行为必须在 --source-root 指向的当前源码中重新验证。

**这是 P1 的 advisory 输入,不是门控输入**:gate_design.py 不校验它。任何失败都不应卡住
P1 —— 索引缺失/陈旧会自动(增量)重建;仍失败则写占位文件并以退出码 0 返回。

用法:
    python3 kb_search.py --query-file "$PDIR/ar.md" --k 8 --out "$PDIR/design_refs.md"
    python3 kb_search.py --query "hiview 崩溃日志采集" --k 6
"""
import argparse
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bm25_lib as B  # noqa: E402
import build_index  # noqa: E402

_HEADER = """> **仅作导航，不是代码事实。** 本文由稳定知识层 BM25 检索生成，不进门控。\n>
> 文件路径、接口、GN target、依赖、产品配置和运行行为必须在当前源码仓重新验证。\n"""


def _is_stale(kb_root, manifest):
    """当前 md 文件集合/内容与 manifest 不一致则判为陈旧(需增量重建)。"""
    if not manifest:
        return True
    if manifest.get("index_policy") != B.INDEX_POLICY:
        return True
    files = manifest.get("files", {})
    current = B.iter_md_files(kb_root)
    if set(current) != set(files):
        return True
    for path in current:
        if B.file_sha(kb_root, path) != files[path].get("sha"):
            return True
    return False


def _ensure_index(kb_root):
    """确保索引存在且不陈旧;返回 (idx, note)。永不抛出。"""
    idx, manifest = B.load_index(kb_root)
    if idx is None:
        build_index.build(kb_root, rebuild=False, quiet=True)
        idx, manifest = B.load_index(kb_root)
        return idx, "index built"
    if _is_stale(kb_root, manifest):
        build_index.build(kb_root, rebuild=False, quiet=True)
        idx, manifest = B.load_index(kb_root)
        return idx, "index refreshed (incremental)"
    return idx, "index up-to-date"


def _repo_paths(source_root):
    """读取 repo 工作区当前项目路径；单仓工作区退化为根目录。"""
    if not source_root or not os.path.isdir(source_root):
        return []
    project_list = os.path.join(source_root, ".repo", "project.list")
    paths = []
    try:
        with open(project_list, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                rel = line.strip().strip("/")
                if rel and os.path.isdir(os.path.join(source_root, rel)):
                    paths.append(rel.replace(os.sep, "/"))
    except OSError:
        pass
    if not paths and (os.path.isdir(os.path.join(source_root, ".git"))
                      or os.path.isfile(os.path.join(source_root, ".git"))):
        paths.append(".")
    return sorted(set(paths))


def _path_terms(kb_path):
    skip = {"subsystems", "components", "processes", "capabilities", "features",
            "common-modules", "readme.md"}
    return [p.lower() for p in kb_path.replace("_", "-").split("/")
            if p.lower() not in skip and len(p) > 1]


def _short_head(repo_path):
    try:
        cp = subprocess.run(
            ["git", "-C", repo_path, "rev-parse", "--short=12", "HEAD"],
            check=False, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            text=True, timeout=3,
        )
        return cp.stdout.strip() if cp.returncode == 0 else "unknown"
    except (OSError, subprocess.SubprocessError):
        return "unknown"


def _source_candidates(source_root, repo_paths, kb_path, limit=3):
    terms = _path_terms(kb_path)
    scored = []
    for rel in repo_paths:
        low = rel.lower().replace("_", "-")
        segments = low.split("/")
        score = 0
        for i, term in enumerate(terms):
            if term in segments:
                score += 8 if i == len(terms) - 1 else 4
            elif term in low:
                score += 2
        if score:
            scored.append((score, rel))
    scored.sort(key=lambda item: (-item[0], item[1]))
    out = []
    for _score, rel in scored[:limit]:
        abs_repo = source_root if rel == "." else os.path.join(source_root, rel)
        out.append((rel, _short_head(abs_repo)))
    return out


def _render(hits, idx, kb_root, max_chars, k, source_root=None):
    """把 [(doc_id, score)] 按文件路径聚合去重,取前 k 个文档,渲染成 markdown。"""
    lines = [_HEADER]
    source_root = os.path.abspath(source_root) if source_root else None
    repo_paths = _repo_paths(source_root)
    if source_root and repo_paths:
        lines.append("> 当前源码根：`%s`（候选仓 HEAD 在下方逐项给出）。" % source_root)
    else:
        lines.append('> 未解析到当前源码仓；请传 `--source-root "$OHOS_ROOT"` 后再用于设计。')
    lines.append("")
    seen_paths = set()
    n = 0
    for doc_id, score in hits:
        if n >= k:
            break
        meta = idx.docs.get(doc_id)
        if not meta:
            continue
        path = meta["path"]
        if path in seen_paths:  # 同文档只取最高分单元
            continue
        seen_paths.add(path)
        n += 1
        rel = "%s/%s" % (os.path.basename(kb_root.rstrip("/")), path)
        lines.append("#### %d. `%s`  (navigation score=%.2f)" % (n, path, score))
        lines.append("- 知识级别：`stable-navigation`")
        if meta.get("heading"):
            lines.append("- 章节:%s" % meta["heading"])
        lines.append("- 路径:`%s`" % rel)
        candidates = _source_candidates(source_root, repo_paths, path) if repo_paths else []
        if candidates:
            lines.append("- 当前源码仓候选：")
            for rel_repo, head in candidates:
                lines.append("  - `%s` @ `%s`" % (rel_repo, head))
        else:
            lines.append("- 当前源码仓候选：未自动命中；在源码根执行 `repo list` 后按节点名定位。")
        lines.append("- 必须复核：当前仓的 `bundle.json` / `BUILD.gn` / 接口头文件 / 测试与运行配置。")
        preview = meta.get("preview", "")
        if preview:
            lines.append("")
            lines.append("> 导航摘要（可能滞后，不得直接写入代码契约）：%s" % preview)
        lines.append("")
    body = "\n".join(lines).rstrip() + "\n"
    if len(body) > max_chars:
        body = body[:max_chars].rstrip() + "\n\n> (已按 --max-chars 截断)\n"
    if n == 0:
        body = _HEADER + "\n> 未检索到稳定导航节点；直接从当前源码仓定位。\n"
    return body


def _write_out(out_path, text):
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)


def _placeholder(reason):
    return _HEADER + "\n> 导航检索已跳过:%s。请直接在当前源码仓定位。\n" % reason


def main():
    ap = argparse.ArgumentParser(description="知识库 BM25 检索(P1 advisory 输入)")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--query-file", help="查询文本文件(通常 $PDIR/ar.md)")
    src.add_argument("--query", help="直接给查询文本")
    ap.add_argument("--kb-root", default="openharmony-knowledge-base",
                    help="知识库根目录(默认 openharmony-knowledge-base)")
    ap.add_argument("--source-root", default=os.environ.get("OHOS_ROOT"),
                    help="当前 OHOS 源码根(默认 $OHOS_ROOT);用于解析真实仓候选")
    ap.add_argument("--k", type=int, default=8, help="返回文档数(默认 8)")
    ap.add_argument("--out", help="输出 markdown 路径(默认打印到 stdout)")
    ap.add_argument("--max-chars", type=int, default=6000, help="输出上限,防止注入过长")
    args = ap.parse_args()

    kb_root = os.path.abspath(args.kb_root)

    # --- 取查询文本(失败即降级,不中断 P1) ---
    if args.query is not None:
        query = args.query
    else:
        try:
            with open(args.query_file, "r", encoding="utf-8", errors="replace") as f:
                query = f.read()
        except OSError as e:
            sys.stderr.write("kb_search: 读查询文件失败(%s),跳过检索\n" % e)
            _write_out(args.out, _placeholder("读查询文件失败"))
            return 0

    # --- 确保索引 + 检索(任何异常都降级为占位,退出码 0) ---
    try:
        if not os.path.isdir(kb_root):
            raise RuntimeError("kb-root 不存在: %s" % kb_root)
        idx, note = _ensure_index(kb_root)
        if idx is None:
            raise RuntimeError("索引构建失败")
        hits = idx.score(B.tokenize(query), k=max(args.k * 3, args.k))
        text = _render(hits, idx, kb_root, args.max_chars, args.k,
                       source_root=args.source_root)
        sys.stderr.write("kb_search: %s, %d docs indexed\n" % (note, len(idx.docs)))
    except Exception as e:  # noqa: BLE001 — advisory 路径,绝不因检索失败卡住 P1
        sys.stderr.write("kb_search: 检索失败(%s),跳过\n" % e)
        _write_out(args.out, _placeholder(str(e)))
        return 0

    if args.out:
        _write_out(args.out, text)
        sys.stderr.write("kb_search: 已写 %s\n" % args.out)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
