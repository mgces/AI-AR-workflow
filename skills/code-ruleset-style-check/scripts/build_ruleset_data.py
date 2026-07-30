#!/usr/bin/env python3
"""Build the machine-readable C++ rule manifest from the checked-in workbook.

The workbook is the authoritative source.  This extractor keeps every row,
including non-numeric WordsTool names, so a malformed or newly added rule cannot
disappear from the strict gate silently.
"""
import json
import hashlib
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
WORKBOOK = SKILL / "s" / "黄区C语言门禁规则集_OAT_敏感词 - 20260126.xlsx"
OUT = SKILL / "data" / "ruleset_c.json"

WORDS_RE = re.compile(r"^(WordsTool\.(\S+))(?:\s+(.+?))?\s*$")
KNOWN_ID_RE = re.compile(r"^(G\.[A-Za-z0-9_.-]+|OAT\.[0-9]+|FossScan\.[0-9]+)\b")

COLUMN_NAMES = (
    "rule_name", "severity", "tool_version", "language", "scope",
    "start_delay", "end_delay", "options", "good_example", "bad_example",
    "remediation", "sample", "link", "cwe",
)


def _text(value):
    return "" if value is None else str(value)


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _rule_id(name, row_number):
    match = WORDS_RE.match(name)
    if match:
        return match.group(1)
    match = KNOWN_ID_RE.match(name)
    if match:
        return match.group(1)
    # Fallback: map Chinese-only descriptions (rows without a standard ID
    # prefix in column A) to reasonable G.* / G.*-CPP identifiers.
    _FALLBACK = {
        "弱加密算法【C】":    "G.CRY.01",
        "不安全函数[C++]":    "G.FUU.21-CPP",
        "超大函数[C++]":      "G.FUD.05-CPP",
        "超大源文件[C++]":    "G.FUD.07-CPP",
        "检查通过代码注释屏蔽coverity告警的方式":  "G.CMT.06",
        "重复文件[C++]":      "G.FIL.04-CPP",
        "超大圈复杂度[C++]":  "G.FUD.06-CPP",
        "超大深度函数[C++]":  "G.FUD.08-CPP",
        "查不同分支分别调用了危险函数和对应的安全函数":  "G.FUU.22",
        "弱加密算法":         "G.CRY.02",
        "超大头文件[C++]":    "G.INC.11-CPP",
        "可查找对分配程序进行调用，并且在使用-或+运算符时将圆括号位置放错的很多情况":  "G.MEM.05",
        "不安全IPSI算法检查": "G.CRY.03",
        "冗余代码[C++]":      "G.OTH.06-CPP",
    }
    mapped = _FALLBACK.get(name)
    if mapped:
        return mapped
    return "row.%03d" % row_number


def _parse_word(name):
    match = WORDS_RE.match(name)
    if not match:
        return None
    word = (match.group(3) or match.group(2) or "").strip()
    if not word:
        # Three source rows use the token itself as the sensitive word.
        word = match.group(2)
    return word


def main() -> int:
    import openpyxl

    if not WORKBOOK.is_file():
        raise SystemExit("C++ ruleset workbook not found: %s" % WORKBOOK)

    wb = openpyxl.load_workbook(WORKBOOK, read_only=True, data_only=True)
    ws = wb["Sheet0"]
    rules = []
    sensitive_words = []
    for excel_row, values in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
        values = list(values) + [None] * (len(COLUMN_NAMES) - len(values))
        fields = {key: _text(value) for key, value in zip(COLUMN_NAMES, values)}
        name = fields["rule_name"].strip()
        if not name:
            raise ValueError("empty rule name at workbook row %d" % excel_row)
        rule_id = _rule_id(name, excel_row - 1)
        rule = {
            "row": excel_row,
            "rule_id": rule_id,
            **fields,
        }
        rules.append(rule)
        word = _parse_word(name)
        if word is not None:
            sensitive_words.append({
                "rule_id": rule_id,
                "word": word,
                "severity": fields["severity"] or "一般",
                "row": excel_row,
            })

    if len(rules) != 545:
        raise ValueError("expected 545 workbook rows, got %d" % len(rules))
    if len(sensitive_words) != 307:
        raise ValueError("expected 307 WordsTool rows, got %d" % len(sensitive_words))
    if len({item["rule_id"] for item in sensitive_words}) != len(sensitive_words):
        raise ValueError("duplicate WordsTool rule id")

    payload = {
        "source": WORKBOOK.name,
        "source_sha256": _sha256(WORKBOOK),
        "total_workbook_rows": len(rules),
        "sensitive_word_rows": len(sensitive_words),
        "sensitive_words": sensitive_words,
        "rules": rules,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                   encoding="utf-8")
    print("wrote %s (%d rows, %d sensitive words)" %
          (OUT, len(rules), len(sensitive_words)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
