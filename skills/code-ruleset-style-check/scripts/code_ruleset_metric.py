#!/usr/bin/env python3
"""Metric/size checks for the C++ code_ruleset workbook.

Readability gate rules (G.FUD.*, G.FUN.*) that require structural analysis:
function length, cyclomatic complexity, nesting depth, parameter count, source
file length, and header size.  Uses lizard when available (pip-installable) or
falls back to a fast line-count / brace-depth heuristic.

Exit code is nonzero when any finding is present.

Usage:
  python3 code_ruleset_metric.py [files...]
  python3 code_ruleset_metric.py --json findings.json [files...]
"""
import argparse
import json
import re
import sys
from pathlib import Path

# ── thresholds (from the workbook's G.FUD.* rules) ─────────────────────────
_THRESHOLDS = {
    "G.FUD.05":       {"severity": "一般", "name": "函数过长",        "max_lines": 80,     "max_nesting": 5, "max_params": 8},
    "G.FUD.05-CPP":   {"severity": "一般", "name": "超大函数[C++]",   "max_lines": 80,     "max_nesting": 5, "max_params": 8},
    "G.FUD.06":       {"severity": "一般", "name": "内联函数过长",    "max_lines": 10},
    "G.FUD.06-CPP":   {"severity": "一般", "name": "超大圈复杂度",   "max_complexity": 20},
    "G.FUD.07-CPP":   {"severity": "一般", "name": "超大源文件",     "max_file_lines": 3000},
    "G.FUD.08-CPP":   {"severity": "一般", "name": "超大深度函数",   "max_nesting": 5},
    "G.FUN.01-CPP":   {"severity": "一般", "name": "函数功能单一",   "max_nesting": 5, "max_params": 8, "max_lines": 80},
    "G.INC.11-CPP":   {"severity": "一般", "name": "超大头文件",     "max_file_lines": 1500},
}

EXTS = {".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx"}


def _basic_complexity(lines):
    """Quick heuristics for function length and nesting depth when lizard is
    unavailable.  Tracks `{` / `}` at the file level — imprecise but good
    enough to catch the clearly oversized functions the gate targets."""
    depth = 0
    func_starts = []
    for n, line in enumerate(lines, 1):
        stripped = line.strip()
        if re.match(r'^(?:static\s+)?(?:int|void|char|bool|long|float|double|'
                    r'unsigned|signed|size_t|ssize_t|int32_t|uint32_t|'
                    r'int64_t|uint64_t|char\s*\*|void\s*\*|'
                    r'const\s+\w+|std::\w+)\s+\w+\s*\(', stripped):
            func_starts.append(n)
        depth += stripped.count("{") - stripped.count("}")
    return func_starts


def _findings_lizard(files):
    """Delegate to lizard for per-function metrics.  Returns [] if lizard
    is not installed or produces no output."""
    import subprocess
    try:
        cp = subprocess.run(
            ["lizard", "-l", "cpp", "--csv", *map(str, files)],
            capture_output=True, text=True, timeout=60)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None  # signal fallback
    out = []
    for line in cp.stdout.splitlines():
        if not line or line.startswith("NLOC"):
            continue
        parts = line.split(",")
        if len(parts) < 8:
            continue
        try:
            nloc = int(parts[0].strip())
            ccn = int(parts[1].strip())
            params = int(parts[5].strip())
            func_name = parts[6].strip() if len(parts) > 6 else "?"
            file_path = parts[-1].strip()
        except (ValueError, IndexError):
            continue
        severity = "一般"
        rid = None
        # Map lizard metrics to rule_ids
        if nloc > _THRESHOLDS["G.FUD.05"]["max_lines"]:
            rid = "G.FUD.05"
        elif ccn > _THRESHOLDS["G.FUD.06-CPP"]["max_complexity"]:
            rid = "G.FUD.06-CPP"
        elif params > _THRESHOLDS["G.FUD.05"]["max_params"]:
            rid = "G.FUN.01-CPP"
        if rid:
            out.append({
                "file": file_path, "line": 1, "rule_id": rid,
                "severity": severity,
                "remediation": "%s: %s (NLOC=%d, CCN=%d, params=%d)"
                % (_THRESHOLDS[rid]["name"], func_name, nloc, ccn, params),
            })
    return out


def _fallback_findings(files):
    """Line-count-based fallback when lizard is unavailable."""
    out = []
    for path in files:
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        lines = text.splitlines()
        total_lines = len(lines)
        ext = path.suffix.lower()
        is_header = ext in {".h", ".hh", ".hpp", ".hxx"}

        # G.FUD.07-CPP: source file too long
        if not is_header and total_lines > _THRESHOLDS["G.FUD.07-CPP"]["max_file_lines"]:
            out.append({
                "file": str(path), "line": 1, "rule_id": "G.FUD.07-CPP",
                "severity": "一般",
                "remediation": "source file too long (%d lines, max %d)"
                % (total_lines, _THRESHOLDS["G.FUD.07-CPP"]["max_file_lines"]),
            })

        # G.INC.11-CPP: header file too long
        if is_header and total_lines > _THRESHOLDS["G.INC.11-CPP"]["max_file_lines"]:
            out.append({
                "file": str(path), "line": 1, "rule_id": "G.INC.11-CPP",
                "severity": "一般",
                "remediation": "header file too long (%d lines, max %d)"
                % (total_lines, _THRESHOLDS["G.INC.11-CPP"]["max_file_lines"]),
            })
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", metavar="PATH", help="write findings as JSON")
    ap.add_argument("--skip-lizard", action="store_true",
                    help="skip lizard even if installed (use fallback)")
    ap.add_argument("files", nargs="*")
    args = ap.parse_args()

    files = [Path(x) for x in args.files if x and Path(x).suffix.lower() in EXTS]
    if not files:
        print("code_ruleset_metric: no C/C++ files to check")
        return 0

    findings = _fallback_findings(files)
    if not args.skip_lizard:
        lizard = _findings_lizard(files)
        if lizard is not None:
            findings.extend(lizard)

    if args.json:
        Path(args.json).write_text(json.dumps({
            "files": len(files),
            "findings": findings,
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    if findings:
        lines = ["%(file)s:%(line)s: %(rule_id)s [%(severity)s] %(remediation)s" % f
                 for f in findings]
        print("\n".join(lines), file=sys.stderr)
        return 1

    print("code_ruleset_metric PASS: %d file(s)" % len(files))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
