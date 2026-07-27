#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
bm25_lib.py — 知识库的**纯词法(BM25)**检索核心,零第三方依赖(只用标准库)。

为什么是词法而不是向量:向量化会把库锁定到单一外部 embedding 模型 + key,查询必须与
索引同模型,换模型要全量重嵌,断网即失效。BM25 完全离线、确定性、不锁任何模型,契合本仓
"检索只是 P1 的 advisory 输入、门控只认确定性证据"的定位。

中文免分词方案:知识库大量为中文 md 且环境无 jieba。ASCII/标识符按整词入库
(hiview / libfoo.z.so / FooTest.HandleTimeout / 路径),中文连续块发**相邻 bigram**
(单字块发 unigram)。查询用同一 tokenize,对"按子系统/feature 找技术文档"足够能打。

被 build_index.py(建索引)与 kb_search.py(查询)共同引用。
"""
import hashlib
import json
import math
import os
import re
from collections import defaultdict

# ---- 索引产物文件名(落在 <kb-root>/generated/search-index/,已 gitignore) ----
POSTINGS_FILE = "postings.json"
DOCS_FILE = "docs.json"
MANIFEST_FILE = "manifest.json"

# ---- BM25 超参(经典缺省值) ----
BM25_K1 = 1.5
BM25_B = 0.75

_ASCII_TOKEN = re.compile(r"[a-z0-9_][a-z0-9_./]*")
_CJK_RUN = re.compile(r"[一-鿿]+")
_HEADING = re.compile(r"^\s*(#{1,6})\s+\S")
_WS = re.compile(r"\s+")

# 单文档单元(超长 body)的硬切阈值,防止 1MB+ 的 foundation-index.md 变成一个巨块。
MAX_UNIT_CHARS = 1500


def tokenize(text):
    """把文本切成检索 term 列表(可含重复,tf 由调用方统计)。

    - 归一化小写。
    - ASCII/标识符整词:[a-z0-9_][a-z0-9_./]* —— 抓 hiview、libfoo.z.so、路径、Suite.Case;
      对含 . / _ 的整词再额外拆子词(footest、handletimeout)一并入库,提升召回。
    - 中文:连续 [一-鿿] 块发相邻 bigram(单字块发 unigram)。
    """
    if not text:
        return []
    low = text.lower()
    toks = []
    for m in _ASCII_TOKEN.finditer(low):
        w = m.group(0)
        toks.append(w)
        if any(c in w for c in "./_"):
            for sub in re.split(r"[./_]+", w):
                if len(sub) >= 2 and sub != w:
                    toks.append(sub)
    for m in _CJK_RUN.finditer(low):
        run = m.group(0)
        if len(run) == 1:
            toks.append(run)
        else:
            for i in range(len(run) - 1):
                toks.append(run[i:i + 2])
    return toks


def sha_text(text):
    return hashlib.sha256(text.encode("utf-8", "replace")).hexdigest()


def _split_md_sections(text):
    """(heading_line, body_text) per markdown heading; body 跨到下一个同级/更高级标题
    (与 archive_product.py 同款思路,此处自带实现以保持工具自包含)。"""
    lines = text.splitlines()
    heads = [(i, len(m.group(1)), ln) for i, ln in enumerate(lines)
             for m in [_HEADING.match(ln)] if m]
    if not heads:
        return [("", text)]
    out = []
    # 首个标题前的前言(若有非空内容)也作为一个单元,避免丢失文件开头。
    if heads[0][0] > 0:
        pre = "\n".join(lines[:heads[0][0]]).strip()
        if pre:
            out.append(("", pre))
    for hi, (idx, level, line) in enumerate(heads):
        end = len(lines)
        for j in range(hi + 1, len(heads)):
            if heads[j][1] <= level:
                end = heads[j][0]
                break
        body = "\n".join(lines[idx:end])
        out.append((line.strip(), body))
    return out


def _hard_split(text, limit=MAX_UNIT_CHARS):
    """把超长单元按 limit 字符硬切成多段(尽量在换行处断)。"""
    if len(text) <= limit:
        return [text]
    out, buf = [], []
    size = 0
    for line in text.splitlines(keepends=True):
        if size + len(line) > limit and buf:
            out.append("".join(buf))
            buf, size = [], 0
        buf.append(line)
        size += len(line)
        # 单行本身就超长(极少见)时也强制断开
        while size > limit:
            chunk = "".join(buf)
            out.append(chunk[:limit])
            rest = chunk[limit:]
            buf, size = ([rest], len(rest)) if rest else ([], 0)
    if buf:
        out.append("".join(buf))
    return out


def _preview(text, n=240):
    """取一段紧凑预览(压掉多余空白),供检索摘要展示。"""
    s = _WS.sub(" ", text).strip()
    return s[:n]


def iter_file_units(kb_root, rel_path):
    """把单个 md 文件切成若干检索单元。yield dict(path, heading, text, sha, preview)。

    heading 记标题文本;text 含标题行本身(利于命中标题词);超长按 MAX_UNIT_CHARS 硬切。
    """
    abs_path = os.path.join(kb_root, rel_path)
    try:
        with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
            raw = f.read()
    except OSError:
        return
    for heading, body in _split_md_sections(raw):
        body = body.strip()
        if not body:
            continue
        for piece in _hard_split(body):
            piece = piece.strip()
            if not piece:
                continue
            yield {
                "path": rel_path,
                "heading": heading,
                "text": piece,
                "sha": sha_text(piece),
                "preview": _preview(piece),
            }


def iter_md_files(kb_root):
    """相对 kb_root 的所有 *.md 路径(跳过 generated/ 派生产物),排序稳定。"""
    out = []
    for dirpath, dirnames, filenames in os.walk(kb_root):
        # 不索引派生产物目录(含检索索引自身、生成的 index 文档)
        rel_dir = os.path.relpath(dirpath, kb_root)
        top = rel_dir.split(os.sep, 1)[0]
        if top == "generated":
            dirnames[:] = []
            continue
        for fn in filenames:
            if fn.endswith(".md"):
                rel = os.path.relpath(os.path.join(dirpath, fn), kb_root)
                out.append(rel.replace(os.sep, "/"))
    out.sort()
    return out


# ----------------------------------------------------------------------------
# BM25 索引:倒排 postings + 文档元数据 + df/avgdl。纯 dict,JSON 可序列化。
# doc_id 是稳定字符串 "<path>#<unit-index>";postings 存 {term: {doc_id: tf}}。
# ----------------------------------------------------------------------------
class Bm25Index:
    def __init__(self):
        # term -> {doc_id: tf}
        self.postings = defaultdict(dict)
        # doc_id -> {path, heading, len, preview}
        self.docs = {}

    # ---- 增量维护:按文档单元增删 ----
    def add_doc(self, doc_id, unit):
        toks = tokenize(unit["text"])
        tf = defaultdict(int)
        for t in toks:
            tf[t] += 1
        for t, c in tf.items():
            self.postings[t][doc_id] = c
        self.docs[doc_id] = {
            "path": unit["path"],
            "heading": unit["heading"],
            "len": len(toks),
            "preview": unit["preview"],
        }

    def remove_doc(self, doc_id):
        if doc_id not in self.docs:
            return
        del self.docs[doc_id]
        # postings 里同 doc_id 的条目在保存时统一清理(见 to_json),此处惰性即可

    # ---- 打分 ----
    def _avgdl(self):
        if not self.docs:
            return 0.0
        return sum(d["len"] for d in self.docs.values()) / len(self.docs)

    def score(self, query_tokens, k=10):
        """返回 [(doc_id, score)],按分数降序,最多 k 条。"""
        n = len(self.docs)
        if n == 0:
            return []
        avgdl = self._avgdl() or 1.0
        q_terms = set(query_tokens)
        scores = defaultdict(float)
        for term in q_terms:
            plist = self.postings.get(term)
            if not plist:
                continue
            # 只对仍存活的文档计 df
            live = {d: c for d, c in plist.items() if d in self.docs}
            df = len(live)
            if df == 0:
                continue
            idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
            for doc_id, tf in live.items():
                dl = self.docs[doc_id]["len"] or 1
                denom = tf + BM25_K1 * (1 - BM25_B + BM25_B * dl / avgdl)
                scores[doc_id] += idf * (tf * (BM25_K1 + 1)) / denom
        ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
        return ranked[:k]

    # ---- 序列化 ----
    def to_json(self):
        # 保存前把指向已删除文档的 posting 清掉,保持索引紧凑。
        live_ids = set(self.docs)
        postings = {}
        for term, plist in self.postings.items():
            kept = {d: c for d, c in plist.items() if d in live_ids}
            if kept:
                postings[term] = kept
        return {"postings": postings, "docs": self.docs}

    @classmethod
    def from_json(cls, data):
        idx = cls()
        idx.postings = defaultdict(dict, {t: dict(p) for t, p in data.get("postings", {}).items()})
        idx.docs = dict(data.get("docs", {}))
        return idx


# ----------------------------------------------------------------------------
# 索引目录读写。三文件:postings.json / docs.json / manifest.json。
# manifest 记 {files: {path: {sha, doc_ids}}, built_note},供增量比对与陈旧检测。
# ----------------------------------------------------------------------------
def index_dir(kb_root):
    return os.path.join(kb_root, "generated", "search-index")


def load_index(kb_root):
    """返回 (Bm25Index, manifest) 或 (None, None)(索引不存在/损坏)。"""
    d = index_dir(kb_root)
    p_post = os.path.join(d, POSTINGS_FILE)
    p_docs = os.path.join(d, DOCS_FILE)
    p_man = os.path.join(d, MANIFEST_FILE)
    if not (os.path.isfile(p_post) and os.path.isfile(p_docs) and os.path.isfile(p_man)):
        return None, None
    try:
        with open(p_post, "r", encoding="utf-8") as f:
            postings = json.load(f)
        with open(p_docs, "r", encoding="utf-8") as f:
            docs = json.load(f)
        with open(p_man, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None, None
    idx = Bm25Index.from_json({"postings": postings, "docs": docs})
    return idx, manifest


def save_index(kb_root, idx, manifest):
    d = index_dir(kb_root)
    os.makedirs(d, exist_ok=True)
    payload = idx.to_json()
    with open(os.path.join(d, POSTINGS_FILE), "w", encoding="utf-8") as f:
        json.dump(payload["postings"], f, ensure_ascii=False)
    with open(os.path.join(d, DOCS_FILE), "w", encoding="utf-8") as f:
        json.dump(payload["docs"], f, ensure_ascii=False)
    with open(os.path.join(d, MANIFEST_FILE), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)


def file_sha(kb_root, rel_path):
    """整文件内容 sha,供 manifest 增量比对(与单元级 sha 无关)。"""
    try:
        with open(os.path.join(kb_root, rel_path), "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()
    except OSError:
        return ""
