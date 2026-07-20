#!/usr/bin/env python3
"""Deterministic subset of the code_ruleset C++ gate plus formatting guard."""
import re
import shutil
import subprocess
import sys
from pathlib import Path

EXTS = {".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx"}
RULES = [
    ("G.INC.06", "严重", r"^\s*#\s*pragma\s+once\b", "use a #define header guard"),
    ("G.EXP.35-CPP", "严重", r"\bNULL\b", "use nullptr"),
    ("G.INC.05-CPP", "严重", r"extern\s+\"C\"\s*\{[\s\S]*?#\s*include", "move includes outside extern \"C\""),
    ("G.FUU.09", "严重", r"\brealloc\s*\(", "avoid realloc; use a checked replacement"),
    ("G.FUU.10", "严重", r"\balloca\s*\(", "do not allocate stack memory with alloca"),
    ("G.FUU.08", "严重", r"\babort\s*\(", "use structured error handling instead of abort"),
    ("G.STD.17-CPP", "严重", r"\bkill\s*\(", "do not directly terminate another process"),
    ("G.RES.05-CPP", "严重", r"\[(=|&)\s*\]", "avoid default lambda captures"),
    ("G.STD.07-CPP", "严重", r"std::string[^\n]*(password|passwd|pwd|psw)", "do not store sensitive data in std::string"),
]

def main():
    files = [Path(x) for x in sys.argv[1:] if Path(x).suffix.lower() in EXTS]
    if not files:
        return 0
    failures = []
    clang_format = shutil.which("clang-format")
    if clang_format:
        cp = subprocess.run([clang_format, "--dry-run", "--Werror", *map(str, files)], text=True)
        if cp.returncode:
            failures.append("format guard failed")
    else:
        failures.append("clang-format not found in PATH")
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        for rid, sev, pattern, fix in RULES:
            for n, line in enumerate(text.splitlines(), 1):
                if re.search(pattern, line):
                    failures.append(f"{path}:{n}: {rid} [{sev}] {fix}")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        return 1
    print(f"code_ruleset PASS: {len(files)} file(s)")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
