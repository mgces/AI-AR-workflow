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
    (5, "integration"),
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
# code fingerprint — identifies the exact code state a phase was validated
# against (component repo HEAD + full working-tree diff). If it changes, every
# downstream phase's evidence is stale and the pipeline must rewalk from P1.
# ----------------------------------------------------------------------------
def resolve_git_dir(state):
    repo = state["repo"]
    g = state.get("git_dir", repo) or repo
    return g if os.path.isabs(g) else os.path.join(repo, g)


def code_fingerprint(state):
    import subprocess
    gdir = resolve_git_dir(state)
    head = subprocess.run(["git", "-C", gdir, "rev-parse", "HEAD"],
                          text=True, capture_output=True).stdout.strip()
    diff = subprocess.run(["git", "-C", gdir, "diff", "HEAD"],
                          text=True, capture_output=True).stdout
    h = hashlib.sha256()
    h.update(head.encode("utf-8"))
    h.update(b"\0")
    h.update(diff.encode("utf-8", "replace"))
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
# manifest emission (gates call this) + reading (advance.py calls this)
# ----------------------------------------------------------------------------
def emit(pdir, phase, gate, *, verdict, reason, cmd="", argv=None,
         exit_code=None, nonce=None, artifacts_rel=None):
    """Append one signed evidence record. Returns the entry. verdict in PASS|FAIL."""
    state = load_state(pdir)
    run_id = state["run_id"]
    secret = load_secret(run_id)
    entry = {
        "ts_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
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
def validate_closing_entry(pdir, phase):
    """Return (ok, reason, entry). A phase may close iff its last manifest entry
    is PASS, the HMAC verifies, and every recorded artifact still hashes equal."""
    state = load_state(pdir)
    secret = load_secret(state["run_id"])
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
