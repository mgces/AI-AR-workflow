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

SECRET_ROOT = os.path.expanduser("~/.claude/.lifecycle-secret")


# ----------------------------------------------------------------------------
# dependency-skill resolution (works both installed under ~/.claude/skills and
# inside a self-contained bundle where sibling skills sit next to this one)
# ----------------------------------------------------------------------------
def resolve_dep(rel_subpath, env_var=None):
    """Locate a file inside a sibling dependency skill.
    Order: $env_var override -> sibling of this skills root -> ~/.claude/skills.
    Returns the first existing path, else the sibling guess (caller may warn)."""
    if env_var and os.environ.get(env_var):
        return os.environ[env_var]
    # this file: <SKILLS>/ohos-ar-dev-phases/scripts/lib/gatelib.py
    skills_root = os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.dirname(os.path.abspath(__file__)))))
    sibling = os.path.join(skills_root, rel_subpath)
    if os.path.exists(sibling):
        return sibling
    installed = os.path.expanduser(os.path.join("~/.claude/skills", rel_subpath))
    if os.path.exists(installed):
        return installed
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


def code_fingerprint(state):
    import subprocess
    gdir = resolve_git_dir(state)
    base = state.get("base_commit") or "HEAD"
    # Paths that differ from base: tracked changes (base..HEAD + working tree)
    # plus untracked files. Union, deduped, so commit state does not change the
    # membership of this set.
    changed = subprocess.run(["git", "-C", gdir, "diff", "--name-only", base],
                             text=True, capture_output=True).stdout.splitlines()
    untracked = subprocess.run(["git", "-C", gdir, "ls-files", "--others", "--exclude-standard"],
                               text=True, capture_output=True).stdout.splitlines()
    paths = sorted({p for p in (changed + untracked) if p})
    h = hashlib.sha256()
    h.update(base.encode("utf-8"))
    h.update(b"\0PATHS\0")
    for rel in paths:
        h.update(rel.encode("utf-8", "surrogateescape"))
        h.update(b"\0")
        ap = os.path.join(gdir, rel)
        if not os.path.isfile(ap):
            # deleted (or non-regular) since base — content-independent marker
            h.update(b"\0DELETED\0")
            continue
        with open(ap, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        h.update(b"\0")
    return h.hexdigest()


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
