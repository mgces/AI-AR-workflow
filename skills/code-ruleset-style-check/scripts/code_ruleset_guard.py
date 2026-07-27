#!/usr/bin/env python3
"""Deterministic subset of the code_ruleset C++ gate plus formatting guard.

Two orthogonal checks, independently selectable so the same guard can serve
every lifecycle phase:

  * FORMAT  — clang-format --dry-run --Werror (whole-file layout).
  * RULES   — line-based, high-precision blockers. Two sources, both门禁级:
      1. ALL sensitive words (敏感词 / banned brand & marketing terms) exported
         from the workbook into data/ruleset_c.json — 300+ rows, every one a
         CI gate rule, so all are checked here.
      2. A hand-curated set of regex-detectable G.* coding rules (banned APIs,
         unsafe string funcs, header hygiene, ...). Semantic / metric G.* rules
         (圈复杂度, 大函数, switch 分支数, ...) can't be line-matched without false
         positives, so they stay in human/skill review and are NOT encoded.

Every workbook row is 门禁级 (gate-level), so ANY finding blocks — the guard does
not filter by severity. Severity is still reported per finding for triage.

Modes (mutually exclusive; default runs BOTH):
  (no flag)       format + rules   — P2 feature develop, P7 quality re-check.
  --rules-only    rules only        — P3 test-develop, where gtest macro bodies
                  legitimately vary in layout so clang-format must NOT block,
                  but banned APIs / sensitive words still must.
  --format-only   format only.

Scope: the caller passes ONLY the changed files; the guard then keeps only the
C/C++ source files (EXTS) among them. Unchanged files and non-code files are
never scanned.

Optional `--json <path>` writes a machine-readable finding list so a gate can
attach the same findings CI would raise, closing the "leaks to the CI gate" gap
by surfacing them at author time.

Exit code is nonzero when any finding (or a format failure in a mode that runs
format) is present.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

EXTS = {".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx"}
HEADER_EXTS = {".h", ".hh", ".hpp", ".hxx"}

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "ruleset_c.json"

# (rule_id, severity, pattern, remediation, applies_to_exts|None).
# Kept high-precision on purpose: these fire as hard blockers, so a false
# positive would wrongly stop P2/P3. Semantic rules (ownership, lifetime,
# validation, complexity) stay with the skill's human review and are NOT here.
_RAW_RULES = [
    ("G.INC.06", "严重", r"^\s*#\s*pragma\s+once\b", "use a #define header guard", None),
    ("G.EXP.35-CPP", "严重", r"\bNULL\b", "use nullptr", None),
    ("G.INC.05-CPP", "严重", r"extern\s+\"C\"\s*\{[\s\S]*?#\s*include",
     "move includes outside extern \"C\"", None),
    ("G.FUU.09", "严重", r"\brealloc\s*\(", "avoid realloc; use a checked replacement", None),
    ("G.FUU.10", "严重", r"\balloca\s*\(", "do not allocate stack memory with alloca", None),
    ("G.FUU.08", "严重", r"\babort\s*\(", "use structured error handling instead of abort", None),
    ("G.STD.17-CPP", "严重", r"\bkill\s*\(", "do not directly terminate another process", None),
    ("G.RES.05-CPP", "严重", r"\[(=|&)\s*\]", "avoid default lambda captures", None),
    ("G.STD.07-CPP", "严重", r"std::string[^\n]*(password|passwd|pwd|psw)",
     "do not store sensitive data in std::string", None),
    # --- banned process/shell APIs (fatal at the yellow-zone OAT gate) ---
    ("G.SEC.03", "致命", r"\bsystem\s*\(", "do not use system(); use a checked exec wrapper", None),
    ("G.SEC.04", "致命", r"\bpopen\s*\(", "do not use popen(); use a checked exec wrapper", None),
    ("G.SEC.05", "致命", r"\bgets\s*\(", "gets() is banned; use a bounded read (fgets)", None),
    # --- unbounded C string / format APIs ---
    ("G.SEC.06", "严重", r"\b(strcpy|strcat|sprintf|vsprintf|stpcpy)\s*\(",
     "use the bounded variant (strcpy_s / snprintf / ...)", None),
    # --- control flow ---
    ("G.CTL.01", "严重", r"^\s*goto\s+\w", "avoid goto", None),
    # --- header hygiene: 'using namespace' at header scope pollutes every TU ---
    ("G.NAM.02", "严重", r"^\s*using\s+namespace\b",
     "do not put 'using namespace' at header scope", HEADER_EXTS),
]
RULES = [(rid, sev, re.compile(pat), fix, exts) for rid, sev, pat, fix, exts in _RAW_RULES]


def _load_sensitive_words():
    """Compile every sensitive word from data/ruleset_c.json into a matcher.
    ASCII alphanumeric tokens match on word boundaries (case-insensitive) so
    'aar' does not fire inside 'aardvark'; tokens with spaces/punctuation match
    as a case-insensitive substring; CJK tokens match as a plain substring.
    Returns [(rule_id, severity, compiled_re, word)]. Missing/broken data is a
    hard error at load time so a silent bypass can never masquerade as clean."""
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    out = []
    for w in data.get("sensitive_words", []):
        token = (w.get("word") or "").strip()
        if not token:
            continue
        if re.fullmatch(r"[A-Za-z0-9]+", token):
            pat = re.compile(r"\b%s\b" % re.escape(token), re.IGNORECASE)
        elif token.isascii():
            pat = re.compile(re.escape(token), re.IGNORECASE)
        else:
            pat = re.compile(re.escape(token))
        out.append((w.get("rule_id", "WordsTool"), w.get("severity", "一般"), pat, token))
    return out


SENSITIVE_WORDS = _load_sensitive_words()


def _rule_findings(files):
    findings = []
    for path in files:
        ext = path.suffix.lower()
        text = path.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        for rid, sev, pat, fix, exts in RULES:
            if exts is not None and ext not in exts:
                continue
            for n, line in enumerate(lines, 1):
                if pat.search(line):
                    findings.append({
                        "file": str(path), "line": n, "rule_id": rid,
                        "severity": sev, "remediation": fix,
                    })
        for rid, sev, pat, word in SENSITIVE_WORDS:
            for n, line in enumerate(lines, 1):
                if pat.search(line):
                    findings.append({
                        "file": str(path), "line": n, "rule_id": rid,
                        "severity": sev,
                        "remediation": "remove sensitive/banned word %r" % word,
                    })
    return findings


def _format_failures(files):
    clang_format = shutil.which("clang-format")
    if not clang_format:
        return ["clang-format not found in PATH"]
    cp = subprocess.run([clang_format, "--dry-run", "--Werror", *map(str, files)], text=True)
    return ["format guard failed"] if cp.returncode else []


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--rules-only", action="store_true",
                      help="run only the deterministic rule blockers (skip clang-format)")
    mode.add_argument("--format-only", action="store_true",
                      help="run only clang-format (skip the rule blockers)")
    ap.add_argument("--json", metavar="PATH", help="write findings as JSON to PATH")
    ap.add_argument("files", nargs="*")
    args = ap.parse_args()

    # Scope guard: keep only C/C++ source among the (already changed-only) files
    # the caller passed. Unchanged files are never passed; non-code files drop here.
    files = [Path(x) for x in args.files if Path(x).suffix.lower() in EXTS]
    run_format = not args.rules_only
    run_rules = not args.format_only

    format_failures = _format_failures(files) if (files and run_format) else []
    findings = _rule_findings(files) if (files and run_rules) else []

    if args.json:
        Path(args.json).write_text(json.dumps({
            "files": len(files),
            "mode": "rules-only" if args.rules_only else "format-only" if args.format_only else "full",
            "format_failures": format_failures,
            "findings": findings,
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = list(format_failures)
    lines += ["%(file)s:%(line)s: %(rule_id)s [%(severity)s] %(remediation)s" % f
              for f in findings]
    # Every workbook row is 门禁级, so ANY finding blocks (no severity filter).
    if format_failures or findings:
        if lines:
            print("\n".join(lines), file=sys.stderr)
        return 1
    if not files:
        return 0
    print("code_ruleset PASS: %d file(s), %d regex rule(s) + %d sensitive word(s) checked"
          % (len(files), len(RULES), len(SENSITIVE_WORDS)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
