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
import xml.etree.ElementTree as ET

PHASES = [
    (0, "bootstrap"),
    (1, "design-orchestrate"),
    (2, "feature-develop"),
    (3, "test-develop"),
    (4, "build-verify"),
    (5, "test-author"),
    (6, "device-functional"),
    (7, "quality-verify"),
    (8, "upload-review"),
]
PHASE_NAME = {i: n for i, n in PHASES}
MAX_PHASE = max(i for i, _ in PHASES)
# Path B1 physical phase scheme. Bumped from the implicit 7-phase layout to 9
# when physical phase 1 was split into design_orchestrate / feature_develop /
# test_develop. load_state() refuses any pipeline.json not stamped with this.
PHASE_SCHEME = 9

# --- canonical logical-phase vocabulary (spec §5 table + §5.x mapping) ------
# The design speaks in logical phases P0..P8; the physical state machine now runs
# 9 physical phases 0..8, one per logical phase (Path B1 renumber, 2026-07-25).
# The old 7-phase scheme collapsed P1/P2/P3 onto physical phase 1 via substates;
# they are now three real signed phases. This table remains the ONE place the two
# vocabularies are reconciled so every layer labels a phase the same way. Each
# row: (logical_label, logical_id, logical_name, physical_phase). The physical
# column is now 1:1 with the logical order. Purely descriptive — pass authority
# is unaffected.
LOGICAL_PHASES = [
    ("P0", "bootstrap", "bootstrap", 0),
    ("P1", "design_orchestrate", "design-orchestrate", 1),
    ("P2", "feature_develop", "feature-develop", 2),
    ("P3", "test_develop", "test-develop", 3),
    ("P4", "build_verify", "build-verify", 4),
    ("P5", "test_author", "test-author", 5),
    ("P6", "device_functional", "device-functional", 6),
    ("P7", "quality_verify", "quality-verify", 7),
    ("P8", "upload_review", "upload-review", 8),
]
LOGICAL_LABEL = {row[1]: row[0] for row in LOGICAL_PHASES}
LOGICAL_ID_BY_LABEL = {row[0]: row[1] for row in LOGICAL_PHASES}
LOGICAL_NAME = {row[1]: row[2] for row in LOGICAL_PHASES}
LOGICAL_TO_PHYSICAL = {row[1]: row[3] for row in LOGICAL_PHASES}


def logical_label(logical_phase_id):
    """Canonical 'P<n>' label for a logical phase id, or the id unchanged if it
    is not one of the known logical phases."""
    return LOGICAL_LABEL.get(logical_phase_id, logical_phase_id)


def physical_for_logical(logical_phase_id):
    """Physical phase number that runs a logical phase (None if unknown)."""
    return LOGICAL_TO_PHYSICAL.get(logical_phase_id)


def logicals_for_physical(physical_phase):
    """All logical phase ids mapped onto a physical phase, in order. Since the
    Path B1 renumber the mapping is 1:1, so this returns a single-element list
    for every real phase (kept as a list for API stability)."""
    return [row[1] for row in LOGICAL_PHASES if row[3] == physical_phase]


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


def phase_relpath(phase, *parts):
    return os.path.join("evidence", "phase%d" % phase, *parts)


def phase_path(pdir, phase, *parts):
    return os.path.join(pdir, phase_relpath(phase, *parts))


def controls_relpath(*parts):
    return os.path.join("controls", *parts) if parts else "controls"


def controls_path(pdir, *parts):
    return os.path.join(pdir, controls_relpath(*parts))


def read_json_file(path):
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return json.load(f)
    except Exception:
        return None


def read_phase_json(pdir, phase, filename):
    return read_json_file(phase_path(pdir, phase, filename))


def read_control_json(pdir, *parts):
    return read_json_file(controls_path(pdir, *parts))


def phase_summary_relpath(phase):
    return phase_relpath(phase, "phase_summary.json")


def failure_report_relpath(phase):
    return phase_relpath(phase, "failure_report.json")


def control_artifact_ref(parts, role):
    return {"path": controls_relpath(*parts), "role": role}


def control_report_index(*, entry_parts=None, handoff_parts=None,
                         failure_parts=None, receipt_parts=None):
    out = {}
    if entry_parts is not None:
        out["primary_entry_doc"] = controls_relpath(*entry_parts)
    if handoff_parts is not None:
        out["primary_handoff_doc"] = controls_relpath(*handoff_parts)
    if failure_parts is not None:
        out["primary_failure_doc"] = controls_relpath(*failure_parts)
    if receipt_parts is not None:
        out["primary_completion_receipt"] = controls_relpath(*receipt_parts)
    return out


def read_phase_summary(pdir, phase):
    return read_phase_json(pdir, phase, "phase_summary.json")


def read_failure_report(pdir, phase):
    return read_phase_json(pdir, phase, "failure_report.json")


def write_phase_summary(pdir, phase, gate, verdict, reason, checks=None,
                        extra=None):
    """Write evidence/phase<N>/phase_summary.json — a machine-readable navigation
    summary for advance.py/refresh_todo. NOT a truth source: the signed manifest
    remains authoritative. Best-effort: a write failure must never change a gate's
    verdict, so all errors are swallowed. Returns the relpath or None."""
    payload = {
        "phase": phase, "gate": gate, "verdict": verdict, "reason": reason,
        "checks": checks or [], "ok": verdict == "PASS",
    }
    if extra:
        payload.update(extra)
    try:
        rel = phase_summary_relpath(phase)
        evidence_dir(pdir, phase)
        with open(os.path.join(pdir, rel), "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return rel
    except Exception:
        return None


def write_failure_report(pdir, phase, gate, reason, problems=None,
                         resume_hint=None, extra=None):
    """Write evidence/phase<N>/failure_report.json on a FAIL. Best-effort, same
    non-authoritative contract as write_phase_summary. Returns relpath or None."""
    payload = {
        "phase": phase, "gate": gate, "reason": reason,
        "problems": problems or [], "resume_hint": resume_hint,
    }
    if extra:
        payload.update(extra)
    try:
        rel = failure_report_relpath(phase)
        evidence_dir(pdir, phase)
        with open(os.path.join(pdir, rel), "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return rel
    except Exception:
        return None


def write_control_json(pdir, *parts, payload, best_effort=True):
    """Write a navigation/control-layer JSON file under controls/. Like other
    helper snapshots, this is non-authoritative and best-effort by default."""
    rel = controls_relpath(*parts)
    ap = os.path.join(pdir, rel)
    try:
        os.makedirs(os.path.dirname(ap), exist_ok=True)
        with open(ap, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return rel
    except Exception:
        if best_effort:
            return None
        raise


def write_dual_snapshot_json(pdir, root_name, controls_parts, payload,
                             best_effort=True):
    """Write the same navigation payload to both the legacy root path and the
    new controls/ mirror, returning their relpaths when successful."""
    out = {"root": None, "controls": None}
    root_rel = root_name
    root_ap = os.path.join(pdir, root_rel)
    try:
        root_dir = os.path.dirname(root_ap)
        if root_dir:
            os.makedirs(root_dir, exist_ok=True)
        with open(root_ap, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        out["root"] = root_rel
    except Exception:
        if not best_effort:
            raise
    try:
        out["controls"] = write_control_json(
            pdir, *controls_parts, payload=payload, best_effort=False)
    except Exception:
        if not best_effort:
            raise
    return out


def clear_failure_report(pdir, phase):
    """Remove a stale failure_report.json on PASS so navigation doesn't show an
    old failure. Best-effort."""
    try:
        p = phase_path(pdir, phase, "failure_report.json")
        if os.path.exists(p):
            os.remove(p)
    except Exception:
        pass


# ----------------------------------------------------------------------------
# control-layer protocol: schemas, validation, typed packet helpers
#
# Everything below is navigation/control layer only. None of it grants a phase
# pass. Pass authority stays with the signed evidence manifest + artifact sha +
# consent + advance.py. All writers are best-effort; a failed write or a schema
# mismatch must NEVER change a gate's verdict — validation is advisory.
# ----------------------------------------------------------------------------
CONTROL_PROTOCOL_VERSION = 1

_SCHEMA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "schemas")

# Map a logical control "kind" to its schema file.
_CONTROL_SCHEMAS = {
    "stage_packet": "stage_packet.schema.json",
    "repair_packet": "repair_packet.schema.json",
    "completion_receipt": "completion_receipt.schema.json",
    "handoff_packet": "handoff_packet.schema.json",
    "phase_memory_card": "phase_memory_card.schema.json",
    "substate": "substate.schema.json",
    "index": "index.schema.json",
    "bundle_definition": "bundle_definition.schema.json",
}

_SCHEMA_CACHE = {}


def load_control_schema(kind):
    """Return the parsed JSON Schema for a control kind, or None if unavailable.
    Never raises: a missing/unreadable schema just disables validation."""
    if kind in _SCHEMA_CACHE:
        return _SCHEMA_CACHE[kind]
    fname = _CONTROL_SCHEMAS.get(kind)
    schema = None
    if fname:
        schema = read_json_file(os.path.join(_SCHEMA_DIR, fname))
    _SCHEMA_CACHE[kind] = schema
    return schema


_JSON_TYPE_MAP = {
    "object": dict, "array": list, "string": str,
    "integer": int, "number": (int, float), "boolean": bool, "null": type(None),
}


def _structural_type_ok(value, spec_type):
    """Built-in fallback type check when jsonschema is not importable."""
    if spec_type is None:
        return True
    types = spec_type if isinstance(spec_type, list) else [spec_type]
    for t in types:
        py = _JSON_TYPE_MAP.get(t)
        if py is None:
            return True  # unknown type keyword: don't reject
        # bool is a subclass of int in Python; keep them distinct for JSON.
        if t == "integer" and isinstance(value, bool):
            continue
        if t == "number" and isinstance(value, bool):
            continue
        if isinstance(value, py):
            return True
    return False


def _spec_ok(value, spec):
    """Return (ok, problem_or_None) for a single property spec, honoring the
    subset of JSON Schema the control payloads actually use: `type`, `enum`, and
    a flat `oneOf` of such specs. Keeps the no-jsonschema fallback from silently
    accepting out-of-enum values (S4) — a degraded validator must still fail
    closed on the enum contract, not wave it through."""
    if not isinstance(spec, dict):
        return True, None
    if "oneOf" in spec:
        for branch in spec["oneOf"]:
            ok, _ = _spec_ok(value, branch)
            if ok:
                return True, None
        return False, "does not match any oneOf branch"
    if "type" in spec and not _structural_type_ok(value, spec["type"]):
        return False, "has wrong type"
    if "enum" in spec and value not in spec["enum"]:
        return False, "value %r not in enum" % (value,)
    return True, None


def _structural_validate(payload, schema):
    """Minimal required-keys + type/enum check used when jsonschema is absent.
    Returns a list of human-readable problems (empty == valid). Enforces enum
    and a flat oneOf so the fallback fails closed on the action-class contract.
    Problem wording is "field <name> <reason>" — kept stable for callers/tests
    that match on the legacy "field <name> has wrong type" string."""
    problems = []
    if not isinstance(payload, dict):
        return ["payload is not an object"]
    for key in schema.get("required", []):
        if key not in payload:
            problems.append("missing required field: %s" % key)
    props = schema.get("properties", {})
    for key, spec in props.items():
        if key in payload and isinstance(spec, dict):
            ok, why = _spec_ok(payload[key], spec)
            if not ok:
                problems.append("field %s %s" % (key, why))
    return problems


def validate_control_payload(kind, payload):
    """Validate a control-layer payload against its schema. DEPENDENCY-OPTIONAL:
    uses jsonschema if importable, else a built-in required-keys/type check.

    Returns {"ok": bool, "problems": [str,...], "validated_by": str}. This is
    advisory only — callers must not gate a verdict on the result. If no schema
    is registered/loadable, returns ok=True with validated_by="none"."""
    schema = load_control_schema(kind)
    if schema is None:
        return {"ok": True, "problems": [], "validated_by": "none"}
    try:
        import jsonschema  # type: ignore
    except Exception:
        jsonschema = None
    if jsonschema is not None:
        try:
            jsonschema.validate(instance=payload, schema=schema)
            return {"ok": True, "problems": [], "validated_by": "jsonschema"}
        except Exception as exc:  # ValidationError or SchemaError
            msg = getattr(exc, "message", None) or str(exc)
            return {"ok": False, "problems": [msg],
                    "validated_by": "jsonschema"}
    problems = _structural_validate(payload, schema)
    return {"ok": not problems, "problems": problems,
            "validated_by": "structural"}


def write_control_packet(pdir, kind, parts, payload, best_effort=True):
    """Validate (advisory) then write a control-layer packet under controls/.
    A validation failure is logged into the return dict but does NOT block the
    write and does NOT affect any verdict. Returns {"rel", "validation"}."""
    validation = validate_control_payload(kind, payload)
    rel = write_control_json(pdir, *parts, payload=payload,
                             best_effort=best_effort)
    return {"rel": rel, "validation": validation}


# --- §9.1 typed packet writers/readers -------------------------------------
# Each writer stamps control_protocol_version, validates against its schema
# (advisory), and writes under controls/. Readers just return the parsed JSON.

def _with_protocol_version(payload):
    out = dict(payload)
    out.setdefault("control_protocol_version", CONTROL_PROTOCOL_VERSION)
    return out


def write_bundle_definition(pdir, parts, payload, best_effort=True):
    """Write a development-bundle definition, validated (advisory) against the
    bundle_definition schema and stamped with control_protocol_version like every
    other control-layer packet. A validation failure is reported in the return
    dict but never blocks the write or affects a verdict."""
    return write_control_packet(
        pdir, "bundle_definition", parts,
        _with_protocol_version(payload), best_effort=best_effort)


def read_bundle_definition(pdir, parts):
    return read_control_json(pdir, *parts)


def write_phase_memory_card(pdir, payload, parts=("memory_cards", "current.json"),
                            best_effort=True):
    return write_control_packet(
        pdir, "phase_memory_card", parts,
        _with_protocol_version(payload), best_effort=best_effort)


def read_phase_memory_card(pdir, parts=("memory_cards", "current.json")):
    return read_control_json(pdir, *parts)


# Forbidden actions common to every phase — a weak model must never treat the
# navigation/control layer as a truth source or bypass signed evidence.
_BASE_FORBIDDEN_ACTIONS = (
    "treat_navigation_files_as_truth_source",
    "edit_pipeline_json_directly",
    "advance_without_signed_evidence",
)

# --- window startup order (§15, forced sequence) ---------------------------
# The one canonical order a fresh window must read control/evidence artifacts
# in. It is emitted into the memory card (step 1, so the first file a window
# opens carries the order for everything after it) and mirrored into
# next_action.json. Purely navigational: reading in this order never grants
# pass authority, which still comes from signed evidence + consent + advance.py.
# Each step maps to a control_refs key where one exists (None => not a single
# addressable control file). `optional` marks steps a window may skip when the
# artifact is absent (a green phase has no failure_report; a fresh phase has no
# receipt yet).
_WINDOW_STARTUP_STEPS = (
    (1, "phase_memory_card", "memory_card", False),
    (2, "advance_status_json", None, False),
    (3, "stage_packet", "stage_packet", False),
    (4, "handoff_or_repair_packet", "handoff_in", False),
    (5, "completion_receipt", "receipt", True),
    (6, "failure_report_or_phase_summary", None, True),
    (7, "phase_evidence", None, False),
)

# Orders a weak model must NOT start a window with (§15 禁止的顺序).
_WINDOW_STARTUP_FORBIDDEN = (
    "read_global_readme_first",
    "read_large_logs_first",
    "read_next_phase_packet_first",
    "replay_full_chat_history_first",
)


def window_startup_order(control_refs=None):
    """The §15 forced window startup order as a machine-readable payload. When
    control_refs is given, each step is resolved to the concrete controls/ path
    a window should open. Navigation only — never a pass authority."""
    refs = control_refs or {}
    steps = []
    for order, artifact, ref_key, optional in _WINDOW_STARTUP_STEPS:
        steps.append({
            "order": order,
            "artifact": artifact,
            "ref": refs.get(ref_key) if ref_key else None,
            "optional": optional,
        })
    return {
        "control_protocol_version": CONTROL_PROTOCOL_VERSION,
        "authority_note": (
            "reading order only; pass authority stays with signed evidence "
            "+ consent + advance.py"),
        "steps": steps,
        "forbidden_starts": list(_WINDOW_STARTUP_FORBIDDEN),
    }


def build_phase_memory_card(phase, phase_name, *, verdict=None,
                            bundle_revision=None, current_blocker=None,
                            forbidden_actions=None,
                            next_expected_action_class=None,
                            last_failure_class=None,
                            human_escalation_needed=False,
                            primary_entry_doc=None, primary_failure_doc=None,
                            primary_handoff_doc=None):
    """Build a phase memory-card payload (§6 template) a gate can emit on PASS or
    FAIL so a weak model reorients mid-phase before advance.py projects the
    global card. Non-authoritative navigation only."""
    extra = tuple(forbidden_actions or ())
    forbidden = list(_BASE_FORBIDDEN_ACTIONS) + [
        a for a in extra if a not in _BASE_FORBIDDEN_ACTIONS]
    if primary_failure_doc is None:
        primary_failure_doc = failure_report_relpath(phase)
    return {
        "control_protocol_version": CONTROL_PROTOCOL_VERSION,
        "phase": phase,
        "phase_name": phase_name,
        "bundle_revision": bundle_revision,
        "current_blocker": current_blocker if current_blocker else "none",
        "forbidden_actions": forbidden,
        "next_expected_action_class": next_expected_action_class,
        "last_failure_class": last_failure_class,
        "human_escalation_needed": bool(human_escalation_needed),
        "primary_entry_doc": primary_entry_doc,
        "primary_failure_doc": primary_failure_doc,
        "primary_handoff_doc": primary_handoff_doc,
        "verdict": verdict,
    }


def write_gate_phase_memory_card(pdir, phase, phase_name, **kwargs):
    """Convenience: build + write a per-phase memory card under
    controls/memory_cards/phase<N>.json. Best-effort, non-authoritative."""
    payload = build_phase_memory_card(phase, phase_name, **kwargs)
    return write_phase_memory_card(
        pdir, payload, parts=("memory_cards", "phase%d.json" % phase))


def write_completion_receipt(pdir, parts, payload, best_effort=True):
    return write_control_packet(
        pdir, "completion_receipt", parts,
        _with_protocol_version(payload), best_effort=best_effort)


def read_completion_receipt(pdir, parts):
    return read_control_json(pdir, *parts)


def write_handoff_packet(pdir, parts, payload, best_effort=True):
    return write_control_packet(
        pdir, "handoff_packet", parts,
        _with_protocol_version(payload), best_effort=best_effort)


def read_handoff_packet(pdir, parts):
    return read_control_json(pdir, *parts)


def write_repair_packet(pdir, parts, payload, best_effort=True):
    return write_control_packet(
        pdir, "repair_packet", parts,
        _with_protocol_version(payload), best_effort=best_effort)


def read_repair_packet(pdir, parts):
    return read_control_json(pdir, *parts)


def build_cleared_repair_packet(phase, phase_name, *, cleared_by,
                                bundle_revision_from=""):
    """A schema-valid 'inactive' repair packet written on PASS to close any open
    repair window. Carries the repair_packet schema's required fields so the
    advisory validator returns ok even for a clear — an active repair never
    survives a green phase, but its record must still be well-formed."""
    return {
        "control_protocol_version": CONTROL_PROTOCOL_VERSION,
        "phase": phase,
        "phase_name": phase_name,
        "active": False,
        "cleared_by": cleared_by,
        "failure_class": None,
        "recommended_next_action": "none",
        "bundle_revision_from": bundle_revision_from,
    }


def write_substate_snapshot(pdir, parts, payload, best_effort=True):
    return write_control_packet(
        pdir, "substate", parts,
        _with_protocol_version(payload), best_effort=best_effort)


def read_substate_snapshot(pdir, parts):
    return read_control_json(pdir, *parts)


# --- Stage Packet (§3 template) --------------------------------------------
# A stage packet defines what one logical phase may read/change/produce, its
# entry/exit protocol, failure classes and retry/repair budgets. It is a
# navigation/execution-control artifact — never a truth source. The landing
# convention is controls/packets/<logical_phase_id>.json.

STAGE_PACKET_PARTS = ("packets", "current.json")

# Default authority boundary every stage packet carries so a weak model can
# never mistake the packet for a pass authority.
_STAGE_TRUTH_SOURCES = (
    "evidence/manifest.jsonl",
    "advance.py",
    "consent binding",
)


def stage_packet_parts(logical_phase_id=None):
    """Landing parts for a stage packet. With a logical_phase_id, the packet is
    addressable per phase (controls/packets/<id>.json); without one it falls
    back to controls/packets/current.json."""
    if logical_phase_id:
        return ("packets", "%s.json" % logical_phase_id)
    return STAGE_PACKET_PARTS


def build_stage_packet(phase_id, phase_name, *, physical_phase=None,
                       bundle_id=None, bundle_revision=None,
                       upstream_dependencies=None, derived_from=None,
                       goal_summary=None, completion_definition=None,
                       non_goals=None, entry_preconditions=None,
                       entry_blockers=None, entry_checklist=None,
                       required_inputs=None, indexes=None,
                       allowed_context=None, forbidden_context=None,
                       allowed_actions=None, forbidden_actions=None,
                       change_scope=None, expected_outputs=None,
                       success_semantics=None, exit_conditions=None,
                       exit_artifacts_required=None, exit_state_transition=None,
                       failure_classes=None, max_retry_rounds=2,
                       max_repair_rounds=2, human_escalation_conditions=None,
                       handoff_requirements=None):
    """Build a stage-packet payload (§3 template). Only phase_identity and
    authority_boundary are mandatory; every other section defaults to an empty
    shape so partial packets still validate. The forbidden-actions floor from
    _BASE_FORBIDDEN_ACTIONS is always merged in so no packet can silently drop
    the "navigation is not truth" guardrails."""
    extra_forbidden = tuple(forbidden_actions or ())
    forbidden = list(_BASE_FORBIDDEN_ACTIONS) + [
        a for a in extra_forbidden if a not in _BASE_FORBIDDEN_ACTIONS]
    default_transition = {
        "on_success": "next_phase",
        "on_retry": "same_phase",
        "on_repair": "repair_window",
        "on_regenerate": "upstream_phase",
    }
    return {
        "control_protocol_version": CONTROL_PROTOCOL_VERSION,
        "phase_identity": {
            "phase_id": phase_id,
            "phase_name": phase_name,
            "logical_label": logical_label(phase_id),
            "physical_phase": physical_phase,
            "bundle_id": bundle_id,
            "bundle_revision": bundle_revision,
            "upstream_dependencies": list(upstream_dependencies or []),
            "packet_version": 2,
            "derived_from": list(derived_from or []),
        },
        "authority_boundary": {
            "packet_role": "execution-control",
            "not_truth_source": True,
            "truth_sources": list(_STAGE_TRUTH_SOURCES),
        },
        "phase_goal": {
            "summary": goal_summary,
            "completion_definition": list(completion_definition or []),
            "non_goals": list(non_goals or []),
        },
        "entry_protocol": {
            "entry_preconditions": list(entry_preconditions or []),
            "entry_blockers": list(entry_blockers or []),
            "entry_checklist": list(entry_checklist or [
                "read memory card",
                "read advance.py status --json",
                "verify required inputs present",
            ]),
        },
        "required_inputs": required_inputs or {
            "files": [], "fields": [], "prior_evidence": []},
        "indexes": indexes or {
            "artifact_index": {}, "evidence_index": {}, "report_index": {}},
        "allowed_context": allowed_context or {},
        "forbidden_context": list(forbidden_context or [
            "next-phase packet as this phase's primary source",
            "phase_summary/failure_report as pass authority",
            "long chat history as primary control source",
        ]),
        "allowed_actions": list(allowed_actions or []),
        "forbidden_actions": forbidden,
        "change_scope": change_scope or {
            "allowed_paths": [], "forbidden_paths": [],
            "expansion_policy": {"if_scope_expands": "regenerate"}},
        "expected_outputs": expected_outputs or {
            "code_changes": [], "artifacts": [],
            "summaries": ["handoff packet", "phase summary",
                          "completion receipt"],
            "must_emit_handoff": True},
        "success_semantics": success_semantics or {
            "semantic_success": [],
            "advance_note": ("real advance authority stays with signed "
                             "evidence + consent + advance.py")},
        "exit_protocol": {
            "exit_conditions": list(exit_conditions or []),
            "exit_artifacts_required": list(exit_artifacts_required or []),
            "exit_state_transition": exit_state_transition or default_transition,
        },
        "failure_classes": failure_classes or {
            "retry": [], "repair": [], "regenerate": []},
        "retry_policy": {
            "max_retry_rounds": max_retry_rounds,
            "max_repair_rounds": max_repair_rounds,
        },
        "human_escalation_conditions": list(human_escalation_conditions or [
            "retry rounds exceed threshold",
            "repair rounds exceed threshold",
            "repair/regenerate decision conflict",
        ]),
        "handoff_requirements": handoff_requirements or {
            "must_include": [
                "objective_completed",
                "produced_artifacts",
                "facts_for_next_phase",
                "risks",
                "recommended_next_action",
            ]},
    }


def write_stage_packet(pdir, payload, parts=STAGE_PACKET_PARTS,
                       best_effort=True):
    """Validate (advisory) + write a stage packet under controls/packets/.
    Best-effort: a write or validation failure never affects a verdict."""
    return write_control_packet(
        pdir, "stage_packet", parts,
        _with_protocol_version(payload), best_effort=best_effort)


def read_stage_packet(pdir, parts=STAGE_PACKET_PARTS):
    return read_control_json(pdir, *parts)


# --- shared per-logical-phase stage-packet definitions (§3 + §13) ----------
# The single source of truth for each logical phase's goal / non-goals /
# entry_preconditions / exit_conditions / failure_classes. Both advance.py (on
# `next`) and each gate (on run) build their stage packet from this table so the
# entry/exit contract a weak model reads is identical no matter which layer
# produced the packet. Static navigation scaffolds — never a pass authority.
STAGE_PACKET_DEFS = {
    "bootstrap": {
        "goal_summary": "Initialize the run and record signed bootstrap evidence.",
        "non_goals": ["author design", "write feature code"],
        "entry_preconditions": ["AR source exists", "repo root is valid"],
        "exit_conditions": ["run initialized", "next action generated",
                            "completion receipt generated"],
        "failure_classes": {"retry": ["bootstrap_transient"],
                            "repair": ["bootstrap_input_missing"],
                            "regenerate": []},
    },
    "design_orchestrate": {
        "goal_summary": "Produce a signed, closed-loop AR design contract.",
        "non_goals": ["write feature code before design consent"],
        "entry_preconditions": ["P0 completion receipt readable",
                               "normalized inputs complete"],
        "exit_conditions": ["global design doc complete",
                           "initial bundle established",
                           "handoff to feature-develop generated"],
        "failure_classes": {"retry": [],
                            "repair": ["design_section_missing"],
                            "regenerate": ["requirement_semantics_changed"]},
    },
    "feature_develop": {
        "goal_summary": "Implement feature code within the frozen changed_files boundary.",
        "non_goals": ["expand changed_files boundary",
                     "edit signed design as working copy"],
        "entry_preconditions": ["signed design present", "P1 consent bound"],
        "exit_conditions": ["feature code complete",
                           "touched files within boundary",
                           "handoff to test-develop generated"],
        "failure_classes": {"retry": [],
                            "repair": ["develop_coverage_gap"],
                            "regenerate": ["undeclared_business_file",
                                          "changed_files_boundary_expand"]},
    },
    "test_develop": {
        "goal_summary": "Author tests inside the declared test scope over a frozen feature bundle.",
        "non_goals": ["modify functional code outside test scope"],
        "entry_preconditions": ["development freeze snapshot present",
                               "allowed test scope declared"],
        "exit_conditions": ["test intent matrix generated",
                           "bundle revision updated",
                           "handoff to build-verify generated"],
        "failure_classes": {"retry": [],
                            "repair": ["test_scope_gap"],
                            "regenerate": ["test_cases_target_changed"]},
    },
    "build_verify": {
        "goal_summary": "Prove the development bundle compiles and produces every build_artifact.",
        "non_goals": ["add functional code outside the feature-develop freeze"],
        "entry_preconditions": ["complete bundle present",
                               "no open repair packet"],
        "exit_conditions": ["build target succeeds", "build_artifacts complete",
                           "completion receipt generated"],
        "failure_classes": {"retry": ["build_transient"],
                            "repair": ["build_verdict_failed",
                                      "build_symbol_missing"],
                            "regenerate": ["ar_contract_unrecoverable"]},
    },
    "test_author": {
        "goal_summary": "Run required gtests on the built bundle and prove coverage.",
        "non_goals": ["change functional semantics"],
        "entry_preconditions": ["build_verify completion receipt ready"],
        "exit_conditions": ["required gtests PASS",
                           "gtest coverage summary generated",
                           "handoff generated"],
        "failure_classes": {"retry": ["unit_test_transient"],
                            "repair": ["unit_test_verdict_failed",
                                      "gtest_coverage_missing"],
                            "regenerate": ["test_cases_target_changed"]},
    },
    "device_functional": {
        "goal_summary": "Prove target process ran target artifact with real, differentially-verified side effects.",
        "non_goals": ["accept plain marker text as proof"],
        "entry_preconditions": ["target device available", "device cases complete"],
        "exit_conditions": ["required device cases verified",
                           "provenance / side_effect / differential satisfied",
                           "completion receipt generated"],
        "failure_classes": {"retry": ["device_offline"],
                            "repair": ["marker_missing", "artifact_mismatch"],
                            "regenerate": ["device_cases_target_changed"]},
    },
    "quality_verify": {
        "goal_summary": "Run integration + quality + review checks with zero outstanding issues.",
        "non_goals": ["downgrade the quality contract silently"],
        "entry_preconditions": ["device_functional completion receipt ready"],
        "exit_conditions": ["integration suites pass",
                           "quality checklist satisfied",
                           "review zero-issue confirmed"],
        "failure_classes": {"retry": ["integration_test_transient"],
                            "repair": ["integration_test_failed",
                                      "quality_check_failed"],
                            "regenerate": []},
    },
    "upload_review": {
        "goal_summary": "Push, open PR, pass review + CI, and bind the SHA.",
        "non_goals": ["upload without consent", "bypass CI"],
        "entry_preconditions": ["quality_verify completion receipt ready",
                               "upload consent bound"],
        "exit_conditions": ["push / PR / review / CI / SHA binding satisfied",
                           "final phase summary generated",
                           "completion receipt generated"],
        "failure_classes": {"retry": ["ci_transient", "push_transient"],
                            "repair": ["ci_not_green", "pr_review_changes"],
                            "regenerate": []},
    },
}


def stage_packet_def(logical_phase_id):
    """The static §3/§13 navigation scaffold for a logical phase (goal,
    non-goals, entry_preconditions, exit_conditions, failure_classes). Returns
    an empty dict for an unknown id so callers degrade gracefully."""
    return STAGE_PACKET_DEFS.get(logical_phase_id, {})


def build_stage_packet_from_def(logical_phase_id, phase_name, *,
                                physical_phase=None, entry_blockers=None,
                                **overrides):
    """Build a stage packet for a logical phase off the shared STAGE_PACKET_DEFS
    table so every layer emits the same entry/exit contract. entry_blockers is
    the run-specific list of unmet required inputs; any keyword in overrides
    replaces the corresponding def field."""
    spec = stage_packet_def(logical_phase_id)
    return build_stage_packet(
        logical_phase_id, phase_name,
        physical_phase=physical_phase,
        goal_summary=overrides.get("goal_summary", spec.get("goal_summary")),
        non_goals=overrides.get("non_goals", spec.get("non_goals")),
        entry_preconditions=overrides.get(
            "entry_preconditions", spec.get("entry_preconditions")),
        entry_blockers=list(entry_blockers or []),
        exit_conditions=overrides.get(
            "exit_conditions", spec.get("exit_conditions")),
        failure_classes=overrides.get(
            "failure_classes", spec.get("failure_classes")),
    )


def write_gate_stage_packet_from_def(pdir, logical_phase_id, phase_name,
                                     *, physical_phase=None,
                                     entry_blockers=None, **overrides):
    """Build (from the shared def) + write a gate's own stage packet at
    controls/packets/<logical_phase_id>.json. Best-effort, non-authoritative:
    a write failure never affects the gate's verdict."""
    payload = build_stage_packet_from_def(
        logical_phase_id, phase_name, physical_phase=physical_phase,
        entry_blockers=entry_blockers, **overrides)
    return write_stage_packet(
        pdir, payload, parts=stage_packet_parts(logical_phase_id))



def write_control_index(pdir, parts, payload, best_effort=True):
    return write_control_packet(
        pdir, "index", parts,
        _with_protocol_version(payload), best_effort=best_effort)


def read_control_index(pdir, parts):
    return read_control_json(pdir, *parts)


def write_report_index(pdir, parts, payload, best_effort=True):
    """Write a controls/ index converging entry/handoff/failure/receipt docs."""
    out = dict(payload)
    out.setdefault("kind", "report_index")
    return write_control_index(pdir, parts, out, best_effort=best_effort)


def write_evidence_index(pdir, parts, evidence, extra=None, best_effort=True):
    """Write a controls/ index of evidence refs (path+role) for a phase."""
    payload = {"kind": "evidence_index", "evidence": list(evidence or [])}
    if extra:
        payload.update(extra)
    return write_control_index(pdir, parts, payload, best_effort=best_effort)


def write_artifact_index(pdir, parts, artifacts, extra=None, best_effort=True):
    """Write a controls/ index of build/test artifact refs (path+role) for a phase.

    Symmetric to write_evidence_index / write_report_index. NAVIGATION only:
    the signed manifest remains the artifact truth source; this is a convenience
    map so a fresh window can find a phase's artifacts without re-deriving them.
    """
    payload = {"kind": "artifact_index", "artifacts": list(artifacts or [])}
    if extra:
        payload.update(extra)
    return write_control_index(pdir, parts, payload, best_effort=best_effort)


# --- §9.2 repair/regenerate decision helpers -------------------------------
# Pure functions the gates route their inline retry/repair/regenerate logic
# through, so the routing policy lives in one audited place. These decide only
# *recommended navigation*, never pass authority.

# Failure classes that make a same-window repair pointless: fixing them would
# necessarily change the signed design/contract boundary (§10 matrix "must
# Regenerate" rows — requirement semantics, changed_files boundary, build_artifact
# set, test_cases target, device_cases target), so the only forward move is to
# regenerate the bundle from P1/P2/P3. `ar_contract_unrecoverable` is the extreme
# case (the contract itself cannot be recovered).
REGENERATE_FAILURE_CLASSES = frozenset({
    "ar_contract_unrecoverable",     # signed contract unrecoverable -> back to P1
    "contract_target_changed",       # fixing needs a new build/test/device target
    "requirement_semantics_changed", # requirement meaning must change
    "changed_files_boundary_expand", # fix touches files outside the declared set
    "undeclared_business_file",      # a new business file appeared, not in contract
    "new_external_dependency",       # fix needs a new external capability
})

# The §10 matrix rows, as detectable boolean signals. A gate that observes ANY of
# these knows a repair would cross the design boundary and must regenerate. Each
# key mirrors one "必须 Regenerate" row of the matrix.
_REGEN_SIGNAL_KEYS = (
    "undeclared_business_file",       # 新增未声明业务文件
    "requirement_semantics_changed",  # requirement 语义变化
    "build_artifacts_changed",        # build_artifacts 列表变化
    "test_cases_target_changed",      # test_cases 目标变化
    "device_cases_target_changed",    # device_cases 目标变化
    "changed_files_boundary_expand",  # changed_files 边界扩张
    "new_external_dependency",        # 为修复而新增外部依赖能力
)


def regen_signal_present(**signals):
    """True if any §10 "must Regenerate" boundary signal is set. Unknown keys are
    ignored so callers can pass only the signals a given gate can actually detect.
    Advisory: the caller passes this as repair_disallowed to force regeneration."""
    return any(bool(signals.get(k)) for k in _REGEN_SIGNAL_KEYS)


def classify_repair_vs_regenerate(failure_class, repair_rounds=0,
                                  max_repair_rounds=2,
                                  repair_disallowed=False):
    """Return one of 'retry' | 'repair_window' | 'regenerate' | 'escalate'.

    Advisory only. Regenerate when the failure class is unrecoverable; escalate
    when the repair budget is exhausted; otherwise recommend a repair window."""
    if failure_class in REGENERATE_FAILURE_CLASSES:
        return "regenerate"
    if repair_disallowed:
        return "regenerate"
    if repair_budget_exhausted(repair_rounds, max_repair_rounds):
        return "escalate"
    return "repair_window"


def _breaker_fallback_key(phase, failure_class, recommended_next_action):
    """Stable identity for a same-failure re-run when NO bundle_revision exists
    (legacy / bypass / missing signed_test_scope). Without this the circuit
    breaker would reset its counters every invocation and never escalate — the
    one mechanism meant to stop an infinite retry loop would be a no-op in
    exactly the degraded runs a weak model is most likely to be in. Keyed on the
    dimensions that define "the same failure recurring": phase + failure class +
    recommended action. Advisory only."""
    raw = "|".join([str(phase), failure_class or "", recommended_next_action or ""])
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def repair_round_metadata(prev, *, phase, bundle_revision_from, recommended_next_action,
                          failure_class=None, max_repair_rounds=2, max_retry_rounds=2):
    """Split same-bundle re-runs into retry vs repair rounds (§9.1/§9.2).

    `prev` is the previous repair packet (dict) or {} / None on the first round.
    A re-run on the SAME bundle_revision is a *retry* (transient: identical
    failure_class and recommended action, no fix landed yet) or a *repair*
    (the failure or the recommended action changed -> a new repair window). Each
    is counted and budgeted separately, so both circuit breakers can trip:

      * retry_rounds  bounded by max_retry_rounds  (same failure re-run)
      * repair_rounds bounded by max_repair_rounds (distinct repair windows)

    Returns the shared fields; a caller may layer additional escalation
    conditions (e.g. external CI/SHA conflicts) on top of `human_escalation_needed`.
    Advisory only — never authoritative over the signed manifest.

    When `bundle_revision_from` is empty (legacy / bypass / missing test bundle),
    same-failure detection falls back to a content key (`fallback_key`) so the
    counters still accumulate and the breaker can still escalate — instead of
    being silently disabled. Runs that DO carry a bundle_revision are unaffected
    (they take the revision branch exactly as before)."""
    prev = prev or {}
    fallback_key = _breaker_fallback_key(phase, failure_class, recommended_next_action)
    if bundle_revision_from:
        same_revision = (
            prev.get("active", True) is not False and
            prev.get("phase") == phase and
            prev.get("bundle_revision_from") == bundle_revision_from and
            bool(bundle_revision_from)
        )
    else:
        # revision-agnostic: identify a recurring failure by its content key so
        # the breaker is NOT a no-op on runs without a signed bundle revision.
        same_revision = (
            prev.get("active", True) is not False and
            prev.get("phase") == phase and
            not prev.get("bundle_revision_from") and
            prev.get("fallback_key") == fallback_key and
            bool(fallback_key)
        )
    prev_repair = int(prev.get("repair_rounds") or 0)
    prev_retry = int(prev.get("retry_rounds") or 0)
    # a retry is the SAME failure recommended for the SAME action on the SAME
    # bundle: nothing changed, we are just re-running a transient failure.
    is_retry = (
        same_revision and
        prev.get("failure_class") == failure_class and
        prev.get("recommended_next_action") in (None, recommended_next_action))
    if not same_revision:
        repair_rounds, retry_rounds = 1, 0
    elif is_retry:
        repair_rounds, retry_rounds = (prev_repair or 1), prev_retry + 1
    else:
        # the failure or the plan changed on the same bundle -> a new repair
        # window; retry budget resets for the new failure.
        repair_rounds, retry_rounds = prev_repair + 1, 0
    policy_conflict = same_revision and prev.get("recommended_next_action") not in (
        None, recommended_next_action, "human_escalation")
    repair_exhausted = repair_rounds > max_repair_rounds
    retry_exhausted = retry_budget_exhausted(retry_rounds, max_retry_rounds)
    escalation_reasons = []
    if repair_exhausted:
        escalation_reasons.append(
            "same bundle revision exceeded max_repair_rounds=%d" % max_repair_rounds)
    if retry_exhausted:
        escalation_reasons.append(
            "same failure retried beyond max_retry_rounds=%d" % max_retry_rounds)
    if policy_conflict:
        escalation_reasons.append(
            "repair/regenerate decision conflict on the same bundle revision")
    return {
        "repair_rounds": repair_rounds,
        "retry_rounds": retry_rounds,
        "same_revision": same_revision,
        "fallback_key": fallback_key,
        "policy_conflict": policy_conflict,
        "human_escalation_needed": repair_exhausted or retry_exhausted or policy_conflict,
        "escalation_reasons": escalation_reasons,
        "escalation_note": "; ".join(escalation_reasons) if escalation_reasons else "",
    }


# Ordered scopes, widest last, so callers can pick the max of several triggers.
# P4_only is the narrowest (only the failing device gate must re-run; nothing
# downstream was invalidated); all_downstream is the widest.
# NOTE (Path B1): these scope tokens are SYMBOLIC ordered names, NOT physical
# phase ids. They are persisted inside repair/handoff packets on disk, so they
# are intentionally NOT renumbered when the physical phases changed 7->9. Read
# them as an ordered enum (widest wins); the "P4"/"P6"/"P7" spelling refers to
# the original logical numbering and is decoupled from the physical phase axis.
# Any future re-spelling must be a separate migration with a packet-version bump.
_REVALIDATE_SCOPES = ["P4_only", "P4_P5", "P4_to_P6", "P4_to_P7", "all_downstream"]

# Map a failure_class to the minimal downstream scope a fix for it invalidates
# (design spec §11 判定原则). The key insight: the scope is a function of WHAT a
# repair for this failure touches, not of where it was observed.
#   * pure build/compile fix, no test semantics changed         -> P4_P5
#   * touches test support / assertion references                -> P4_to_P6
#   * touches device logic or observation points                 -> P4_to_P7
#   * touches review / packaging / output semantics              -> all_downstream
#   * satisfying a prerequisite / consent (no code change)       -> P4_only
# Unmapped classes fall back to the conservative wide default so a weak model is
# never told "less downstream is stale than actually is".
_FAILURE_SCOPE = {
    # P2 build-verify: rebuild + rerun unit tests, nothing further implied
    "build_artifact_missing": "P4_P5",
    "build_verdict_failed": "P4_P5",
    "test_target_build_failed": "P4_P5",
    # P3 test-author: assertions / gtest coverage moved -> device gate re-runs too
    "gtest_coverage_missing": "P4_to_P6",
    "unit_test_verdict_failed": "P4_to_P6",
    # P4 device-functional: device logic / observation points -> quality re-runs
    "device_functional_verdict_failed": "P4_to_P7",
    "marker_missing": "P4_to_P7",
    "artifact_mismatch": "P4_to_P7",
    "deploy_failed": "P4_to_P7",
    "device_offline": "P4_to_P7",
    # P5 quality / integration: review + packaging downstream invalidated
    "integration_test_failed": "P4_to_P7",
    "quality_reports_missing_or_invalid": "all_downstream",
    "code_review_blocked": "all_downstream",
    # P6 upload-review: review / CI / packaging / output semantics
    "review_gate_failed": "all_downstream",
    "ci_not_green": "all_downstream",
    "pr_head_sha_mismatch": "all_downstream",
    "pr_metadata_incomplete": "all_downstream",
    "pr_create_failed": "all_downstream",
    "push_failed": "all_downstream",
    "issue_binding_missing": "all_downstream",
    "dry_run_no_pass": "all_downstream",
    "upload_ci_failed": "all_downstream",
    # prerequisites / consent: satisfying these changes no code, so nothing
    # downstream was invalidated — only the failing gate itself must re-run.
    "prerequisite_phase_missing": "P4_only",
    "consent_missing": "P4_only",
    "fresh_report_missing": "P4_only",
    "summary_report_missing": "P4_only",
}
# a wide, conservative default for unmapped / unrecoverable failures.
_DEFAULT_FAILURE_SCOPE = "P4_to_P7"


def scope_for_failure(failure_class, *bundle_hints):
    """Return the minimal downstream_revalidate_scope a fix for `failure_class`
    invalidates (§11), widened by any inherited bundle hints. Never returns a
    scope narrower than the failure implies; unknown classes get the wide default.
    Advisory only — this drives navigation, never pass authority."""
    base = _FAILURE_SCOPE.get(failure_class, _DEFAULT_FAILURE_SCOPE)
    return compute_downstream_revalidate_scope(base, *bundle_hints)

def compute_downstream_revalidate_scope(*scopes):
    """Given zero or more candidate scopes, return the widest one (or None).
    Unknown scope strings are preserved but ranked below the known ordering."""
    best = None
    best_rank = -1
    for s in scopes:
        if not s:
            continue
        rank = _REVALIDATE_SCOPES.index(s) if s in _REVALIDATE_SCOPES else -1
        if rank > best_rank or (best is None):
            best, best_rank = s, rank
    return best


def repair_budget_exhausted(repair_rounds, max_repair_rounds=2):
    return int(repair_rounds or 0) >= int(max_repair_rounds or 0)


class ControlContractError(Exception):
    """Raised by finalize_control() when it cannot build a COMPLETE navigation
    artifact (non-empty enum failure_class + concrete next action + non-empty
    suspects on FAIL). This is the control layer failing closed on its OWN bug —
    it surfaces a degraded-navigation defect as a loud error instead of silently
    shipping a card/packet a weak model can't act on. It is NOT authoritative
    over the signed manifest and never changes a gate's PASS/FAIL verdict."""


# Canonical next-action vocabulary (S4). A single enum shared by the phase
# memory card and repair packet so the same field never means different things
# depending on which layer wrote last. Advisory / navigation only.
ACTION_CLASSES = (
    "advance", "consent", "run_gate", "prepare_test_bundle",
    "repair", "regenerate", "retry", "human_escalation",
    "await_ci", "complete", "inspect",
)

# S4: legacy / composite next-action tokens gates emitted before the enum was
# unified, mapped to the single ACTION_CLASSES vocabulary. `repair_or_regenerate`
# is composite and resolved by failure class (see action_class_for).
_ACTION_CLASS_ALIASES = {
    "advance_phase": "advance",
    "repair_window": "repair",
    "repair_design": "repair",
    "repair_environment": "repair",
    "escalate": "human_escalation",
    "blocked": "human_escalation",
    "finalize": "complete",
    "await": "await_ci",
}


def action_class_for(token, *, failure_class=None, escalate=False):
    """Normalize any legacy/composite next-action token to a single member of
    ACTION_CLASSES so cards and packets never disagree on vocabulary (S4/A5).

    - escalate=True always wins (a tripped breaker overrides the nominal action).
    - a token already in the enum passes through.
    - `repair_or_regenerate` is resolved by the failure class via the same
      classifier the repair packet uses, so card and packet agree.
    - other known composites map through _ACTION_CLASS_ALIASES.
    - an unrecognized token degrades to 'repair' (something needs fixing) rather
      than shipping an out-of-enum value. Advisory only — never a verdict input."""
    if escalate:
        return "human_escalation"
    if token in ACTION_CLASSES:
        return token
    if token == "repair_or_regenerate":
        base = classify_repair_vs_regenerate(failure_class)
        return "regenerate" if base == "regenerate" else "repair"
    return _ACTION_CLASS_ALIASES.get(token, "repair")



def normalize_suspect_locations(raw):
    """S3: sanitize a list of structured suspect locations to {file,line,rule,
    message} dicts the repair-packet schema accepts.

    Backfill only — sourced from artifacts each gate ALREADY parses (code_ruleset
    / file_hygiene `--json` findings, build.log error lines, gtest failure xml),
    so no new parser is introduced. Entries without a usable `file` are dropped
    (a location with no file cannot direct a fix); a non-int line becomes null;
    rule/message are coerced to str-or-null. Deduped on (file,line,rule,message),
    order-preserving. Never raises: a malformed entry is skipped, not fatal, so a
    backfill bug can never turn a FAIL packet into a hard error. Advisory only."""
    out = []
    seen = set()
    for item in (raw or []):
        if not isinstance(item, dict):
            continue
        f = item.get("file")
        if not f or not isinstance(f, str):
            continue
        line = item.get("line")
        line = line if isinstance(line, int) and not isinstance(line, bool) else None
        rule = item.get("rule")
        rule = rule if isinstance(rule, str) else None
        msg = item.get("message")
        msg = msg if isinstance(msg, str) else None
        key = (f, line, rule, msg)
        if key in seen:
            continue
        seen.add(key)
        out.append({"file": f, "line": line, "rule": rule, "message": msg})
    return out


def suspect_locations_from_findings_json(pdir, rel):
    """S3 backfill: read a findings JSON a guard ALREADY wrote (code_ruleset /
    file_hygiene `--json` output: {"findings": [{file,line,rule_id,message|
    remediation}]}) and map it to suspect_location dicts. No new parsing — it
    consumes the artifact the gate produced. Fail-soft: a missing/garbled file
    yields [] (suspect_files still carries the fallback). `rel` is relative to
    the pipeline dir, matching how the gates pass evidence paths."""
    path = rel if os.path.isabs(rel) else os.path.join(pdir, rel)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError):
        return []
    findings = data.get("findings") if isinstance(data, dict) else data
    out = []
    for item in (findings or []):
        if not isinstance(item, dict):
            continue
        out.append({
            "file": item.get("file"),
            "line": item.get("line"),
            "rule": item.get("rule_id") or item.get("rule"),
            "message": item.get("message") or item.get("remediation"),
        })
    return normalize_suspect_locations(out)


_DIAG_RE = re.compile(
    r"^\s*(?P<file>[^\s:][^:]*?):(?P<line>\d+)(?::\d+)?:\s*"
    r"(?:fatal\s+)?error\s*:\s*(?P<message>.*)$")


def suspect_locations_from_compiler_lines(lines):
    """S3 backfill for P4: extract {file,line,message} from GCC/Clang-style
    diagnostic lines the build gate ALREADY distilled (e.g. error_distill.txt's
    marker hits). Not a new build-log parser — it reads the lines the gate kept,
    matching only the canonical 'path:line:col: error: msg' form and ignoring
    anything else. Fail-soft and bounded; advisory only (suspect_files stays the
    fallback)."""
    out = []
    for ln in (lines or []):
        m = _DIAG_RE.match(ln or "")
        if not m:
            continue
        out.append({
            "file": m.group("file").strip(),
            "line": int(m.group("line")),
            "rule": "compile_error",
            "message": (m.group("message") or "").strip()[:300],
        })
    return normalize_suspect_locations(out)


def suspect_locations_from_gtest_xml(result_xml_paths):
    """S3 backfill for gtest phases (P5 unit, P7 integration): extract
    {file,line,rule,message} for FAILING testcases from the gtest result xmls
    the gate ALREADY parses. gtest emits `file`/`line` attributes on each
    <testcase> plus a <failure message="..."> child; we read exactly those — no
    new parser. Falls back to the source file the <failure> message names
    (path:line:) when the testcase carries no file attr, and to
    "Suite.Case" when neither is available. Fail-soft: an unparsable xml is
    skipped. Advisory only (suspect_tests stays the base fallback)."""
    locs = []
    for path in (result_xml_paths or []):
        try:
            root = ET.parse(path).getroot()
        except Exception:
            continue
        for tc in root.iter("testcase"):
            fail = next((c for c in tc if c.tag in ("failure", "error")), None)
            if fail is None:
                continue
            suite = tc.get("classname") or ""
            name = tc.get("name") or ""
            msg = (fail.get("message") or (fail.text or "")).strip()
            f = tc.get("file")
            line = tc.get("line")
            if not f and msg:
                m = re.match(r"\s*([^\s:][^:]*?):(\d+)", msg)
                if m:
                    f, line = m.group(1), m.group(2)
            locs.append({
                "file": f or ("%s.%s" % (suite, name) if suite else name),
                "line": int(line) if (line and str(line).isdigit()) else None,
                "rule": "gtest_failure",
                "message": msg[:300] or ("%s.%s failed" % (suite, name)),
            })
    return normalize_suspect_locations(locs)


def suspect_locations_from_ci_codecheck(ci_json):
    """S3/H6 backfill for P8: map already-fetched CI codecheck defects to
    suspect_location dicts so an upload FAIL can report WHICH defect class the
    remote codecheck flagged, instead of an opaque `overall_result`.

    Consumes the JSON the CI script ALREADY emits (`report["codecheck"]
    ["tasks"][].defects[]`, each a normalize_codecheck_defect dict with
    file/line/rule/content) — no new fetch, no new parser. Purely advisory:
    the P8 verdict stays bound to `overall_result` + head-SHA. Fail-soft — a
    missing/garbled codecheck block yields [] (suspect_files keeps the fallback).
    Bounded so a defect flood cannot bloat the packet."""
    if not isinstance(ci_json, dict):
        return []
    codecheck = ci_json.get("codecheck")
    if not isinstance(codecheck, dict):
        return []
    out = []
    for task in codecheck.get("tasks", []) or []:
        if not isinstance(task, dict):
            continue
        for d in task.get("defects", []) or []:
            if not isinstance(d, dict):
                continue
            line = d.get("line")
            if isinstance(line, str) and line.strip().isdigit():
                line = int(line.strip())
            out.append({
                "file": d.get("file") or d.get("file_name"),
                "line": line,
                "rule": d.get("rule") or d.get("rule_id") or d.get("checker"),
                "message": (str(d.get("content") or "").strip()[:300]) or None,
            })
    # Bound the backfill: a red codecheck can carry hundreds of defects; the
    # packet only needs enough to name the classes, not the whole report.
    return normalize_suspect_locations(out)[:50]


def finalize_control(pdir, *, phase, phase_name, verdict, repair_packet_parts,
                     failure_class=None, suspect_files=None, suspect_tests=None,
                     suspect_locations=None,
                     problems=None, last_failure_reason=None, must_rerun=None,
                     recommended_next_action=None, next_action_class=None,
                     forbidden_actions=None, downstream_scope=None,
                     bundle_revision_from="", max_repair_rounds=2,
                     max_retry_rounds=2, best_effort=True):
    """Single control-layer exit point a gate calls on FAIL (and, for the
    phases that had none, this is what finally gives them a repair packet).

    Guarantees, on FAIL, that BOTH a repair packet and a phase memory card exist
    with a non-empty failure_class, a concrete recommended_next_action, and a
    non-empty suspect list (suspect_files falls back so it is never empty). The
    memory card's next_expected_action_class is drawn from ACTION_CLASSES.

    Raises ControlContractError if a complete FAIL packet cannot be built — the
    control layer fails closed on its own bug rather than emitting degraded
    navigation. NEVER authoritative over the signed manifest; callers must not
    gate a verdict on anything this returns.

    Returns {"repair_packet": <dict|None>, "memory_card_rel": <str>}."""
    if verdict != "FAIL":
        # PASS path is handled by each gate's own completion-controls writer;
        # finalize_control is the FAIL contract enforcer.
        return {"repair_packet": None, "memory_card_rel": None}

    if not failure_class:
        raise ControlContractError(
            "phase %s FAIL requires a non-empty failure_class" % phase)

    # Suspect fallback (A4): never ship an empty suspect list. Prefer the
    # explicit suspects; else the files named by structured suspect_locations
    # (S3); else the changed functional files; else the failure class itself as
    # a placeholder so the packet is still actionable.
    locations = normalize_suspect_locations(suspect_locations)
    suspects = list(suspect_files or [])
    if not suspects and locations:
        # backfill from the structured findings so files & locations agree
        seen = set()
        for loc in locations:
            f = loc.get("file")
            if f and f not in seen:
                seen.add(f)
                suspects.append(f)
    if not suspects:
        suspects = [failure_class]
        (problems := list(problems or [])).append(
            "suspects_unavailable: fell back to failure_class placeholder")

    base_action = recommended_next_action or classify_repair_vs_regenerate(
        failure_class)
    rounds = repair_round_metadata(
        read_control_json(pdir, *repair_packet_parts) or {},
        phase=phase, bundle_revision_from=bundle_revision_from or "",
        recommended_next_action=base_action, failure_class=failure_class,
        max_repair_rounds=max_repair_rounds, max_retry_rounds=max_retry_rounds)
    escalate = rounds["human_escalation_needed"]
    final_action = "human_escalation" if escalate else base_action

    action_class = next_action_class or (
        "human_escalation" if escalate else
        "regenerate" if base_action == "regenerate" else "repair")
    if action_class not in ACTION_CLASSES:
        raise ControlContractError(
            "phase %s next_action_class %r not in ACTION_CLASSES" % (phase, action_class))

    packet = {
        "phase": phase,
        "phase_name": phase_name,
        "active": True,
        "failure_class": failure_class,
        "suspect_files": suspects,
        "suspect_locations": locations,
        "suspect_tests": list(suspect_tests or []),
        "must_rerun": list(must_rerun or []),
        "downstream_revalidate_scope": scope_for_failure(failure_class, downstream_scope),
        "last_failure_reason": last_failure_reason,
        "problems": list(problems or []),
        "bundle_revision_from": bundle_revision_from or "",
        "fallback_key": rounds["fallback_key"],
        "max_retry_rounds": max_retry_rounds,
        "max_repair_rounds": max_repair_rounds,
        "retry_rounds": rounds["retry_rounds"],
        "repair_rounds": rounds["repair_rounds"],
        "human_escalation_needed": escalate,
        "escalation_note": rounds["escalation_note"],
        "recommended_next_action": final_action,
    }
    written = write_repair_packet(pdir, repair_packet_parts, packet,
                                  best_effort=best_effort)
    if not written or not written.get("validation", {}).get("ok", True):
        raise ControlContractError(
            "phase %s repair packet failed control-schema validation: %s"
            % (phase, (written or {}).get("validation")))

    card = write_gate_phase_memory_card(
        pdir, phase, phase_name, verdict="FAIL",
        current_blocker=last_failure_reason or failure_class,
        forbidden_actions=list(forbidden_actions or []),
        next_expected_action_class=action_class,
        last_failure_class=failure_class,
        human_escalation_needed=escalate,
        primary_entry_doc=controls_relpath("next_action.json"))
    if not card.get("validation", {}).get("ok", True):
        raise ControlContractError(
            "phase %s memory card failed control-schema validation: %s"
            % (phase, card.get("validation")))

    return {"repair_packet": packet, "memory_card_rel": card.get("rel")}



# --- device evidence trust ordering (§17) -----------------------------------
# Strongest proof first. A weak model resolving conflicting device evidence must
# trust the earlier kinds over the later ones: a plain log marker is the weakest
# claim, while process provenance + artifact load + real side effects + a
# negative-control differential together prove the target actually ran.
DEVICE_EVIDENCE_PRIORITY = (
    "process_provenance",
    "artifact_loaded",
    "side_effect",
    "differential",
    "runtime_e2e_marker",
    "plain_marker",
)


def device_evidence_priority():
    """Return the ordered device evidence trust list (strongest first)."""
    return list(DEVICE_EVIDENCE_PRIORITY)


# The strong P4 anchors a device_case can declare. When a case declares NONE of
# them, P4 can only prove "the marker appeared" (plain_marker, §17's weakest
# tier): it cannot prove the target process ran the target artifact and produced
# a real side effect. gate_design.py warns (or, by default, refuses) so a weak
# model does not silently ship a design whose device proof is the weakest kind.
DEVICE_STRONG_ANCHORS = ("process", "artifact_loaded", "side_effect", "absent_before_trigger")


def device_case_anchor_strength(case):
    """Return the list of strong anchors a single (parsed) device_case declares.

    A parsed case carries None/False defaults for undeclared anchors, so an empty
    result means the case reduces P4 to plain_marker."""
    case = case or {}
    declared = []
    for key in DEVICE_STRONG_ANCHORS:
        val = case.get(key)
        if key == "absent_before_trigger":
            if val:  # only a True differential counts as a declared anchor
                declared.append(key)
        elif val:
            declared.append(key)
    return declared


def weak_device_cases(device_cases):
    """Return [(index, id/desc)] for parsed device_cases that declare NO strong
    anchor — i.e. those that would leave P4 at plain_marker strength."""
    weak = []
    for i, c in enumerate(device_cases or []):
        if not device_case_anchor_strength(c):
            weak.append((i, (c or {}).get("id") or (c or {}).get("desc") or "device_case[%d]" % i))
    return weak


def retry_budget_exhausted(retry_rounds, max_retry_rounds=2):
    return int(retry_rounds or 0) >= int(max_retry_rounds or 0)


def secret_path(run_id):
    return os.path.join(SECRET_ROOT, run_id)


# ----------------------------------------------------------------------------
# state (pipeline.json) — read freely; only advance.py mutates phase status
# ----------------------------------------------------------------------------
def load_state(pdir, allow_legacy=False):
    """Load pipeline.json.

    Path B1 fail-closed guard: a run stamped with the old 7-phase scheme (or an
    unstamped legacy run whose ``phases`` array is not the 9-phase 0-8 layout) is
    REFUSED here rather than silently reinterpreted under the new phase numbers —
    reinterpreting phase 2 (old build_verify) as the new feature_develop would
    corrupt the truth layer. ``allow_legacy=True`` (used only by ``advance.py
    migrate``) bypasses the guard so the old state can be read and rewritten.
    """
    with open(state_path(pdir), "r", encoding="utf-8") as f:
        state = json.load(f)
    if allow_legacy:
        return state
    scheme = state.get("phase_scheme")
    n_phases = len(state.get("phases", []))
    if scheme != PHASE_SCHEME or n_phases != len(PHASES):
        sys.exit(
            "ERROR: pipeline.json uses an incompatible phase scheme "
            "(phase_scheme=%r, %d phases; this build expects phase_scheme=%d with "
            "%d phases 0-%d).\n"
            "  This run predates the Path B1 9-physical-phase renumber.\n"
            "  If current_phase <= 1, migrate it:  advance.py --pipeline-dir %s migrate\n"
            "  Otherwise it cannot be migrated safely (old phase 1 collapsed three\n"
            "  logical phases into one signed entry); reset and rewalk from P1:\n"
            "  advance.py --pipeline-dir %s reset --reason \"phase-scheme migration\""
            % (scheme, n_phases, PHASE_SCHEME, len(PHASES), MAX_PHASE, pdir, pdir))
    return state


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
    # FAIL-CLOSED: a non-zero git exit (bad git_dir, not a repo, unresolvable base)
    # must NOT be swallowed into an empty path set — that would collapse the
    # functional fingerprint to a constant and make the P1 drift check a no-op
    # (functional code could change and still "match" the lock). Raise instead so
    # the calling gate/advance aborts rather than locking or passing vacuously.
    diff = subprocess.run(["git", "-C", gdir, "diff", "--name-only", base],
                          text=True, capture_output=True)
    others = subprocess.run(["git", "-C", gdir, "ls-files", "--others", "--exclude-standard"],
                            text=True, capture_output=True)
    for label, r in (("git diff", diff), ("git ls-files", others)):
        if r.returncode != 0:
            raise RuntimeError(
                "%s failed in %s (base=%s, rc=%d): %s"
                % (label, gdir, base, r.returncode, (r.stderr or "").strip()))
    changed = diff.stdout.splitlines()
    untracked = others.stdout.splitlines()
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


def _for_requirements(c):
    """Normalized (possibly empty) list of requirement ids a contract item
    references. Accepts the v2 `for_requirements` array; ignores anything else.
    Returns (ok, list, detail)."""
    fr = c.get("for_requirements")
    if fr is None:
        return True, [], ""
    if not isinstance(fr, list):
        return False, None, "for_requirements must be an array"
    for r in fr:
        if not _nonempty_str(r):
            return False, None, "for_requirements entries must be non-empty strings"
    return True, [r.strip() for r in fr], ""


def _parse_side_effect(se, where):
    """Validate/normalize a device_case side_effect. Only `shell_assert` is
    supported in v2.0. Returns (ok, normalized_or_None, detail)."""
    if se is None:
        return True, None, ""
    if not isinstance(se, dict):
        return False, None, "%s.side_effect must be an object" % where
    typ = se.get("type")
    if typ != "shell_assert":
        return False, None, "%s.side_effect.type must be 'shell_assert'" % where
    if not _nonempty_str(se.get("command")):
        return False, None, "%s.side_effect.command must be a non-empty string" % where
    if not _nonempty_str(se.get("expect")):
        return False, None, "%s.side_effect.expect must be a non-empty string" % where
    return True, {"type": "shell_assert", "command": se["command"].strip(),
                  "expect": se["expect"].strip()}, ""


def parse_ar_contract(text):
    """Parse+validate the ```ar-contract``` JSON block. Fail-closed like
    parse_review_report_zero_issues. Returns (ok, contract, detail).

    Parse-compatible across two schema versions (the *gate* decides which is
    required; new runs demand v2 at gate_design, legacy v1 still parses):

      v1 (all three arrays non-empty):
        build_artifacts : [non-empty str]
        test_cases      : [{point, gtest:"Suite.Case"}]
        device_cases    : [{desc, marker}]

      v2 (adds, backward-compatible):
        requirements    : [{id, desc}]                      (ids unique)
        changed_files   : [{id?, path, for_requirements?}]  (or [non-empty str])
        build_artifacts : [{id?, path, for_requirements?}]  (or [non-empty str])
        test_cases[]    : + id?, for_requirements?
        device_cases[]  : + id?, for_requirements?, process?, artifact_loaded?,
                            side_effect?(shell_assert), absent_before_trigger?

    The returned contract is NORMALIZED so existing downstream readers keep
    working unchanged:
      contract["build_artifacts"] -> [path str, ...]   (v2 objects flattened)
      contract["test_cases"]      -> [{point, gtest, ...}]
      contract["device_cases"]    -> [{desc, marker, ...}]  (+v2 fields)
    and enriched with: version, requirements, changed_files (str paths),
    build_artifacts_meta, changed_files_meta.
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

    # ---- version detection (structural, not just the declared field) --------
    declared = str(data.get("contract_version", "")).strip()
    is_v2 = bool(data.get("requirements") is not None
                 or data.get("changed_files") is not None
                 or declared.startswith("2"))

    # ---- requirements (v2) ---------------------------------------------------
    requirements = []
    req_ids = set()
    rq = data.get("requirements")
    if rq is not None:
        if not isinstance(rq, list) or not rq:
            return False, None, "requirements must be a non-empty array"
        for i, r in enumerate(rq):
            if not isinstance(r, dict):
                return False, None, "requirements[%d] must be an object" % i
            rid = r.get("id")
            if not _nonempty_str(rid):
                return False, None, "requirements[%d].id must be a non-empty string" % i
            rid = rid.strip()
            if rid in req_ids:
                return False, None, "requirements[%d].id duplicate: %s" % (i, rid)
            req_ids.add(rid)
            if not _nonempty_str(r.get("desc")):
                return False, None, "requirements[%d].desc must be a non-empty string" % i
            requirements.append({"id": rid, "desc": r["desc"].strip()})

    # ---- build_artifacts (str or object form) --------------------------------
    ba = data.get("build_artifacts")
    if not isinstance(ba, list) or not ba:
        return False, None, "build_artifacts must be a non-empty array"
    ba_paths, ba_meta = [], []
    for i, p in enumerate(ba):
        where = "build_artifacts[%d]" % i
        if isinstance(p, str):
            if not _nonempty_str(p):
                return False, None, "%s must be a non-empty string" % where
            ba_paths.append(p.strip())
            ba_meta.append({"path": p.strip(), "for_requirements": []})
        elif isinstance(p, dict):
            if not _nonempty_str(p.get("path")):
                return False, None, "%s.path must be a non-empty string" % where
            ok, fr, det = _for_requirements(p)
            if not ok:
                return False, None, "%s.%s" % (where, det)
            ba_paths.append(p["path"].strip())
            ba_meta.append({"id": p.get("id"), "path": p["path"].strip(),
                            "for_requirements": fr})
        else:
            return False, None, "%s must be a string or object" % where

    # ---- test_cases ----------------------------------------------------------
    tc_raw = data.get("test_cases")
    if not isinstance(tc_raw, list) or not tc_raw:
        return False, None, "test_cases must be a non-empty array"
    tc = []
    for i, c in enumerate(tc_raw):
        where = "test_cases[%d]" % i
        if not isinstance(c, dict):
            return False, None, "%s must be an object" % where
        if not _nonempty_str(c.get("point")):
            return False, None, "%s.point must be a non-empty string" % where
        g = c.get("gtest")
        if not _nonempty_str(g) or not _GTEST_ID_RE.match(g.strip()):
            return False, None, "%s.gtest must be a 'Suite.Case' id" % where
        ok, fr, det = _for_requirements(c)
        if not ok:
            return False, None, "%s.%s" % (where, det)
        tc.append({"id": c.get("id"), "point": c["point"].strip(),
                   "gtest": g.strip(), "for_requirements": fr})

    # ---- device_cases (v1 desc/marker + v2 provenance/side-effect) ----------
    dc_raw = data.get("device_cases")
    if not isinstance(dc_raw, list) or not dc_raw:
        return False, None, "device_cases must be a non-empty array"
    dc = []
    for i, c in enumerate(dc_raw):
        where = "device_cases[%d]" % i
        if not isinstance(c, dict):
            return False, None, "%s must be an object" % where
        if not _nonempty_str(c.get("desc")):
            return False, None, "%s.desc must be a non-empty string" % where
        if not _nonempty_str(c.get("marker")):
            return False, None, "%s.marker must be a non-empty string" % where
        ok, fr, det = _for_requirements(c)
        if not ok:
            return False, None, "%s.%s" % (where, det)
        proc = c.get("process")
        if proc is not None and not _nonempty_str(proc):
            return False, None, "%s.process must be a non-empty string" % where
        art = c.get("artifact_loaded")
        if art is not None:
            if not _nonempty_str(art):
                return False, None, "%s.artifact_loaded must be a non-empty string" % where
            if not art.strip().startswith("/"):
                return False, None, "%s.artifact_loaded must be an absolute device path" % where
        se_ok, se, se_det = _parse_side_effect(c.get("side_effect"), where)
        if not se_ok:
            return False, None, se_det
        abt = c.get("absent_before_trigger", False)
        if not isinstance(abt, bool):
            return False, None, "%s.absent_before_trigger must be a boolean" % where
        dc.append({
            "id": c.get("id"), "desc": c["desc"].strip(),
            "marker": c["marker"].strip(), "for_requirements": fr,
            "process": proc.strip() if _nonempty_str(proc) else None,
            "artifact_loaded": art.strip() if _nonempty_str(art) else None,
            "side_effect": se, "absent_before_trigger": abt,
        })

    # ---- changed_files (v2; str or object form) ------------------------------
    cf_paths, cf_meta = [], []
    cf = data.get("changed_files")
    if cf is not None:
        if not isinstance(cf, list) or not cf:
            return False, None, "changed_files must be a non-empty array"
        for i, p in enumerate(cf):
            where = "changed_files[%d]" % i
            if isinstance(p, str):
                if not _nonempty_str(p):
                    return False, None, "%s must be a non-empty string" % where
                cf_paths.append(p.strip())
                cf_meta.append({"path": p.strip(), "for_requirements": []})
            elif isinstance(p, dict):
                if not _nonempty_str(p.get("path")):
                    return False, None, "%s.path must be a non-empty string" % where
                ok, fr, det = _for_requirements(p)
                if not ok:
                    return False, None, "%s.%s" % (where, det)
                cf_paths.append(p["path"].strip())
                cf_meta.append({"id": p.get("id"), "path": p["path"].strip(),
                                "for_requirements": fr})
            else:
                return False, None, "%s must be a string or object" % where

    version = 2 if is_v2 else 1
    detail = "v%d build_artifacts=%d test_cases=%d device_cases=%d" % (
        version, len(ba_paths), len(tc), len(dc))
    if version == 2:
        detail += " requirements=%d changed_files=%d" % (
            len(requirements), len(cf_paths))
    contract = {
        "version": version,
        "requirements": requirements,
        "build_artifacts": ba_paths,
        "build_artifacts_meta": ba_meta,
        "test_cases": tc,
        "device_cases": dc,
        "changed_files": cf_paths,
        "changed_files_meta": cf_meta,
    }
    return True, contract, detail


# Placeholder tokens that a weak model tends to leave in a "finished" design.
# Whole-word / bracket matches only, so real prose ("todos are tracked in ...")
# doesn't trip it. Case-insensitive.
_PLACEHOLDER_RE = re.compile(
    r"(?<![A-Za-z0-9])(?:TODO|TBD|FIXME|XXX|待补充|待定|占位|placeholder|"
    r"<[^>\n]*(?:待填|fill[- ]?in|your[- ]?\w+)[^>\n]*>|\.\.\.\.\.+)"
    r"(?![A-Za-z0-9])", re.IGNORECASE)


def find_placeholders(text, limit=20):
    """Return up to `limit` (line_no, snippet) placeholder hits in prose. Used by
    gate_design to reject a design a weak model left half-filled. Lines inside the
    ```ar-contract``` fenced block are excluded — the contract is validated
    structurally, and its string values may legitimately contain such tokens."""
    contract_spans = [(m.start(), m.end())
                      for m in _AR_CONTRACT_FENCE_RE.finditer(text or "")]

    def _in_contract(pos):
        return any(s <= pos < e for s, e in contract_spans)

    hits = []
    offset = 0
    for line in (text or "").splitlines(keepends=True):
        m = _PLACEHOLDER_RE.search(line)
        if m and not _in_contract(offset + m.start()):
            lineno = (text[:offset].count("\n") if text else 0) + 1
            hits.append((lineno, line.strip()[:120]))
            if len(hits) >= limit:
                break
        offset += len(line)
    return hits


def check_contract_closure(contract):
    """v2 reference-closure: every requirement is covered by >=1 of
    changed_files / test_cases / device_cases, and every for_requirements ref
    points at a real requirement id. Returns (ok, problems:list[str]).

    v1 contracts (no requirements) have nothing to close -> (True, [])."""
    if not contract or contract.get("version") != 2:
        return True, []
    problems = []
    req_ids = {r["id"] for r in contract.get("requirements", [])}
    if not req_ids:
        problems.append("v2 contract has no requirements")

    def _refs(items):
        out = set()
        for it in items:
            for r in it.get("for_requirements", []) or []:
                out.add(r)
        return out

    cf_refs = _refs(contract.get("changed_files_meta", []))
    ba_refs = _refs(contract.get("build_artifacts_meta", []))
    tc_refs = _refs(contract.get("test_cases", []))
    dc_refs = _refs(contract.get("device_cases", []))
    all_refs = cf_refs | ba_refs | tc_refs | dc_refs

    # dangling references (point at a requirement that doesn't exist)
    for r in sorted(all_refs - req_ids):
        problems.append("for_requirements references unknown requirement '%s'" % r)

    # uncovered requirements (no changed_files/test/device pins it)
    covering = cf_refs | tc_refs | dc_refs
    for rid in sorted(req_ids - covering):
        problems.append("requirement '%s' not covered by any changed_files/"
                        "test_cases/device_cases" % rid)

    return (not problems), problems


def test_target_from_gtest(gtest_id):
    """Suite name from a "Suite.Case" gtest id (drops the '.Case' and any '/param')."""
    if not gtest_id:
        return None
    suite = str(gtest_id).split(".", 1)[0].strip()
    suite = suite.split("/", 1)[0].strip()
    return suite or None


def collect_test_intent_matrix(contract, changed_files):
    """Derive the per-test-case intent matrix from a signed ar-contract. Shared by
    prepare_test_bundle.py and gate_test_develop.py (moved here in Path B1 so the
    signed phase-3 gate need not import a sibling gate)."""
    matrix = []
    for tc in contract.get("test_cases", []) or []:
        gtest_id = tc.get("gtest")
        matrix.append({
            "test_case_id": tc.get("id") or gtest_id,
            "covers_requirement_ids": tc.get("for_requirements") or [],
            "expected_target": test_target_from_gtest(gtest_id),
            "expected_suite": test_target_from_gtest(gtest_id),
            "expected_gtest": gtest_id,
            "depends_on_files": changed_files,
            "negative_cases": [],
            "device_followup_needed": bool(tc.get("for_requirements") and any(
                set(tc.get("for_requirements") or []) &
                set(dc.get("for_requirements") or [])
                for dc in (contract.get("device_cases") or [])
            )),
        })
    return matrix


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
    # EVIDENCE-EPOCH BARRIER: a `reset` (or verify-all drift-rewind) records the
    # manifest length at rewind time in state["evidence_epoch"]. The manifest is
    # append-only, so any PASS emitted *before* the rewind has seq < epoch. Such
    # a stale PASS survives the HMAC/chain/artifact checks intact, which would
    # otherwise let `advance --phase N` re-close on pre-fix evidence without the
    # gate ever re-running. Requiring seq >= epoch forces a FRESH gate run (whose
    # PASS is appended after the reset marker) before the phase can close again.
    epoch = state.get("evidence_epoch")
    if isinstance(epoch, int) and epoch > 0:
        seq = entry.get("seq")
        if not isinstance(seq, int) or seq < epoch:
            return (False, "phase %d PASS is pre-reset evidence (seq=%s < epoch=%d); "
                    "re-run its gate after the reset" % (phase, seq, epoch), entry)
    if not verify_sig(entry, secret):
        return False, "HMAC mismatch on phase %d entry (tampered/forged)" % phase, entry
    for art in entry.get("artifacts", []):
        ap = os.path.join(pdir, art["path"])
        if not os.path.exists(ap):
            return False, "artifact vanished: %s" % art["path"], entry
        if sha256_file(ap) != art["sha256"]:
            return False, "artifact altered (sha256 mismatch): %s" % art["path"], entry
    return True, "ok", entry


def phase_state(state, phase):
    for pe in state.get("phases", []):
        if pe.get("id") == phase:
            return pe
    return None


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
