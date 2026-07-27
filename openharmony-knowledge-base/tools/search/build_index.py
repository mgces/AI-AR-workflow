#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
build_index.py — 构建/增量更新知识库 BM25 倒排索引。

首次全量;之后**增量**:按整文件 sha 比对 manifest,只重切/重嵌变更或新增的文件,
未变文件复用旧 postings,删除的文件丢弃其单元。这样"补/改任何 KB md 后重跑本脚本"
即只处理变更文件 —— 满足"不断补充检索库"的诉求。

索引落 <kb-root>/generated/search-index/(postings.json / docs.json / manifest.json),
该目录已 gitignore,不入库,换机重跑本脚本重建即可。

用法:
    python3 build_index.py                 # 增量(缺索引则自动全量)
    python3 build_index.py --rebuild       # 丢弃缓存,全量重建
    python3 build_index.py --kb-root <dir> # 指定知识库根
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bm25_lib as B  # noqa: E402


def build(kb_root, rebuild=False, quiet=False):
    """(增量)构建索引,返回 (n_docs, n_files, reparsed)。"""
    kb_root = os.path.abspath(kb_root)
    if not os.path.isdir(kb_root):
        raise SystemExit("ERROR: kb-root 不存在: %s" % kb_root)

    old_idx, old_manifest = (None, None) if rebuild else B.load_index(kb_root)
    if old_idx is None:
        idx = B.Bm25Index()
        old_files = {}
    else:
        idx = old_idx
        old_files = (old_manifest or {}).get("files", {})

    current = B.iter_md_files(kb_root)
    current_set = set(current)
    new_files = {}
    reparsed = 0

    # 1. 删除:旧 manifest 有、当前已不存在的文件 -> 移除其单元
    for path, meta in old_files.items():
        if path not in current_set:
            for doc_id in meta.get("doc_ids", []):
                idx.remove_doc(doc_id)

    # 2. 逐当前文件:未变复用,变更/新增重切
    for path in current:
        sha = B.file_sha(kb_root, path)
        prev = old_files.get(path)
        if prev and prev.get("sha") == sha and not rebuild:
            # 复用:旧单元仍在 idx 中,manifest 原样保留
            new_files[path] = prev
            continue
        # 变更/新增:先移除该文件旧单元(若有),再重切入库
        if prev:
            for doc_id in prev.get("doc_ids", []):
                idx.remove_doc(doc_id)
        doc_ids = []
        for i, unit in enumerate(B.iter_file_units(kb_root, path)):
            doc_id = "%s#%d" % (path, i)
            idx.add_doc(doc_id, unit)
            doc_ids.append(doc_id)
        new_files[path] = {"sha": sha, "doc_ids": doc_ids}
        reparsed += 1

    manifest = {
        "files": new_files,
        "n_docs": len(idx.docs),
        "n_files": len(new_files),
        "built_note": "BM25 lexical index; regenerate with build_index.py (gitignored).",
    }
    B.save_index(kb_root, idx, manifest)
    if not quiet:
        reused = len(new_files) - reparsed
        print("indexed %d docs from %d files (reparsed %d files, reused %d)"
              % (len(idx.docs), len(new_files), reparsed, reused))
    return len(idx.docs), len(new_files), reparsed


def main():
    ap = argparse.ArgumentParser(description="构建/增量更新知识库 BM25 检索索引")
    ap.add_argument("--kb-root", default="openharmony-knowledge-base",
                    help="知识库根目录(默认 openharmony-knowledge-base)")
    ap.add_argument("--rebuild", action="store_true", help="丢弃缓存,全量重建")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    build(args.kb_root, rebuild=args.rebuild, quiet=args.quiet)


if __name__ == "__main__":
    main()
