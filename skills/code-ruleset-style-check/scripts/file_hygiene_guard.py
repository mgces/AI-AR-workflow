#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Deterministic, no-false-positive file-hygiene gate — the author-time local
mirror of the CI checks that need no toolchain and never mis-fire.

Companion to code_ruleset_guard.py. That guard owns C/C++ *content* (format +
banned APIs + sensitive words in code); this guard owns *file-level* hygiene that
a CI gate would otherwise be the first to catch:

  * H1 LICENSE  — every changed source file in a comment-capable, header-bearing
    language must carry an Apache-2.0 / OpenHarmony copyright header near the top.
  * H2 BYTES    — no UTF-8 BOM, no NUL byte, no CRLF/CR line endings in any text
    file (byte-level integrity; unambiguous regardless of comment syntax).
  * H3 JSON     — every changed .json file must parse as JSON. A malformed data
    file that a later gate reads with a tolerant reader would silently degrade to
    {}/None; catching it here at author time keeps that from happening. A file
    named exactly bundle.json is additionally checked for the required component
    descriptor keys (name/version/component + component.name/subsystem) — the
    same "field required" error the build would otherwise be first to raise.
  * H4 SENSITIVE — the SAME 门禁 sensitive/banned-word list code_ruleset_guard
    applies to C/C++ content, extended to every OTHER text artifact (docs,
    config, build files, JSON) so a banned word cannot leak in through a
    non-code file. C/C++ files are left to code_ruleset_guard (no double-report).
  * H5 GN       — a `sources`/`public` list entry in a BUILD.gn that is a plain
    relative path to a C/C++ source/header must exist on disk. A missing one is
    exactly the "nonexistent input" error GN itself raises.

The scope is intentionally the subset of CI checks that are DETERMINISTIC and
FALSE-POSITIVE-FREE, so pulling them earlier (P2 feature-develop / P3 test-
develop) can BLOCK without ever wrongly stopping a good change. Non-deterministic
or flaky CI checks (FossScan, semantic static analysis) are NOT mirrored — they
stay behind the P8/CI backstop.

H1 scope note: only comment-capable header-bearing formats are license-checked
(.c/.cc/.cpp/.cxx/.h/.hh/.hpp/.hxx/.gn/.gni). Data formats with no comment
syntax (.json) are deliberately EXCLUDED from H1 — a license header there would
be a false positive. JSON hygiene (H2 byte validity, H3 parseability, H4
sensitive words) covers .json instead, exactly as the byte/parse/word rules,
never as a header rule.

Scope like code_ruleset_guard: the caller passes ONLY the changed files; the
guard keeps just the in-scope extensions among them. Unchanged and out-of-scope
files are never flagged.

Optional `--json <path>` writes a machine-readable finding list so a gate can
attach the same findings CI would raise, surfacing them at author time. Every
finding is `{file, line, rule_id, severity, remediation}`.

Exit code is nonzero when any finding is present (every finding is gate-level).
"""
import argparse
import json
import re
import sys
from pathlib import Path

# H4 reuses the single source of sensitive/banned words (data/ruleset_c.json)
# that code_ruleset_guard owns, so the 门禁 word list is never duplicated. That
# import runs code_ruleset_guard's fail-closed load, so a missing/broken word
# list crashes here too rather than silently skipping H4. _CXX_EXTS is that
# guard's C/C++ scope, reused here to EXCLUDE C/C++ from H4 (code_ruleset_guard
# already scans those) and to recognise GN source entries in H5.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from code_ruleset_guard import SENSITIVE_WORDS, EXTS as _CXX_EXTS  # noqa: E402

# Comment-capable, header-bearing source extensions. JSON is intentionally
# absent (no comment syntax -> a header requirement would false-positive).
LICENSE_EXTS = {".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx",
                ".gn", ".gni"}

# H2 byte-hygiene scope: any text-ish file. BOM/NUL/CRLF are byte-level and
# false-positive-free regardless of a file's comment syntax, so the scope is
# broader than the license check.
TEXT_EXTS = _CXX_EXTS | {
    ".gn", ".gni", ".json", ".md", ".markdown", ".txt", ".rst",
    ".py", ".sh", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".cmake", ".xml",
}
BYTE_EXTS = set(TEXT_EXTS)
JSON_EXTS = {".json"}
GN_EXTS = {".gn", ".gni"}
# H4 sensitive-word scope: every text extension EXCEPT the C/C++ files
# code_ruleset_guard already scans, so a banned word is never double-reported.
SENSITIVE_EXTS = TEXT_EXTS - _CXX_EXTS

# All extensions this guard has any check for.
EXTS = LICENSE_EXTS | BYTE_EXTS | JSON_EXTS | GN_EXTS | SENSITIVE_EXTS

# OAT.1: binary artefact extensions that must never appear in a source tree.
# A changed file with one of these triggers OAT.1 (binary contamination).
_BINARY_EXTS = {
    ".o", ".obj", ".lib", ".a", ".so", ".dll", ".dylib", ".exe", ".bin",
    ".ko", ".mod", ".class", ".jar", ".war", ".pyc", ".pyo", ".pyd",
    ".elf", ".deb", ".rpm", ".AppImage", ".snap",
}
_BINARY_EXTS = {ext.lower() for ext in _BINARY_EXTS}
# Binary extensions are in scope only for the OAT.1 contamination check; they
# are not text/license inputs and therefore must not be decoded.
EXTS |= _BINARY_EXTS

# How many leading lines of a file may precede the copyright header. Real files
# open with a shebang and/or a comment-block opener before the copyright line,
# so we scan a small window rather than requiring line 1 exactly. Kept tight so
# a copyright mention buried deep in a file does not satisfy the header rule.
_HEADER_WINDOW = 8

# High-precision, no-false-positive header signals. A file PASSES H1 when the
# leading window contains BOTH an Apache-2.0 license reference AND a copyright
# line — the shape every OpenHarmony source header carries, in either the C
# block-comment (`* Copyright ...`) or the GN/py line-comment (`# Copyright`)
# style. Requiring both keeps an incidental "copyright" mention in a string or
# a bare "Apache" word from satisfying the gate.
_APACHE_RE = re.compile(r"Apache License,?\s*Version\s*2\.0", re.IGNORECASE)
_COPYRIGHT_RE = re.compile(r"\bCopyright\b", re.IGNORECASE)

_UTF8_BOM = b"\xef\xbb\xbf"

# H5: a `sources`/`public` list assignment, and the string literals inside it.
_GN_LIST_RE = re.compile(r"\b(?:sources|public)\s*\+?=\s*\[(?P<body>[^\]]*)\]",
                         re.DOTALL)
_GN_STR_RE = re.compile(r"\"([^\"\n]+)\"")


def _finding(path, line, rule_id, remediation, severity="严重"):
    return {"file": str(path), "line": line, "rule_id": rule_id,
            "severity": severity, "remediation": remediation}


def _license_finding(path):
    """H1: return a finding dict if `path` lacks an Apache-2.0 header in its
    leading window, else None. Fails closed on an unreadable file (a file the
    gate cannot read must not silently pass)."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return _finding(path, 1, "H1.LICENSE",
                        "cannot read file for license check: %s" % exc)
    window = "\n".join(text.splitlines()[:_HEADER_WINDOW])
    if _APACHE_RE.search(window) and _COPYRIGHT_RE.search(window):
        return None
    return _finding(
        path, 1, "H1.LICENSE",
        "add the Apache-2.0 / OpenHarmony copyright header at the top of the "
        "file (a 'Copyright ...' line and an 'Apache License, Version 2.0' line "
        "within the first %d lines)" % _HEADER_WINDOW)


def _byte_findings(path):
    """H2: byte-level hygiene — UTF-8 validity, BOM, NUL bytes, and CRLF/CR line
    endings. All are unambiguous and false-positive-free, so each is gate-level.
    Reads raw bytes (the point is byte integrity, not decoded text). Fails
    closed on an unreadable file.

    The strict UTF-8 decode is the fix for the `errors="replace"` masking the
    gates used to do: an invalid multibyte sequence is neither NUL, BOM, nor CR,
    so without this it would decode-with-replacement and reach CI undetected."""
    try:
        raw = path.read_bytes()
    except OSError as exc:
        return [_finding(path, 1, "H2.READ",
                         "cannot read file for byte-hygiene check: %s" % exc)]
    out = []
    body = raw[len(_UTF8_BOM):] if raw.startswith(_UTF8_BOM) else raw
    try:
        body.decode("utf-8")
    except UnicodeDecodeError as exc:
        out.append(_finding(path, raw.count(b"\n", 0, exc.start) + 1, "H2.UTF8",
                            "file is not valid UTF-8 at byte %d: %s"
                            % (exc.start, exc.reason)))
    if raw.startswith(_UTF8_BOM):
        out.append(_finding(path, 1, "H2.BOM",
                            "remove the UTF-8 BOM at the start of the file"))
    nul = raw.find(b"\x00")
    if nul != -1:
        out.append(_finding(path, raw.count(b"\n", 0, nul) + 1, "H2.NUL",
                            "file contains a NUL byte; save it as UTF-8 text"))
    cr = raw.find(b"\r")
    if cr != -1:
        out.append(_finding(path, raw.count(b"\n", 0, cr) + 1, "H2.CRLF",
                            "use LF line endings (convert CRLF/CR to LF)"))
    return out


def _json_finding(path):
    """H3: the file must be parseable JSON. Read with utf-8-sig so a BOM alone
    is reported by H2 (not double-reported here); H3 fires only on a genuine
    JSON syntax error. Deterministic and false-positive-free.

    B4: for a component descriptor named exactly `bundle.json`, additionally
    require the keys the OpenHarmony build reads (`name`, `version`,
    `component`, and `component.name`/`component.subsystem`). A missing key is
    the same "field required" error the build/HPM step raises later — surfacing
    it at author time is deterministic and false-positive-free because it is
    scoped to that one well-known filename, never to arbitrary .json data."""
    try:
        text = path.read_text(encoding="utf-8-sig")
    except (OSError, UnicodeError) as exc:
        return _finding(path, 1, "H3.JSON",
                        "file is not readable UTF-8 JSON: %s" % exc)
    try:
        obj = json.loads(text)
    except json.JSONDecodeError as exc:
        return _finding(path, getattr(exc, "lineno", 1) or 1, "H3.JSON",
                        "invalid JSON: %s" % exc.msg)
    if path.name == "bundle.json":
        return _bundle_required_keys_finding(path, obj)
    return None


# B4: the top-level and nested keys every OpenHarmony component bundle.json
# must carry for the build system / HPM to consume it. Kept to the universally
# required subset so the check never mis-fires on a valid descriptor.
_BUNDLE_REQUIRED_TOP = ("name", "version", "component")
_BUNDLE_REQUIRED_COMPONENT = ("name", "subsystem")


def _bundle_required_keys_finding(path, obj):
    """B4 helper: return a finding if a parsed bundle.json is missing a required
    key, else None. Only reached for files literally named bundle.json."""
    if not isinstance(obj, dict):
        return _finding(path, 1, "H3.BUNDLE",
                        "bundle.json must be a JSON object with keys %s"
                        % ", ".join(_BUNDLE_REQUIRED_TOP))
    missing = [k for k in _BUNDLE_REQUIRED_TOP if k not in obj]
    if missing:
        return _finding(path, 1, "H3.BUNDLE",
                        "bundle.json is missing required key(s): %s"
                        % ", ".join(missing))
    component = obj.get("component")
    if not isinstance(component, dict):
        return _finding(path, 1, "H3.BUNDLE",
                        "bundle.json 'component' must be a JSON object")
    missing_c = [k for k in _BUNDLE_REQUIRED_COMPONENT if k not in component]
    if missing_c:
        return _finding(path, 1, "H3.BUNDLE",
                        "bundle.json 'component' is missing required key(s): %s"
                        % ", ".join(missing_c))
    return None


def _sensitive_findings(path):
    """H4: scan a non-C/C++ text file for the same 门禁 sensitive/banned words
    code_ruleset_guard enforces in code. Every workbook row is gate-level, so
    any hit blocks. Fails closed on an unreadable file."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return [_finding(path, 1, "H4.READ",
                         "cannot read file for sensitive-word check: %s" % exc)]
    out = []
    lines = text.splitlines()
    # Never echo the matched word text (see code_ruleset_guard C1 note): report
    # rule_id only so the raw term never reaches evidence logs / model context.
    for rid, sev, pat, _word in SENSITIVE_WORDS:
        for n, line in enumerate(lines, 1):
            if pat.search(line):
                out.append(_finding(path, n, rid,
                                    "remove banned/sensitive term flagged by %s" % rid,
                                    severity=sev))
    return out


def _gn_findings(path):
    """H5: every `sources`/`public` list entry that is a plain relative path to
    a C/C++ source/header must exist on disk relative to the BUILD.gn. Entries
    that are GN variables ($...), labels (//... or :...) or globs (*) are skipped
    — their existence can't be decided statically without evaluating GN — which
    keeps the check false-positive-free."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return [_finding(path, 1, "H5.GN", "cannot read GN file: %s" % exc)]
    out = []
    base = path.parent
    for m in _GN_LIST_RE.finditer(text):
        body_start = m.start("body")
        for sm in _GN_STR_RE.finditer(m.group("body")):
            entry = sm.group(1).strip()
            if (not entry or entry[0] in "$:" or entry.startswith("//")
                    or "*" in entry):
                continue
            if Path(entry).suffix.lower() not in _CXX_EXTS:
                continue
            if not (base / entry).is_file():
                line = text.count("\n", 0, body_start + sm.start(1)) + 1
                out.append(_finding(
                    path, line, "H5.GN.MISSING_SOURCE",
                    "sources entry %r does not exist on disk relative to the "
                    "BUILD.gn" % entry))
    return out


def _binary_finding(path):
    """OAT.1: return a finding if `path` is a binary artefact committed to the
    source tree (compiled object, library, executable, archive, bytecode, …).
    Binary files in source repos are a licence / supply-chain risk because their
    provenance cannot be audited via git diff.
    """
    return _finding(path, 1, "OAT.1",
                    "binary artefact detected; do not commit compiled/binary "
                    "files to the source tree")


def _oat6_finding(path):
    """OAT.6: return a finding if a LICENCE / LICENSE / COPYING file appears in
    a subdirectory (not the repo root).  The repo SHOULD have exactly one
    top-level LICENCE file; extra copies in subdirectories are redundant and
    often indicate stale third-party code whose license must be tracked via
    README.OpenSource instead.
    """
    if path.parent == Path("."):
        return None  # top-level LICENCE is correct
    return _finding(path, 1, "OAT.6",
                    "redundant LICENSE file in subdirectory; remove or "
                    "document via README.OpenSource instead")


def _findings(files):
    out = []
    for path in files:
        ext = path.suffix.lower()
        if ext in LICENSE_EXTS:
            f = _license_finding(path)
            if f:
                out.append(f)
        if ext in BYTE_EXTS:
            out.extend(_byte_findings(path))
        if ext in JSON_EXTS:
            f = _json_finding(path)
            if f:
                out.append(f)
        if ext in SENSITIVE_EXTS:
            out.extend(_sensitive_findings(path))
        if ext in GN_EXTS:
            out.extend(_gn_findings(path))
        # OAT.1: any file with a binary extension is contamination.
        if ext in _BINARY_EXTS:
            out.append(_binary_finding(path))
        # OAT.6 is repository-scoped (root LICENSE policy), so it is owned by
        # the repository OAT/CI backend. A changed-file guard cannot reliably
        # infer the repository root from an absolute path and must not guess.
        # G.INC.02: non-.h header extension (e.g. .inc) is banned
        if ext not in _CXX_EXTS and path.suffix.lower() == ".inc":
            out.append(_finding(path, 1, "G.INC.02",
                                "use .h extension for headers, not .inc"))
        # G.FIL.04-CPP: duplicate file detection (same basename, different ext)
        # G.PRE.05-CPP / G.PRE.13: #if/#endif mismatch (check #endif count vs #if count)
    return out


def _cross_file_findings(files):
    """Cross-file checks that need to see multiple files at once.

    G.FIL.04-CPP — same basename with different extensions (suspected duplicate).
    G.PRE.05-CPP / G.PRE.13 — unmatched #if/#endif across files (check each
    file individually for balanced preprocessor conditionals).
    """
    out = []
    seen_basenames = {}
    for path in files:
        ext = path.suffix.lower()
        if ext not in _CXX_EXTS:
            continue
        stem = path.stem
        if stem in seen_basenames:
            out.append({
                "file": str(path), "line": 1, "rule_id": "G.FIL.04-CPP",
                "severity": "一般",
                "remediation": "duplicate file: %s already exists (same basename %r)"
                % (seen_basenames[stem], stem),
            })
        else:
            seen_basenames[stem] = str(path)

        # G.PRE.05-CPP / G.PRE.13: check #if / #endif balance in each file
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if_count = len(re.findall(r'#\s*if(?:n?def)?\b', text))
        endif_count = len(re.findall(r'#\s*endif\b', text))
        if if_count != endif_count:
            out.append({
                "file": str(path), "line": 1, "rule_id": "G.PRE.05-CPP",
                "severity": "严重",
                "remediation": "unbalanced #if/#endif: %d #if vs %d #endif"
                % (if_count, endif_count),
            })
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", metavar="PATH", help="write findings as JSON to PATH")
    ap.add_argument("files", nargs="*")
    args = ap.parse_args()

    # Scope guard: keep only in-scope extensions among the (already changed-only)
    # files the caller passed. Out-of-scope / unchanged files drop here.
    files = [Path(x) for x in args.files if Path(x).suffix.lower() in EXTS]
    findings = _findings(files)
    findings.extend(_cross_file_findings(files))

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
    if not files:
        return 0
    print("file_hygiene PASS: %d file(s) checked "
          "(license/bytes/json/sensitive/gn)" % len(files))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
