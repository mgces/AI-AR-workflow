#!/usr/bin/env python3
"""Extract the deterministically-checkable rows of the code_ruleset C/C++
workbook into a JSON data file the guard can load without openpyxl at gate time.

The workbook (`code_ruleset/黄区C语言门禁规则集_OAT_敏感词 - 20260126.xlsx`) holds
545 gate-level (门禁级) rows:

  * 307 WordsTool.* rows — sensitive words / banned brand & marketing terms. The
    detected token is the rule name minus the `WordsTool.<n> ` prefix. These are
    pure substring/word matches, so ALL of them are exported and checked.
  * 213 G.* + 25 tool rows — coding rules. Most are semantic / AST / metric based
    (圈复杂度, 大函数, switch 分支数, ...) and cannot be line-detected without false
    positives, so they are NOT exported here; the guard keeps a hand-curated,
    high-precision regex subset for the ones that CAN be matched safely, and the
    rest stay in human/skill review.

Run this only when the workbook changes:
    python3 scripts/build_ruleset_data.py
It rewrites data/ruleset_c.json. openpyxl is required to run the extractor but
NOT to run the guard.
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
WORKBOOK = REPO / "code_ruleset" / "黄区C语言门禁规则集_OAT_敏感词 - 20260126.xlsx"
OUT = HERE.parent / "data" / "ruleset_c.json"

WORDS_RE = re.compile(r"^WordsTool\.(\d+)\s+(.+?)\s*$")


def main() -> int:
    import openpyxl  # extractor-only dependency

    wb = openpyxl.load_workbook(WORKBOOK, read_only=True, data_only=True)
    ws = wb["Sheet0"]
    rows = list(ws.iter_rows(min_row=2, values_only=True))

    words = []
    for r in rows:
        name = str(r[0]) if r[0] is not None else ""
        m = WORDS_RE.match(name)
        if not m:
            continue
        words.append({
            "rule_id": "WordsTool.%s" % m.group(1),
            "word": m.group(2),
            "severity": (r[1] or "一般"),
        })
    # stable order for reproducible diffs
    words.sort(key=lambda w: int(w["rule_id"].split(".")[1]))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "source": WORKBOOK.name,
        "total_workbook_rows": len(rows),
        "sensitive_words": words,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote %s (%d sensitive words of %d workbook rows)"
          % (OUT, len(words), len(rows)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
