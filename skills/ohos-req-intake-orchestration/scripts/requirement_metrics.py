#!/usr/bin/env python3
"""Requirement workflow observability recorder.

The Requirement workflow does not share the AR P0-P8 state machine, so it
needs a small, self-contained recorder for the same advisory metrics:
per-stage elapsed time, skills actually used, human waiting, and human
intervention categories.  The JSON file never grants a workflow decision and
can be rebuilt or ignored without changing any Requirement artifact.
"""

from __future__ import annotations

import argparse
import calendar
import json
import os
import sys
import time
from pathlib import Path
from typing import Any


WORKFLOW_NAME = "Requirement workflow"
SCHEMA_VERSION = 2
METRICS_ENV = "REQUIREMENT_METRICS_FILE"

# Stable stage IDs used by the Requirement workflow.  Step numbers remain in
# SKILL.md, while these IDs provide a compact and durable aggregation key.
STAGES = (
    ("R1", "requirement-intake"),
    ("R2", "feasibility-analysis"),
    ("R3", "architecture-decision"),
    ("R4", "feature-baseline"),
    ("R5", "review-ready-gate"),
    ("R6", "review-value-decision"),
    ("R7", "ir-proposal-sr"),
    ("R8", "handoff"),
    ("R9", "ar-generation"),
)
STAGE_NAMES = dict(STAGES)
INTERVENTION_CATEGORIES = (
    "required_workflow",  # clarification/decision/review designed into the flow
    "blocked_unplanned",   # a person had to unblock something unexpected
    "user_correction",     # the user corrected intent, input, or expectation
)


def _utc_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _seconds_between(start: str | None, end: str | None) -> int | None:
    try:
        a = calendar.timegm(time.strptime(start, "%Y-%m-%dT%H:%M:%SZ"))
        b = calendar.timegm(time.strptime(end, "%Y-%m-%dT%H:%M:%SZ"))
        return max(0, int(b - a))
    except (TypeError, ValueError, OverflowError):
        return None


def _metrics_path(args: argparse.Namespace) -> Path:
    value = getattr(args, "metrics_override", None) or getattr(args, "metrics", None)
    value = value or os.environ.get(METRICS_ENV)
    if not value:
        raise ValueError(
            "metrics path is required; pass --metrics <docs_dir/workflow_metrics.json> "
            f"or set {METRICS_ENV}"
        )
    return Path(value).expanduser().resolve()


def _phase(value: str) -> str:
    phase = str(value).strip().upper()
    if phase not in STAGE_NAMES:
        raise ValueError(
            "unknown Requirement stage %r; expected one of %s"
            % (value, ", ".join(STAGE_NAMES))
        )
    return phase


def _empty_stage(phase: str) -> dict[str, Any]:
    return {
        "name": STAGE_NAMES[phase],
        "opened_at_utc": None,
        "closed_at_utc": None,
        "elapsed_seconds": None,
        "human_wait_excluded_seconds": 0,
        "effective_elapsed_seconds": None,
        "runs": [],
        "skills_used": [],
        "attempts": 0,
        "last_result": None,
        "last_action": None,
        "last_result_at_utc": None,
    }


def _excluded_wait_seconds(waits: list[dict[str, Any]], phase: str, now: str) -> int:
    """Return the union of excluded waits for one stage (no double count)."""
    ranges: list[tuple[int, int]] = []
    for wait in waits:
        if str(wait.get("phase")) != str(phase) or not wait.get(
            "exclude_from_effective_time", True
        ):
            continue
        start = _seconds_since_epoch(wait.get("started_at_utc"))
        end = _seconds_since_epoch(wait.get("ended_at_utc") or now)
        if start is None or end is None:
            continue
        ranges.append((start, max(start, end)))

    merged: list[list[int]] = []
    for start, end in sorted(ranges):
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return sum(end - start for start, end in merged)


def _seconds_since_epoch(value: str | None) -> int | None:
    try:
        return calendar.timegm(time.strptime(value, "%Y-%m-%dT%H:%M:%SZ"))
    except (TypeError, ValueError, OverflowError):
        return None


def _refresh_totals(data: dict[str, Any]) -> dict[str, Any]:
    now = _utc_now()
    phases = data.setdefault("phases", {})
    waits = data.get("human_wait_intervals") or []
    for phase, item in phases.items():
        item.setdefault("skills_used", [])
        runs = item.get("runs") or []
        if runs:
            elapsed_values = [
                _seconds_between(run.get("opened_at_utc"), run.get("closed_at_utc") or now)
                for run in runs
            ]
            item["elapsed_seconds"] = sum(
                value for value in elapsed_values if value is not None
            )
        else:
            item["elapsed_seconds"] = _seconds_between(
                item.get("opened_at_utc"), item.get("closed_at_utc") or now
            )
        excluded = _excluded_wait_seconds(waits, phase, now)
        wall = item.get("elapsed_seconds")
        item["human_wait_excluded_seconds"] = min(excluded, wall) if wall is not None else excluded
        item["effective_elapsed_seconds"] = (
            max(0, wall - item["human_wait_excluded_seconds"])
            if wall is not None
            else None
        )

    interventions = data.get("human_interventions") or []
    by_category = {key: 0 for key in INTERVENTION_CATEGORIES}
    for event in interventions:
        category = event.get("category")
        if category in by_category:
            by_category[category] += 1

    data["summary"] = {
        "phase_wall_elapsed_seconds": {
            phase: item.get("elapsed_seconds") for phase, item in phases.items()
        },
        "phase_human_wait_excluded_seconds": {
            phase: item.get("human_wait_excluded_seconds") for phase, item in phases.items()
        },
        "phase_effective_elapsed_seconds": {
            phase: item.get("effective_elapsed_seconds") for phase, item in phases.items()
        },
        "workflow_wall_elapsed_seconds": sum(
            item.get("elapsed_seconds") or 0 for item in phases.values()
        ),
        "workflow_human_wait_excluded_seconds": sum(
            item.get("human_wait_excluded_seconds") or 0 for item in phases.values()
        ),
        "workflow_effective_elapsed_seconds": sum(
            item.get("effective_elapsed_seconds") or 0 for item in phases.values()
        ),
        "human_interventions_total": len(interventions),
        "human_interventions_by_category": by_category,
        "human_wait_intervals_total": len(waits),
        "human_wait_open_count": sum(1 for wait in waits if not wait.get("ended_at_utc")),
        "stage_attempts_total": sum(int(item.get("attempts", 0)) for item in phases.values()),
    }
    data["updated_at_utc"] = now
    return data


def _ordered_data(data: dict[str, Any]) -> dict[str, Any]:
    """Keep execution context first, matching the AR workflow file shape."""
    return {
        "execution_context": data.get("execution_context") or {},
        "workflow": data.get("workflow") or WORKFLOW_NAME,
        "schema_version": SCHEMA_VERSION,
        "run_id": data.get("run_id"),
        "started_at_utc": data.get("started_at_utc"),
        "completed_at_utc": data.get("completed_at_utc"),
        "result": data.get("result") or "running",
        "updated_at_utc": data.get("updated_at_utc"),
        "phases": data.get("phases") or {},
        "human_interventions": data.get("human_interventions") or [],
        "human_wait_intervals": data.get("human_wait_intervals") or [],
        "summary": data.get("summary") or {},
    }


def read_metrics(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as stream:
            data = json.load(stream)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError, TypeError):
        return {}


def write_metrics(path: Path, data: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    ordered = _ordered_data(data)
    _refresh_totals(ordered)
    temp = path.with_name(path.name + ".tmp")
    with temp.open("w", encoding="utf-8") as stream:
        json.dump(ordered, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    os.replace(temp, path)
    return path


def init_metrics(
    path: Path,
    run_id: str,
    *,
    agent: str = "",
    model: str = "",
    skills: list[str] | None = None,
    force: bool = False,
) -> Path:
    if path.exists() and not force:
        existing = read_metrics(path)
        if existing:
            if existing.get("run_id") != run_id:
                raise ValueError(
                    f"metrics file already belongs to run {existing.get('run_id')!r}; "
                    "choose a new docs_dir/run_id or pass --force deliberately"
                )
            return path
    now = _utc_now()
    names = list(dict.fromkeys(skill for skill in (skills or []) if skill))
    data = {
        "workflow": WORKFLOW_NAME,
        "run_id": run_id,
        "started_at_utc": now,
        "completed_at_utc": None,
        "result": "running",
        "execution_context": {
            "workflow": WORKFLOW_NAME,
            "agent": agent or "unknown",
            "model": model or "unknown",
            "skills": names,
        },
        "phases": {phase: _empty_stage(phase) for phase, _ in STAGES},
        "human_interventions": [],
        "human_wait_intervals": [],
    }
    return write_metrics(path, data)


def _require_data(path: Path) -> dict[str, Any]:
    data = read_metrics(path)
    if not data or not data.get("run_id"):
        raise ValueError(f"metrics file not initialized: {path}")
    data.setdefault("phases", {phase: _empty_stage(phase) for phase, _ in STAGES})
    for phase, _ in STAGES:
        data["phases"].setdefault(phase, _empty_stage(phase))
    return data


def stage_open(path: Path, phase: str) -> str:
    data = _require_data(path)
    phase = _phase(phase)
    item = data["phases"][phase]
    runs = item.setdefault("runs", [])
    if not runs or runs[-1].get("closed_at_utc"):
        runs.append({"opened_at_utc": _utc_now(), "closed_at_utc": None})
    item["opened_at_utc"] = runs[-1]["opened_at_utc"]
    item["closed_at_utc"] = None
    item["last_result"] = None
    # Re-opening a stage means the run is active again (for example after a
    # user-requested correction). Do not leave a stale accepted result on top.
    data["completed_at_utc"] = None
    data["result"] = "running"
    return str(write_metrics(path, data))


def stage_close(path: Path, phase: str, result: str = "completed", note: str = "") -> str:
    data = _require_data(path)
    phase = _phase(phase)
    item = data["phases"][phase]
    runs = item.setdefault("runs", [])
    if not runs or runs[-1].get("closed_at_utc"):
        raise ValueError(f"stage {phase} is not open; run stage-open first")
    ended = _utc_now()
    runs[-1]["closed_at_utc"] = ended
    item["closed_at_utc"] = ended
    item["last_result"] = result
    item["last_result_at_utc"] = ended
    if note:
        item["last_note"] = note
    return str(write_metrics(path, data))


def record_phase_skills(path: Path, phase: str, skills: list[str]) -> str:
    data = _require_data(path)
    phase = _phase(phase)
    names = [str(name).strip() for name in skills if str(name).strip()]
    item = data["phases"][phase]
    item["skills_used"] = list(dict.fromkeys((item.get("skills_used") or []) + names))
    context = data.setdefault("execution_context", {})
    context["skills"] = list(dict.fromkeys((context.get("skills") or []) + names))
    return str(write_metrics(path, data))


def record_attempt(path: Path, phase: str, action: str, result: str) -> str:
    data = _require_data(path)
    phase = _phase(phase)
    item = data["phases"][phase]
    item["attempts"] = int(item.get("attempts", 0)) + 1
    item["last_action"] = action
    item["last_result"] = result
    item["last_result_at_utc"] = _utc_now()
    return str(write_metrics(path, data))


def update_context(
    path: Path, *, agent: str = "", model: str = "", skills: list[str] | None = None
) -> str:
    data = _require_data(path)
    context = data.setdefault("execution_context", {})
    if agent:
        context["agent"] = agent
    if model:
        context["model"] = model
    if skills:
        names = [str(name).strip() for name in skills if str(name).strip()]
        context["skills"] = list(dict.fromkeys((context.get("skills") or []) + names))
    return str(write_metrics(path, data))


def _validate_category(category: str) -> str:
    if category not in INTERVENTION_CATEGORIES:
        raise ValueError(
            "unknown intervention category %r; expected one of %s"
            % (category, ", ".join(INTERVENTION_CATEGORIES))
        )
    return category


def record_human_intervention(
    path: Path,
    phase: str,
    category: str,
    reason: str,
    *,
    actor: str = "",
    source: str = "manual",
    wait: dict[str, Any] | None = None,
) -> str:
    data = _require_data(path)
    phase = _phase(phase)
    category = _validate_category(category)
    event: dict[str, Any] = {
        "ts_utc": _utc_now(),
        "phase": phase,
        "category": category,
        "reason": reason,
        "actor": actor or "unknown",
        "source": source,
    }
    if wait:
        event["wait_id"] = wait.get("id")
        event["duration_seconds"] = wait.get("duration_seconds")
        event["resolved_at_utc"] = wait.get("ended_at_utc")
    data.setdefault("human_interventions", []).append(event)
    return str(write_metrics(path, data))


def start_human_wait(
    path: Path,
    phase: str,
    category: str,
    reason: str,
    *,
    actor: str = "",
    source: str = "manual",
    record_intervention: bool | None = None,
) -> str:
    data = _require_data(path)
    phase = _phase(phase)
    category = _validate_category(category)
    waits = data.setdefault("human_wait_intervals", [])
    for wait in reversed(waits):
        if (
            str(wait.get("phase")) == phase
            and wait.get("category") == category
            and not wait.get("ended_at_utc")
        ):
            return str(wait.get("id"))
    if record_intervention is None:
        # Designed review/decision waits are counted when resolved, while an
        # unexpected/user wait is counted immediately like the AR workflow.
        record_intervention = category != "required_workflow"
    wait_id = "human-wait-%04d" % (len(waits) + 1)
    started = _utc_now()
    wait: dict[str, Any] = {
        "id": wait_id,
        "phase": phase,
        "category": category,
        "reason": reason,
        "actor": actor or "unknown",
        "source": source,
        "started_at_utc": started,
        "ended_at_utc": None,
        "duration_seconds": None,
        "status": "waiting",
        "exclude_from_effective_time": True,
        "record_intervention_on_start": bool(record_intervention),
    }
    waits.append(wait)
    if record_intervention:
        data.setdefault("human_interventions", []).append(
            {
                "ts_utc": started,
                "phase": phase,
                "category": category,
                "reason": reason,
                "actor": actor or "unknown",
                "source": source,
                "wait_id": wait_id,
                "duration_seconds": None,
            }
        )
    write_metrics(path, data)
    return wait_id


def end_human_wait(
    path: Path,
    phase: str,
    *,
    category: str | None = None,
    actor: str = "",
    reason: str = "",
) -> dict[str, Any]:
    data = _require_data(path)
    phase = _phase(phase)
    if category:
        category = _validate_category(category)
    waits = data.get("human_wait_intervals") or []
    match: dict[str, Any] | None = None
    for wait in reversed(waits):
        if (
            str(wait.get("phase")) == phase
            and not wait.get("ended_at_utc")
            and (category is None or wait.get("category") == category)
        ):
            match = wait
            break
    if match is None:
        raise ValueError(
            "no open human wait matches phase=%s category=%s"
            % (phase, category or "<any>")
        )
    ended = _utc_now()
    match["ended_at_utc"] = ended
    match["duration_seconds"] = _seconds_between(match.get("started_at_utc"), ended)
    match["status"] = "completed"
    if actor:
        match["actor"] = actor
    if reason:
        match["resolution"] = reason

    event = next(
        (item for item in data.get("human_interventions") or [] if item.get("wait_id") == match.get("id")),
        None,
    )
    if event is None:
        data.setdefault("human_interventions", []).append(
            {
                "ts_utc": ended,
                "phase": phase,
                "category": match.get("category"),
                "reason": match.get("reason"),
                "actor": actor or match.get("actor") or "unknown",
                "source": "human-wait:resolved",
                "wait_id": match.get("id"),
                "duration_seconds": match.get("duration_seconds"),
                "resolved_at_utc": ended,
            }
        )
    elif event is not None:
        event["duration_seconds"] = match.get("duration_seconds")
        event["resolved_at_utc"] = ended
        if actor:
            event["actor"] = actor
    write_metrics(path, data)
    return dict(match)


def complete(path: Path, result: str = "accepted") -> str:
    data = _require_data(path)
    ended = _utc_now()
    data["completed_at_utc"] = ended
    data["result"] = result
    for item in data.get("phases", {}).values():
        runs = item.get("runs") or []
        if runs and not runs[-1].get("closed_at_utc"):
            runs[-1]["closed_at_utc"] = ended
            item["closed_at_utc"] = ended
            item["last_result"] = result
            item["last_result_at_utc"] = ended
    return str(write_metrics(path, data))


def _add_metrics_argument(parser: argparse.ArgumentParser, *, override: bool = False) -> None:
    parser.add_argument(
        "--metrics",
        dest="metrics_override" if override else "metrics",
        help="path to docs_dir/workflow_metrics.json",
    )


def _add_phase_argument(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--phase", "--stage", dest="phase", required=True, help="R1-R9 stage")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Record Requirement workflow observability")
    _add_metrics_argument(parser)
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init", help="initialize one metrics file")
    _add_metrics_argument(init, override=True)
    init.add_argument("--run-id", required=True)
    init.add_argument("--agent", default="")
    init.add_argument("--model", default="")
    init.add_argument("--skill", action="append", default=[])
    init.add_argument("--force", action="store_true", help="replace an existing file deliberately")

    opened = sub.add_parser("stage-open", help="open or resume a Requirement stage")
    _add_metrics_argument(opened, override=True)
    _add_phase_argument(opened)

    closed = sub.add_parser("stage-close", help="close the current run of a stage")
    _add_metrics_argument(closed, override=True)
    _add_phase_argument(closed)
    closed.add_argument("--result", default="completed")
    closed.add_argument("--note", default="")

    skills = sub.add_parser("use-skill", help="record skills actually used in a stage")
    _add_metrics_argument(skills, override=True)
    _add_phase_argument(skills)
    skills.add_argument("--name", action="append", required=True)

    attempt = sub.add_parser("attempt", help="record a non-authoritative stage attempt")
    _add_metrics_argument(attempt, override=True)
    _add_phase_argument(attempt)
    attempt.add_argument("--action", required=True)
    attempt.add_argument("--result", required=True)

    waiting = sub.add_parser("human-wait", help="start/end excluded human waiting time")
    _add_metrics_argument(waiting, override=True)
    waiting.add_argument("action", choices=("start", "end"))
    _add_phase_argument(waiting)
    waiting.add_argument("--category", choices=INTERVENTION_CATEGORIES)
    waiting.add_argument("--reason", default="")
    waiting.add_argument("--actor", default="")
    waiting.add_argument(
        "--record-intervention",
        action="store_true",
        help="also count a required_workflow wait at start (normally deferred until end)",
    )

    intervention = sub.add_parser("intervene", help="record an instantaneous human intervention")
    _add_metrics_argument(intervention, override=True)
    _add_phase_argument(intervention)
    intervention.add_argument("--category", required=True, choices=INTERVENTION_CATEGORIES)
    intervention.add_argument("--reason", required=True)
    intervention.add_argument("--actor", default="")
    intervention.add_argument("--source", default="requirement_metrics.py:intervene")

    context = sub.add_parser("context", help="update agent/model/skill context")
    _add_metrics_argument(context, override=True)
    context.add_argument("--agent", default="")
    context.add_argument("--model", default="")
    context.add_argument("--skill", action="append", default=[])

    done = sub.add_parser("complete", help="mark the Requirement workflow result")
    _add_metrics_argument(done, override=True)
    done.add_argument("--result", default="accepted")

    status = sub.add_parser("status", help="show current metrics summary")
    _add_metrics_argument(status, override=True)
    status.add_argument("--json", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        path = _metrics_path(args)
        if args.command == "init":
            output = init_metrics(
                path,
                args.run_id,
                agent=args.agent,
                model=args.model,
                skills=args.skill,
                force=args.force,
            )
            print(f"initialized Requirement workflow metrics: {output}")
            return 0

        if args.command == "stage-open":
            stage_open(path, args.phase)
            print(f"opened Requirement stage {_phase(args.phase)}")
        elif args.command == "stage-close":
            stage_close(path, args.phase, args.result, args.note)
            print(f"closed Requirement stage {_phase(args.phase)} result={args.result}")
        elif args.command == "use-skill":
            record_phase_skills(path, args.phase, args.name)
            print(f"recorded stage {_phase(args.phase)} skill(s): {', '.join(args.name)}")
        elif args.command == "attempt":
            record_attempt(path, args.phase, args.action, args.result)
            print(f"recorded stage {_phase(args.phase)} attempt: {args.action} -> {args.result}")
        elif args.command == "human-wait":
            if args.action == "start":
                if not args.category:
                    raise ValueError("human-wait start requires --category")
                wait_id = start_human_wait(
                    path,
                    args.phase,
                    args.category,
                    args.reason,
                    actor=args.actor,
                    record_intervention=(True if args.record_intervention else None),
                )
                print(f"human wait started: id={wait_id} phase={_phase(args.phase)}")
            else:
                wait = end_human_wait(
                    path,
                    args.phase,
                    category=args.category,
                    actor=args.actor,
                    reason=args.reason,
                )
                print(
                    "human wait ended: id=%s excluded_seconds=%s"
                    % (wait["id"], wait.get("duration_seconds"))
                )
        elif args.command == "intervene":
            record_human_intervention(
                path,
                args.phase,
                args.category,
                args.reason,
                actor=args.actor,
                source=args.source,
            )
            print(
                "recorded human intervention: phase=%s category=%s reason=%s"
                % (_phase(args.phase), args.category, args.reason)
            )
        elif args.command == "context":
            update_context(path, agent=args.agent, model=args.model, skills=args.skill)
            print(f"updated Requirement workflow execution context in {path}")
        elif args.command == "complete":
            complete(path, args.result)
            print(f"Requirement workflow complete: result={args.result}")
        elif args.command == "status":
            data = _require_data(path)
            write_metrics(path, data)
            if args.json:
                print(json.dumps(read_metrics(path), ensure_ascii=False, indent=2))
            else:
                fresh = read_metrics(path)
                print(
                    "run_id=%s result=%s"
                    % (fresh.get("run_id"), fresh.get("result", "running"))
                )
                for phase, item in fresh.get("phases", {}).items():
                    print(
                        "  [%s] %-2s %-24s elapsed=%s effective=%s result=%s"
                        % (
                            "✓" if item.get("closed_at_utc") else "…" if item.get("opened_at_utc") else " ",
                            phase,
                            item.get("name", ""),
                            item.get("elapsed_seconds"),
                            item.get("effective_elapsed_seconds"),
                            item.get("last_result"),
                        )
                    )
                print("summary=%s" % json.dumps(fresh.get("summary", {}), ensure_ascii=False))
        return 0
    except (OSError, ValueError, TypeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
