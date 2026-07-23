#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gatelib.py — shared core for the OHOS lifecycle pipeline.

This module is the trust anchor of the whole system. Gate scripts use it to
emit HMAC-signed evidence records; advance.py uses it to verify them. The model
never imports or bypasses this — it can only *run* the gate scripts, and a phase
only closes when advance.py validates a signed record this module produced.

Design invariants:
  * Every PASS is a signed manifest line carrying the sha256 of every artifact.
  * The per-run secret lives outside the pipeline dir (mode 600) so a record
    cannot be forged by editing files inside specs/pipeline/.
  * Host wall-clock (correct) is used for ts_utc; device RTC (wrong) is never
    trusted — device freshness comes from nonces + /proc/uptime in the gates.
"""
import argparse
import hashlib
import hmac
import json
import os
import re
import sys
import time

PHASES = [
    (0, "bootstrap"),
    (1, "develop"),
    (2, "build-verify"),
    (3, "test-author"),
    (4, "device-functional"),
    (5, "quality-verify"),
    (6, "upload-review"),
]
PHASE_NAME = {i: n for i, n in PHASES}
MAX_PHASE = max(i for i, _ in PHASES)

def _installed_skills_root():
    """Return the active skills root from configuration or this file's path."""
    configured = os.environ.get("AGENT_SKILLS_DIR")
    if configured:
        return os.path.abspath(os.path.expanduser(configured))
    # This file is <skills>/ohos-ar-dev-phases/scripts/lib/gatelib.py.
    return os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.abspath(__file__)))))


def _default_secret_root():
    """Keep per-run secrets beside the active Agent installation.

    A source checkout keeps the historic Claude location so existing runs keep
    working. An installed copy derives its Agent home from <home>/.*/skills.
    """
    explicit = os.environ.get("LIFECYCLE_SECRET_ROOT")
    if explicit:
        return os.path.abspath(os.path.expanduser(explicit))

    configured_home = os.environ.get("AGENT_HOME")
    if configured_home:
        return os.path.join(os.path.abspath(os.path.expanduser(configured_home)),
                            ".lifecycle-secret")

    skills_root = _installed_skills_root()
    agent_home = os.path.dirname(skills_root)
    source_checkout = os.path.isdir(os.path.join(agent_home, ".git"))
    if not source_checkout:
        return os.path.join(agent_home, ".lifecycle-secret")

    # Backwards-compatible default for scripts run directly from this checkout.
    return os.path.expanduser("~/.claude/.lifecycle-secret")


SECRET_ROOT = _default_secret_root()


# ----------------------------------------------------------------------------
# dependency-skill resolution (works both in an Agent install and inside a
# self-contained bundle where sibling skills sit next to this one)
# ----------------------------------------------------------------------------
def resolve_dep(rel_subpath, env_var=None):
    """Locate a file inside a sibling dependency skill.
    Order: $env_var override -> sibling of this skills root -> configured
    Agent skills directory -> legacy ~/.claude/skills.
    Returns the first existing path, else the sibling guess (caller may warn)."""
    if env_var and os.environ.get(env_var):
        return os.environ[env_var]
    # this file: <SKILLS>/ohos-ar-dev-phases/scripts/lib/gatelib.py
    skills_root = os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.abspath(__file__)))))
    sibling = os.path.join(skills_root, rel_subpath)
    if os.path.exists(sibling):
        return sibling
    configured_root = os.environ.get("AGENT_SKILLS_DIR")
    if configured_root:
        installed = os.path.join(os.path.expanduser(configured_root), rel_subpath)
        if os.path.exists(installed):
            return installed
    legacy = os.path.expanduser(os.path.join("~/.claude/skills", rel_subpath))
    if os.path.exists(legacy):
        return legacy
    return sibling


# ----------------------------------------------------------------------------
# paths
# ----------------------------------------------------------------------------
def pipeline_dir(arg=None):
    d = arg or os.environ.get("PIPELINE_DIR")
    if not d:
        sys.exit("ERROR: --pipeline-dir not given and PIPELINE_DIR unset")
    return os.path.abspath(d)


def state_path(pdir):
    return os.path.join(pdir, "pipeline.json")


def manifest_path(pdir):
    return os.path.join(pdir, "evidence", "manifest.jsonl")


def evidence_dir(pdir, phase):
    d = os.path.join(pdir, "evidence", "phase%d" % phase)
    os.makedirs(d, exist_ok=True)
    return d


def secret_path(run_id):
    return os.path.join(SECRET_ROOT, run_id)


# ----------------------------------------------------------------------------
# state (pipeline.json) — read freely; only advance.py mutates phase status
# ----------------------------------------------------------------------------
def load_state(pdir):
    with open(state_path(pdir), "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(pdir, state):
    tmp = state_path(pdir) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)
    os.replace(tmp, state_path(pdir))


# ----------------------------------------------------------------------------
# secret + hmac
# ----------------------------------------------------------------------------
def load_secret(run_id):
    p = secret_path(run_id)
    if not os.path.exists(p):
        sys.exit("ERROR: per-run secret missing (%s); run gate_env_init.py first" % p)
    with open(p, "rb") as f:
        return f.read()


def create_secret(run_id):
    os.makedirs(SECRET_ROOT, exist_ok=True)
    os.chmod(SECRET_ROOT, 0o700)
    p = secret_path(run_id)
    if not os.path.exists(p):
        secret = os.urandom(32)
        fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(secret)
    return p


def _canonical(entry):
    """Stable bytes for signing: entry minus the hmac field, sorted keys."""
    e = {k: v for k, v in entry.items() if k != "hmac"}
    return json.dumps(e, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sign(entry, secret):
    return hmac.new(secret, _canonical(entry), hashlib.sha256).hexdigest()


def verify_sig(entry, secret):
    expected = sign(entry, secret)
    return hmac.compare_digest(expected, entry.get("hmac", ""))


# ----------------------------------------------------------------------------
# code fingerprint — identifies the exact code CONTENT a phase was validated
# against, measured relative to base_commit so it is COMMIT-INDEPENDENT.
# We enumerate every path that differs from base (committed base..HEAD changes,
# unstaged/ staged working-tree changes, and untracked files) and hash each
# path's CURRENT on-disk bytes (or a DELETED marker). Those bytes are identical
# whether a change is left in the working tree or committed — so `git commit -s`
# at P6 (needed to push) does NOT look like code drift. Only a real content
# change since P1 flips the fingerprint and forces a rewalk from P1.
#
# (Hashing on-disk content rather than `git diff` text is deliberate: the diff
# for a NEW file renders differently when it is untracked vs committed, which
# would make the fingerprint commit-dependent. Content bytes do not.)
# ----------------------------------------------------------------------------
def resolve_git_dir(state):
    repo = state["repo"]
    g = state.get("git_dir", repo) or repo
    return g if os.path.isabs(g) else os.path.join(repo, g)


def _changed_paths(state):
    """Sorted, deduped set of paths that differ from base_commit: tracked changes
    (base..HEAD + working tree) plus untracked files. Membership is commit-state
    independent (union of diff + ls-files --others)."""
    import subprocess
    gdir = resolve_git_dir(state)
    base = state.get("base_commit") or "HEAD"
    changed = subprocess.run(["git", "-C", gdir, "diff", "--name-only", base],
                             text=True, capture_output=True).stdout.splitlines()
    untracked = subprocess.run(["git", "-C", gdir, "ls-files", "--others", "--exclude-standard"],
                               text=True, capture_output=True).stdout.splitlines()
    return sorted({p for p in (changed + untracked) if p})


def _hash_paths(gdir, base, paths):
    """Content fingerprint of the given path set: base tag + each path's name and
    CURRENT on-disk bytes (or a DELETED marker). Order-independent because paths
    are pre-sorted by callers."""
    h = hashlib.sha256()
    h.update(base.encode("utf-8"))
    h.update(b"\0PATHS\0")
    for rel in paths:
        h.update(rel.encode("utf-8", "surrogateescape"))
        h.update(b"\0")
        ap = os.path.join(gdir, rel)
        if not os.path.isfile(ap):
            h.update(b"\0DELETED\0")
            continue
        with open(ap, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        h.update(b"\0")
    return h.hexdigest()


def code_fingerprint(state):
    """Full-tree fingerprint (all changed+untracked paths). Kept for backward
    compatibility with runs locked before fingerprint layering existed."""
    gdir = resolve_git_dir(state)
    base = state.get("base_commit") or "HEAD"
    return _hash_paths(gdir, base, _changed_paths(state))


# ----------------------------------------------------------------------------
# fingerprint LAYERING — separate functional code from test additions.
#
# P1 locks the FUNCTIONAL fingerprint (non-test paths only). Later phases must
# keep it equal (any edit to functional code/config is drift -> rewalk). Test
# files are added in P3 and must NOT trip that check — but the only NEW paths
# allowed after P1 are test files. Together these express: "only independent
# test files may be added; functional code/config must not change."
#
# Path classification is by PATH (OHOS unit-test BUILD.gn lives under the
# component's test/ dir, so a test/ BUILD.gn is a test file, not functional).
# ----------------------------------------------------------------------------
_TEST_DIR_MARKERS = ("/test/", "/tests/", "/unittest/", "/moduletest/",
                     "/fuzztest/", "/systemtest/")
_TEST_NAME_RE = re.compile(
    r"(?:^|/)(?:test_[^/]+|[^/]*_?test|[^/]*fuzz[^/]*)\.(?:c|cc|cpp|cxx|h|hpp)$",
    re.IGNORECASE)


def classify_path(rel):
    """Return "test" for independent test files/dirs, else "code". By path so a
    test/ BUILD.gn counts as test but a functional-dir BUILD.gn counts as code."""
    p = rel.replace("\\", "/")
    low = p.lower()
    if low.startswith("test/") or any(m in ("/" + low) for m in _TEST_DIR_MARKERS):
        return "test"
    if _TEST_NAME_RE.search(p):
        return "test"
    return "code"


def split_paths(paths):
    """Partition paths into (code_paths, test_paths), both sorted."""
    code, test = [], []
    for p in paths:
        (test if classify_path(p) == "test" else code).append(p)
    return sorted(code), sorted(test)


def functional_fingerprint(state):
    """Content fingerprint of ONLY the non-test (functional) changed paths."""
    gdir = resolve_git_dir(state)
    base = state.get("base_commit") or "HEAD"
    code_paths, _ = split_paths(_changed_paths(state))
    return _hash_paths(gdir, base, code_paths)


def test_path_set(state):
    """Sorted list of changed test paths (membership only, not content)."""
    _, test_paths = split_paths(_changed_paths(state))
    return test_paths


# ----------------------------------------------------------------------------
# hashing
# ----------------------------------------------------------------------------
def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def hash_artifacts(pdir, rel_paths):
    out = []
    for rel in rel_paths:
        ap = os.path.join(pdir, rel)
        if not os.path.exists(ap):
            sys.exit("ERROR: evidence artifact missing: %s" % rel)
        out.append({"path": rel, "sha256": sha256_file(ap)})
    return out


# ----------------------------------------------------------------------------
# review-report verdict — a code-review report only clears a gate when it
# carries a MACHINE-READABLE zero-issue count. This is how the pipeline accepts
# a model-authored review without trusting free-text prose: the model writes the
# report, but the gate PASSes only on an explicit count of 0. Shared by P5
# (gate_integration) and P6 (gate_upload_ci).
# ----------------------------------------------------------------------------
def parse_review_report_zero_issues(path):
    """Accept either JSON with an explicit zero issue count, or text containing a
    review_issue_count=<n> marker. Reports without a machine-readable count fail.
    Returns (ok, detail)."""
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    if path.endswith(".json"):
        try:
            data = json.loads(text)
        except Exception as exc:
            return False, "invalid json: %s" % exc
        # Check EVERY known count/list marker present, not just the first: a
        # report with issue_count=0 but blockers=[...] must still FAIL. Any
        # non-zero marker fails closed.
        counts = []
        found_any = False
        for key in ("issue_count", "finding_count", "problem_count", "blocker_count"):
            if key in data:
                found_any = True
                try:
                    count = int(data[key])
                except Exception:
                    return False, "%s is not an integer" % key
                counts.append((key, count))
        for key in ("issues", "findings", "problems", "blockers"):
            if key in data and isinstance(data[key], list):
                found_any = True
                counts.append((key, len(data[key])))
        if not found_any:
            return False, "json lacks issue_count/finding_count/problems/findings markers"
        total = sum(c for _, c in counts)
        detail = " ".join("%s=%d" % (k, c) for k, c in counts)
        return total == 0, detail
    marker = "review_issue_count="
    for line in text.splitlines():
        if line.strip().startswith(marker):
            try:
                count = int(line.strip()[len(marker):].split()[0])
            except Exception:
                return False, "review_issue_count is not an integer"
            return count == 0, "review_issue_count=%d" % count
    return False, "missing review_issue_count=<n> marker"


# ----------------------------------------------------------------------------
# AR_design.md section check — P1a design gate. The design doc must fix, BEFORE
# any code is written, the full plan a deterministic gate can verify by section
# presence (headings) + non-empty body. The "complete code framework" section
# must additionally cover file-list / per-file-role / per-file-skeleton anchors.
# ----------------------------------------------------------------------------
# Each required section: (name, [heading keyword regexes], [nested anchor regexes]).
REQUIRED_DESIGN_SECTIONS = (
    ("目标组件", [r"目标组件", r"target\s+component"], []),
    ("详细功能需求", [r"功能需求", r"functional\s+requirement"], []),
    ("完整代码框架",
     [r"代码框架", r"code\s+framework"],
     [r"文件清单|文件列表|file\s+list", r"每(个)?文件.*功能|文件.*功能|per-file",
      r"代码框架|骨架|skeleton"]),
    ("完整测试框架", [r"测试框架", r"test\s+framework"], []),
    ("需测试的功能点", [r"测试.*功能点|需测试|功能点|test\s+points?"], []),
    ("真机测试用例构造", [r"真机.*用例|用例.*构造|真机测试|device.*test\s*case"], []),
)


def _split_md_sections(text):
    """Return list of (heading_line, body_text) for every markdown heading. A
    section's body spans until the next heading of EQUAL-OR-HIGHER level, so a
    parent section (e.g. `## X`) includes its nested `### Y` subsections in its
    body — anchor checks can then see sub-headings written under a parent."""
    lines = text.splitlines()
    heads = []  # (index, level, line)
    for i, ln in enumerate(lines):
        m = re.match(r"^\s*(#{1,6})\s+\S", ln)
        if m:
            heads.append((i, len(m.group(1)), ln))
    sections = []
    for hi, (idx, level, line) in enumerate(heads):
        end = len(lines)
        for j in range(hi + 1, len(heads)):
            if heads[j][1] <= level:
                end = heads[j][0]
                break
        body = "\n".join(lines[idx + 1:end])
        sections.append((line, body))
    return sections


def check_design_sections(text):
    """Return (ok, per_section, missing). per_section: list of (name, present,
    detail). A section is present iff a heading matches one of its keywords AND
    its body has >=1 non-empty line AND all nested anchors (if any) appear in the
    body. missing: names that failed."""
    sections = _split_md_sections(text)
    per_section = []
    missing = []
    for name, kw_res, anchor_res in REQUIRED_DESIGN_SECTIONS:
        hit_body = None
        for head, body in sections:
            if any(re.search(k, head, re.IGNORECASE) for k in kw_res):
                hit_body = body
                break
        if hit_body is None:
            per_section.append((name, False, "heading not found"))
            missing.append(name)
            continue
        if not any(l.strip() for l in hit_body.splitlines()):
            per_section.append((name, False, "empty body"))
            missing.append(name)
            continue
        anchor_miss = [a for a in anchor_res if not re.search(a, hit_body, re.IGNORECASE)]
        if anchor_miss:
            per_section.append((name, False, "missing sub-anchors: %d" % len(anchor_miss)))
            missing.append(name)
            continue
        per_section.append((name, True, "ok"))
    return (not missing), per_section, missing


def latest_design_entry(pdir):
    """Return the last PASS manifest entry from gate_design.py, or None."""
    hits = [e for e in read_manifest(pdir)
            if e.get("gate") == "gate_design.py" and e.get("verdict") == "PASS"]
    return hits[-1] if hits else None


# ----------------------------------------------------------------------------
# AR machine-readable contract — the ```ar-contract``` fenced JSON block inside
# AR_design.md. It is the SINGLE source of truth downstream gates verify against:
#   * build_artifacts — files P2 must confirm the build actually produced;
#   * test_cases[].gtest — GTest "Suite.Case" ids P3 must confirm PASSED;
#   * device_cases[].marker — hilog markers P4 must confirm appeared on device.
# gate_design.py validates+signs it (its bytes ride inside the HMAC-signed
# AR_design.md evidence), so every downstream check is bound to the reviewed
# design. This is how "all designed files compiled / all test points covered /
# all device cases ran" becomes a deterministic, tamper-evident gate.
# ----------------------------------------------------------------------------
# Exactly one fenced block, opened by ```ar-contract (case-insensitive), whose
# body is a JSON object. More than one block is rejected (decoy-block defence).
_AR_CONTRACT_FENCE_RE = re.compile(
    r"```[ \t]*ar-contract[ \t]*\r?\n(.*?)\r?\n[ \t]*```",
    re.DOTALL | re.IGNORECASE)
# Suite.Case, allowing '/' in either half for GTest typed/value-parameterized
# names (e.g. FooTest/0.Bar, Foo.Bar/2).
_GTEST_ID_RE = re.compile(r"^[A-Za-z_][\w/]*\.[A-Za-z_][\w/]*$")


def _nonempty_str(v):
    return isinstance(v, str) and bool(v.strip())


def parse_ar_contract(text):
    """Parse+validate the ```ar-contract``` JSON block. Fail-closed like
    parse_review_report_zero_issues. Returns (ok, contract, detail).

    Schema (all three arrays non-empty):
      build_artifacts : [non-empty str]
      test_cases      : [{point: non-empty str, gtest: "Suite.Case"}]
      device_cases    : [{desc: non-empty str, marker: non-empty str}]
    """
    blocks = _AR_CONTRACT_FENCE_RE.findall(text or "")
    if not blocks:
        return False, None, "missing ```ar-contract``` block"
    if len(blocks) > 1:
        return False, None, "multiple ```ar-contract``` blocks (exactly one required)"
    try:
        data = json.loads(blocks[0])
    except Exception as exc:
        return False, None, "invalid json in ar-contract: %s" % exc
    if not isinstance(data, dict):
        return False, None, "ar-contract must be a json object"

    ba = data.get("build_artifacts")
    if not isinstance(ba, list) or not ba:
        return False, None, "build_artifacts must be a non-empty array"
    for i, p in enumerate(ba):
        if not _nonempty_str(p):
            return False, None, "build_artifacts[%d] must be a non-empty string" % i

    tc = data.get("test_cases")
    if not isinstance(tc, list) or not tc:
        return False, None, "test_cases must be a non-empty array"
    for i, c in enumerate(tc):
        if not isinstance(c, dict):
            return False, None, "test_cases[%d] must be an object" % i
        if not _nonempty_str(c.get("point")):
            return False, None, "test_cases[%d].point must be a non-empty string" % i
        g = c.get("gtest")
        if not _nonempty_str(g) or not _GTEST_ID_RE.match(g.strip()):
            return False, None, "test_cases[%d].gtest must be a 'Suite.Case' id" % i

    dc = data.get("device_cases")
    if not isinstance(dc, list) or not dc:
        return False, None, "device_cases must be a non-empty array"
    for i, c in enumerate(dc):
        if not isinstance(c, dict):
            return False, None, "device_cases[%d] must be an object" % i
        if not _nonempty_str(c.get("desc")):
            return False, None, "device_cases[%d].desc must be a non-empty string" % i
        if not _nonempty_str(c.get("marker")):
            return False, None, "device_cases[%d].marker must be a non-empty string" % i

    detail = "build_artifacts=%d test_cases=%d device_cases=%d" % (
        len(ba), len(tc), len(dc))
    return True, {"build_artifacts": ba, "test_cases": tc, "device_cases": dc}, detail


def load_signed_contract(pdir):
    """Recover the ar-contract from the HMAC-SIGNED AR_design evidence — the only
    tamper-proof source. Returns (ok, contract, detail).

    States a caller must distinguish:
      * ok=True                     -> enforce full coverage against `contract`;
      * ok=False, "no signed ..."   -> ABSENT (legacy/bypass run) -> skip coverage;
      * ok=False, "tampered"/other  -> a design entry exists but its evidence or
                                       contract is broken -> the caller must FAIL.
    """
    entry = latest_design_entry(pdir)
    if entry is None:
        return False, None, "no signed AR_design (contract absent)"
    secret = load_secret(load_state(pdir)["run_id"])
    if not verify_sig(entry, secret):
        return False, None, "AR_design evidence HMAC mismatch (tampered)"
    design_text = None
    for art in entry.get("artifacts", []):
        ap = os.path.join(pdir, art["path"])
        if not os.path.exists(ap):
            return False, None, "AR_design evidence artifact vanished: %s (tampered)" % art["path"]
        if sha256_file(ap) != art["sha256"]:
            return False, None, "AR_design evidence altered: %s (tampered)" % art["path"]
        if art["path"].replace("\\", "/").endswith("evidence/phase1/AR_design.md"):
            with open(ap, "r", encoding="utf-8", errors="replace") as f:
                design_text = f.read()
    if design_text is None:
        return False, None, "signed AR_design.md artifact not found in design entry (tampered)"
    ok, contract, detail = parse_ar_contract(design_text)
    if not ok:
        # A signed design that legitimately carried no contract (legacy bypass at
        # gate_design) is ABSENT, not tampered — surface it as such.
        if detail.startswith("missing"):
            return False, None, "no ar-contract in signed AR_design (contract absent)"
        return False, None, "signed AR_design contract invalid: %s (tampered)" % detail
    return True, contract, detail


# ----------------------------------------------------------------------------
# manifest emission (gates call this) + reading (advance.py calls this)
# ----------------------------------------------------------------------------
def emit(pdir, phase, gate, *, verdict, reason, cmd="", argv=None,
         exit_code=None, nonce=None, artifacts_rel=None):
    """Append one signed evidence record. Returns the entry. verdict in PASS|FAIL.

    Records form a HASH CHAIN: each entry carries `seq` (its position) and `prev`
    (the immediately-preceding entry's hmac), both inside the signed bytes. This
    defeats REPLAY — appending a historically-valid PASS record no longer closes
    a phase, because its `prev`/`seq` will not match the real tail of the chain,
    and re-signing it is impossible without the per-run secret."""
    state = load_state(pdir)
    run_id = state["run_id"]
    secret = load_secret(run_id)
    existing = read_manifest(pdir)
    seq = len(existing)
    prev = existing[-1].get("hmac", "") if existing else ""
    entry = {
        "ts_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "seq": seq,
        "prev": prev,
        "phase": phase,
        "gate": gate,
        "cmd": cmd,
        "argv": argv or [],
        "exit_code": exit_code,
        "nonce": nonce,
        "artifacts": hash_artifacts(pdir, artifacts_rel or []),
        "verdict": verdict,
        "reason": reason,
    }
    entry["hmac"] = sign(entry, secret)
    os.makedirs(os.path.dirname(manifest_path(pdir)), exist_ok=True)
    with open(manifest_path(pdir), "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return entry


def read_manifest(pdir):
    p = manifest_path(pdir)
    if not os.path.exists(p):
        return []
    out = []
    with open(p, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def last_entry_for_phase(pdir, phase):
    entries = [e for e in read_manifest(pdir) if e.get("phase") == phase]
    return entries[-1] if entries else None


def entry_id(entry):
    """Stable id of a manifest entry (hash of its canonical signed bytes)."""
    return hashlib.sha256(_canonical(entry)).hexdigest()


# ----------------------------------------------------------------------------
# validation used by advance.py (the anti-fabrication checks)
# ----------------------------------------------------------------------------
def verify_chain(pdir):
    """Walk the whole manifest and verify the hash chain.

    Returns (ok, reason, entries). Each entry must (a) HMAC-verify, (b) carry the
    correct `seq` (its 0-based index), and (c) carry `prev` == the previous
    entry's hmac ("" for the first). A REPLAYED historical record breaks this:
    its `prev`/`seq` point at an earlier position, so re-appending it at the tail
    fails the chain — and it cannot be re-signed without the per-run secret.

    Backward compatibility: a manifest whose entries predate the chain (no `seq`
    field at all) is treated as legacy and only per-entry HMAC is checked. As
    soon as ANY entry has `seq`, every entry from the first chained one onward
    must chain correctly.
    """
    secret = load_secret(load_state(pdir)["run_id"])
    entries = read_manifest(pdir)
    chained = any("seq" in e for e in entries)
    prev_hmac = ""
    for i, e in enumerate(entries):
        if not verify_sig(e, secret):
            return False, "HMAC mismatch at manifest line %d (tampered/forged/replayed)" % i, entries
        if chained and "seq" in e:
            if e.get("seq") != i:
                return False, ("manifest chain break at line %d: seq=%s expected %d "
                               "(record reordered or replayed)" % (i, e.get("seq"), i)), entries
            if e.get("prev", "") != prev_hmac:
                return False, ("manifest chain break at line %d: prev hmac mismatch "
                               "(record replayed or a record was removed)" % i), entries
        prev_hmac = e.get("hmac", "")
    return True, "chain ok (%d entries%s)" % (len(entries), "" if chained else ", legacy-unchained"), entries


def validate_closing_entry(pdir, phase):
    """Return (ok, reason, entry). A phase may close iff the manifest hash chain
    is intact, its last entry for this phase is PASS, that entry's HMAC verifies,
    and every recorded artifact still hashes equal.

    The chain check is what defeats replay: re-appending a historically-valid
    PASS record (even with its artifact restored) breaks `seq`/`prev` continuity
    and is rejected here before the per-phase PASS is ever trusted."""
    state = load_state(pdir)
    secret = load_secret(state["run_id"])
    chain_ok, chain_reason, _ = verify_chain(pdir)
    if not chain_ok:
        return False, chain_reason, None
    entry = last_entry_for_phase(pdir, phase)
    if entry is None:
        return False, "no manifest entry for phase %d" % phase, None
    if entry.get("verdict") != "PASS":
        return False, "last phase %d entry verdict=%s" % (phase, entry.get("verdict")), entry
    if not verify_sig(entry, secret):
        return False, "HMAC mismatch on phase %d entry (tampered/forged)" % phase, entry
    for art in entry.get("artifacts", []):
        ap = os.path.join(pdir, art["path"])
        if not os.path.exists(ap):
            return False, "artifact vanished: %s" % art["path"], entry
        if sha256_file(ap) != art["sha256"]:
            return False, "artifact altered (sha256 mismatch): %s" % art["path"], entry
    return True, "ok", entry


# ----------------------------------------------------------------------------
# consent — human sign-off for P4/P5/P6. A consent is only meaningful if it is
# bound to the EXACT signed PASS evidence a reviewer looked at. We therefore
# store consent as an HMAC-signed record whose evidence_ref is the entry_id of
# the phase's current closing PASS entry. advance.py re-derives that entry_id at
# advance time and rejects unless it matches — so:
#   * a phase with no PASS evidence yet cannot be consented (nothing to sign);
#   * re-running a gate (new evidence => new entry_id) invalidates old consent;
#   * hand-editing the consent record in pipeline.json breaks its HMAC.
# The per-run secret is shared, so this does not cryptographically prove a human
# (vs the model) produced it — but it removes "rubber-stamp from thin air" and
# "stale consent reuse", which were the real holes.
# ----------------------------------------------------------------------------
def _consent_canonical(rec):
    """Stable bytes for a consent record, excluding its own hmac."""
    r = {k: v for k, v in rec.items() if k != "hmac"}
    return json.dumps(r, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False).encode("utf-8")


def make_consent_record(run_id, phase, token, evidence_ref):
    """Build an HMAC-signed consent record bound to a specific PASS entry_id."""
    secret = load_secret(run_id)
    rec = {
        "phase": phase,
        "token": token,
        "evidence_ref": evidence_ref,
        "ts_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    rec["hmac"] = hmac.new(secret, _consent_canonical(rec), hashlib.sha256).hexdigest()
    return rec


def verify_consent(state, phase, expected_evidence_ref):
    """Return (ok, reason). Consent for `phase` is valid iff a signed consent
    record exists, its HMAC verifies, and its evidence_ref equals the phase's
    CURRENT closing PASS entry_id (passed in by the caller)."""
    rec = (state.get("consent_tokens", {}) or {}).get(str(phase))
    if not rec:
        return False, "no consent recorded for phase %d" % phase
    if not isinstance(rec, dict):
        return False, ("legacy/unsigned consent for phase %d — re-record it with "
                       "advance.py consent (signed, evidence-bound)" % phase)
    secret = load_secret(state["run_id"])
    expected_sig = hmac.new(secret, _consent_canonical(rec), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, rec.get("hmac", "")):
        return False, "consent HMAC mismatch for phase %d (tampered/forged)" % phase
    if rec.get("evidence_ref") != expected_evidence_ref:
        return False, ("consent for phase %d is stale: bound to evidence %s.. but "
                       "current PASS evidence is %s.. (re-review and re-consent)"
                       % (phase, str(rec.get("evidence_ref"))[:8],
                          str(expected_evidence_ref)[:8]))
    return True, "consent ok (token=%s)" % rec.get("token")


if __name__ == "__main__":
    # tiny CLI for ad-hoc checks: gatelib.py sha <file>
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd")
    s = sub.add_parser("sha"); s.add_argument("file")
    args = ap.parse_args()
    if args.cmd == "sha":
        print(sha256_file(args.file))
    else:
        ap.print_help()
