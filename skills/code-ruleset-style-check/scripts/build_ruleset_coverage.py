#!/usr/bin/env python3
"""Build the auditable backend map for every workbook row.

The guard intentionally implements only deterministic checks that can be made
safe at author time.  This manifest keeps the other rows visible and assigns
them to their real later-stage owner (clang-tidy, metrics, OAT, or semantic
review) instead of silently dropping them.
"""
import ast
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
SOURCE = SKILL / "data" / "ruleset_c.json"
OUT = SKILL / "data" / "ruleset_coverage.json"
GUARD = HERE / "code_ruleset_guard.py"
METRIC = HERE / "code_ruleset_metric.py"

MULTILINE_RULES = {
    "G.CTL.06", "G.OTH.01", "G.INC.05-CPP", "G.INC.08", "G.INC.08-CPP",
}
FILE_HYGIENE_RULES = {
    "G.FIL.04-CPP", "G.PRE.05-CPP", "G.PRE.13", "OAT.1",
}
STATIC_GATE_RULES = {"G.INC.02"}
OAT_RULE_PREFIXES = ("OAT.", "FossScan.")

BACKEND_PHASES = {
    "sensitive-word": ["P2", "P3"],
    "regex": ["P2", "P3"],
    "multiline": ["P2", "P3"],
    "clang-format": ["P2"],
    "clang-tidy": ["P4"],
    "metric": ["P4", "P7"],
    "file-hygiene": ["P2", "P3", "P7"],
    "static-gate": ["P2"],
    "repository-oat": ["P7", "CI"],
    "semantic-review": ["P2", "P3", "P7"],
}
AUTHOR_TIME_BACKENDS = {
    "sensitive-word", "regex", "multiline", "file-hygiene", "static-gate",
}


def _assignment(tree, name):
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if any(isinstance(target, ast.Name) and target.id == name for target in node.targets):
            return node.value
    raise ValueError("assignment not found: %s" % name)


def _guard_ids():
    tree = ast.parse(GUARD.read_text(encoding="utf-8"))
    raw = _assignment(tree, "_RAW_RULES")
    raw_ids = {ast.literal_eval(item.elts[0]) for item in raw.elts}
    tidy = _assignment(tree, "_CLANG_TIDY_RULE_MAP")
    tidy_ids = {ast.literal_eval(item.elts[1]) for item in tidy.elts}
    fmt = _assignment(tree, "_CLANG_FORMAT_RULES")
    fmt_call = fmt if isinstance(fmt, ast.Call) else None
    if not fmt_call or not fmt_call.args:
        raise ValueError("_CLANG_FORMAT_RULES must be a literal frozenset")
    format_ids = {ast.literal_eval(item) for item in fmt_call.args[0].elts}
    return raw_ids, tidy_ids, format_ids


def _metric_ids():
    tree = ast.parse(METRIC.read_text(encoding="utf-8"))
    thresholds = ast.literal_eval(_assignment(tree, "_THRESHOLDS"))
    return set(thresholds)


def _sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _backend_for(rule_id, raw_ids, tidy_ids, format_ids, metric_ids):
    if rule_id.startswith("WordsTool."):
        return "sensitive-word"
    if rule_id in MULTILINE_RULES:
        return "multiline"
    if rule_id in raw_ids:
        return "regex"
    if rule_id in format_ids:
        return "clang-format"
    if rule_id in tidy_ids:
        return "clang-tidy"
    if rule_id in metric_ids:
        return "metric"
    if rule_id in FILE_HYGIENE_RULES:
        return "file-hygiene"
    if rule_id in STATIC_GATE_RULES:
        return "static-gate"
    if rule_id.startswith(OAT_RULE_PREFIXES):
        return "repository-oat"
    return "semantic-review"


def build() -> dict:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    if source.get("total_workbook_rows") != 545:
        raise ValueError("ruleset data must contain 545 workbook rows")
    raw_ids, tidy_ids, format_ids = _guard_ids()
    metric_ids = _metric_ids()
    known_local_ids = raw_ids | tidy_ids | format_ids | metric_ids | MULTILINE_RULES
    known_local_ids |= FILE_HYGIENE_RULES | STATIC_GATE_RULES
    workbook_ids = {rule["rule_id"] for rule in source["rules"]}
    unknown = sorted(known_local_ids - workbook_ids)
    if unknown:
        raise ValueError("local rule IDs absent from workbook: %s" % ", ".join(unknown))

    rows = []
    author_time_rows = 0
    for rule in source["rules"]:
        backend = _backend_for(
            rule["rule_id"], raw_ids, tidy_ids, format_ids, metric_ids
        )
        phases = BACKEND_PHASES[backend]
        author_time = backend in AUTHOR_TIME_BACKENDS
        author_time_rows += int(author_time)
        rows.append({
            "row": rule["row"],
            "rule_id": rule["rule_id"],
            "severity": rule["severity"],
            "backends": [backend],
            "phases": phases,
            "author_time": author_time,
        })

    return {
        "source": source.get("source", ""),
        "source_sha256": source.get("source_sha256", ""),
        "ruleset_data_sha256": _sha256(SOURCE),
        "rows": rows,
        "summary": {
            "workbook_rows": len(rows),
            "mapped_rows": len(rows),
            "author_time_rows": author_time_rows,
            "later_stage_rows": len(rows) - author_time_rows,
            "backend_counts": {
                backend: sum(backend in row["backends"] for row in rows)
                for backend in BACKEND_PHASES
            },
        },
    }


def main() -> int:
    payload = build()
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("wrote %s (%d workbook rows)" % (OUT, payload["summary"]["workbook_rows"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
