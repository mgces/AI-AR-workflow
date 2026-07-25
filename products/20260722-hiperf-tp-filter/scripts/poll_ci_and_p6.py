#!/usr/bin/env python3
"""Poll PR #1062 CI until green on current HEAD, then run P6 gate."""
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

OHOS_ROOT = os.environ.get("OHOS_ROOT", "/home/lyk/ohos/openharmony")
PDIR = f"{OHOS_ROOT}/specs/pipeline/20260722-hiperf-tp-filter"
CI_SCRIPT = f"{OHOS_ROOT}/.cursor/skills/ohos-ci-openharmony-ci-analysis/scripts/openharmony_ci.py"
P6_SCRIPT = f"{PDIR}/scripts/p6_upload.sh"
GDIR = f"{OHOS_ROOT}/developtools/hiperf"
LOG = f"{PDIR}/evidence/poll_ci_p6.log"
STALE_EVENT = "6a62cfd664650f998b91a786"
MAX_POLLS = 120
INTERVAL = 60
OK = {"success", "passed"}


def log(msg):
    line = msg if msg.endswith("\n") else msg + "\n"
    sys.stdout.write(line)
    sys.stdout.flush()
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line)


def run(cmd, **kw):
    env = os.environ.copy()
    env.setdefault("LIFECYCLE_SECRET_ROOT", os.path.expanduser("~/.claude/.lifecycle-secret"))
    env["PATH"] = f"{OHOS_ROOT}/prebuilts/clang/ohos/linux-x86_64/llvm/bin:" + env.get("PATH", "")
    return subprocess.run(cmd, env=env, text=True, capture_output=True, **kw)


def expected_head():
    r = run(["git", "-C", GDIR, "rev-parse", "HEAD"])
    return r.stdout.strip()


def pr_head():
    r = run(["oh-gc", "pr", "view", "1062", "--repo", "openharmony/developtools_hiperf", "--json"])
    if r.returncode != 0:
        return ""
    return json.loads(r.stdout).get("head", {}).get("sha", "")


def ci_status():
    r = run(["python3", CI_SCRIPT, "--pr", "1062", "--repo", "openharmony/developtools_hiperf", "--json"])
    if r.returncode != 0 or not r.stdout.strip():
        return {}
    return json.loads(r.stdout)


def main():
    head = expected_head()
    log(f"=== CI poll start {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} expected_head={head[:12]} ===")
    for i in range(1, MAX_POLLS + 1):
        d = ci_status()
        event = d.get("event_id", "")
        overall = d.get("overall_result", "")
        ts = d.get("timestamp", "")
        end_ts = d.get("end_timestamp", "")
        ph = pr_head()
        log(f"[poll {i}/{datetime.now(timezone.utc).strftime('%H:%M:%S')}] event={event} overall={overall} ts={ts} end={end_ts} pr_head={ph[:12] if ph else ''}")

        if event == STALE_EVENT or not event:
            time.sleep(INTERVAL)
            continue
        if overall not in OK and (not end_ts or overall in ("running", "pending", "")):
            time.sleep(INTERVAL)
            continue
        if overall in OK:
            if not ph.startswith(head[:12]):
                log(f"WARN: CI green but pr_head={ph[:12]} != expected {head[:12]}; waiting...")
                time.sleep(INTERVAL)
                continue
            log(f"=== CI GREEN event={event} — running P6 {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} ===")
            r = run(["bash", P6_SCRIPT, "825"])
            sys.stdout.write(r.stdout)
            sys.stderr.write(r.stderr)
            if r.returncode != 0:
                log(f"P6 FAIL rc={r.returncode}")
                sys.exit(r.returncode)
            log(f"=== P6 COMPLETE {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')} ===")
            return
        if overall == "failed":
            log(f"=== CI FAILED on event {event} — stopping ===")
            with open(f"{PDIR}/evidence/phase6/ci_poll_failed.json", "w", encoding="utf-8") as f:
                json.dump(d, f, indent=2)
            sys.exit(1)
        time.sleep(INTERVAL)
    log(f"=== CI poll timeout after {MAX_POLLS} attempts ===")
    sys.exit(2)


if __name__ == "__main__":
    main()
