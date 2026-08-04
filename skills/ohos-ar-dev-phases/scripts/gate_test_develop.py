#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
gate_test_develop.py — Phase 3 (test-develop): the signed gate that proves the
core design promise "write feature code + test code FIRST, then compile".

Physical phase 3 sits between feature_develop (phase 2) and build_verify (phase
4). It closes on a REAL signed manifest record — `gl.emit(pdir, 3, ...)` — so
`advance.py advance --phase 3` can only pass when this gate genuinely ran. It is
the truth layer for test AUTHORSHIP; test EXECUTION stays in phase 5
(gate_test_ut.py). The distinction is deliberate:

  * AUTHORSHIP (here): for every test_cases[].gtest "Suite.Case" declared in the
    signed ar-contract, a NEW test file (added after the phase-2 feature freeze)
    must exist and name that suite. This proves the tests were written before the
    build, without needing a toolchain to run them.
  * EXECUTION (phase 5): those same gtests must actually PASS in freshly produced
    result xmls.

Contract handling mirrors gate_develop / gate_test_ut:
  * absent  (legacy / no signed design / no contract) -> AR-CONTRACT-BYPASS PASS;
  * tampered (design entry exists but evidence/contract broken) -> FAIL-closed;
  * ok       -> enforce full authorship coverage.

The authored test source files are bound into the signed record as artifacts
(sha256), so a later delete/rewrite of a test file is caught by
validate_closing_entry when advance.py re-checks the closing entry.

Best-effort control-layer navigation (signed_test_scope.json / test_intent_matrix
/ status) is still produced via prepare_test_bundle.run_prepare so downstream
phases keep their suspect-scope map — but that layer never grants pass authority.
"""
import argparse
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402
import prepare_test_bundle as ptb  # noqa: E402

PHASE = 3
GATE = "gate_test_develop.py"
REPAIR_PACKET_PARTS = ("repairs", "current.json")
FREEZE_PARTS = ("test_develop", "development_freeze_snapshot.json")

# Same guard P2 uses. In P3 we run it RULES-ONLY: gtest macro bodies legitimately
# vary in layout so clang-format must not block authorship, but banned APIs /
# sensitive strings in the *test* code must be caught here rather than leaking to
# the CI gate. resolve_dep mirrors gate_develop so both phases share one source.
STYLE_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/code_ruleset_guard.py",
                             env_var="CODE_RULESET_GUARD")
PREWRITE_CONTRACT = gl.resolve_dep(
    "code-ruleset-style-check/references/pre-write-contract.md",
    env_var="CODE_RULESET_PREWRITE_CONTRACT")
# H1: same author-time file-hygiene guard P2 uses (license header). Test files
# were never header-gated before P4/CI either, so run it here over the newly
# authored tests so a missing header is caught at author time, not at CI.
HYGIENE_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/file_hygiene_guard.py",
                               env_var="FILE_HYGIENE_GUARD")
CXX_EXTS = (".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx")


def _rule_check_new_tests(pdir, gdir, new_tests):
    """Run the code_ruleset guard (rules-only) over newly authored C/C++ test
    files. Returns (problems, evidence_rel). A missing guard fails closed so a
    silent bypass can never masquerade as a clean check."""
    cxx = [t for t in new_tests if os.path.splitext(t)[1].lower() in CXX_EXTS]
    rel = "evidence/phase3/test_style_report.txt"
    out = os.path.join(pdir, rel)
    if not cxx:
        with open(out, "w", encoding="utf-8") as f:
            f.write("no C/C++ test files authored — code_ruleset rule check has no scope\n")
        return [], rel
    if not os.path.exists(STYLE_GUARD):
        with open(out, "w", encoding="utf-8") as f:
            f.write("BLOCKER: code_ruleset guard not found at %s\n" % STYLE_GUARD)
        return ["code-ruleset-style-check guard missing: %s" % STYLE_GUARD], rel
    if not os.path.exists(PREWRITE_CONTRACT):
        with open(out, "w", encoding="utf-8") as f:
            f.write("BLOCKER: code-ruleset pre-write contract not found at %s\n" % PREWRITE_CONTRACT)
        return ["code-ruleset pre-write contract missing: %s" % PREWRITE_CONTRACT], rel
    abs_cxx = [os.path.join(gdir, t) for t in cxx if os.path.isfile(os.path.join(gdir, t))]
    json_rel = "evidence/phase3/test_style_findings.json"
    cp = subprocess.run(
        [sys.executable, STYLE_GUARD, "--rules-only", "--json",
         os.path.join(pdir, json_rel), *abs_cxx],
        text=True, capture_output=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write("test files rule-checked (%d):\n%s\n\n"
                "--- code_ruleset_guard --rules-only ---\nrc=%d\n%s\n%s"
                % (len(cxx), "\n".join(cxx), cp.returncode, cp.stdout, cp.stderr))
    problems = []
    if cp.returncode != 0:
        problems.append(
            "test code violates code_ruleset blockers (fix before build so it "
            "does not surface at the CI gate): %s" % (cp.stderr or cp.stdout).strip()[:600])
    return problems, rel


def _hygiene_check_new_tests(pdir, gdir, new_tests):
    """H1: run the deterministic file-hygiene guard (license header) over newly
    authored test files. Returns (problems, evidence_rel). A missing guard fails
    closed so a silent bypass cannot masquerade as clean. The guard self-scopes
    to header-bearing extensions, so we pass every new test file on disk."""
    rel = "evidence/phase3/test_hygiene_report.txt"
    out = os.path.join(pdir, rel)
    abs_paths = [os.path.join(gdir, t) for t in new_tests
                 if os.path.isfile(os.path.join(gdir, t))]
    if not os.path.exists(HYGIENE_GUARD):
        with open(out, "w", encoding="utf-8") as f:
            f.write("BLOCKER: file_hygiene guard not found at %s\n" % HYGIENE_GUARD)
        return ["file-hygiene guard missing: %s" % HYGIENE_GUARD], rel
    json_rel = "evidence/phase3/test_hygiene_findings.json"
    cp = subprocess.run(
        [sys.executable, HYGIENE_GUARD, "--json", os.path.join(pdir, json_rel), *abs_paths],
        text=True, capture_output=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write("test files hygiene-checked (%d):\nrc=%d\n%s\n%s"
                % (len(abs_paths), cp.returncode, cp.stdout, cp.stderr))
    problems = []
    if cp.returncode != 0:
        problems.append(
            "authored test file missing license header (fix before build so it "
            "does not surface at the CI gate): %s" % (cp.stderr or cp.stdout).strip()[:600])
    return problems, rel


def _new_test_paths(state, freeze):
    """Paths present now, classed as test, that were NOT in the phase-2 freeze.
    These are the files that must carry the authored test suites."""
    frozen = set(freeze.get("locked_all_paths") or freeze.get("changed_files") or [])
    out = []
    for p in gl._changed_paths(state):
        if p in frozen:
            continue
        if gl.classify_path(p) == "test":
            out.append(p)
    return out


def _suites_referenced(gdir, test_paths):
    """Map each readable new test file -> set of gtest suite tokens it references.
    A suite is 'referenced' when its name appears in the file text (covers
    TEST(Suite,Case) / TEST_F(Suite,Case) / TYPED_TEST(Suite,...) and BUILD.gn
    target wiring alike — authorship, not a compiler parse)."""
    per_file = {}
    for rel in test_paths:
        ap = os.path.join(gdir, rel)
        if not os.path.isfile(ap):
            continue
        try:
            with open(ap, "r", encoding="utf-8", errors="replace") as f:
                per_file[rel] = f.read()
        except OSError:
            continue
    return per_file


def _suite_registered(text, suite, macro_re):
    """True iff `suite` is the fixture/suite name of a real gtest macro in `text`.
    We first find every gtest-macro head (TEST/TEST_F/...), then check the suite
    token that the macro opened on. A bare mention (comment, string, BUILD.gn
    target name) never matches — only an actual `MACRO(<...::>suite`."""
    for m in macro_re.finditer(text):
        # m.group(0) is e.g. "TEST_F(Test :: FooManagerTest" — the last ::-segment
        # is the suite/fixture the macro registers.
        opened = m.group(0).split("(", 1)[1]
        last_seg = opened.split("::")[-1].strip()
        if last_seg == suite:
            return True
    return False


def _coverage(contract, gdir, test_paths):
    """Return (required_gtests, covered, missing, evidence_lines). A required
    gtest is covered when some NEW test file's text references its suite AND that
    reference is a real gtest registration — a `TEST(`/`TEST_F(`/`TEST_P(`/
    `TYPED_TEST(`/`TYPED_TEST_P(` macro with the suite as its first argument
    (allowing `::`-qualified names, e.g. `Test::FooManagerTest`). A bare suite
    name in a comment, a string literal, or free text does NOT count: that would
    let `// FooManagerTest coming soon` pass P3 with zero real test code."""
    file_text = _suites_referenced(gdir, test_paths)
    required = [tc.get("gtest") for tc in (contract.get("test_cases") or []) if tc.get("gtest")]
    covered, missing, lines = [], [], []
    # matches TEST(FooManagerTest, Case) / TEST_F(Test::FooManagerTest, ...) ...
    _GTEST_MACRO_RE = re.compile(
        r"\b(?:TEST|TEST_F|TEST_P|TYPED_TEST|TYPED_TEST_P)\s*\(\s*"
        r"([A-Za-z_][A-Za-z0-9_]*\s*::\s*)*[A-Za-z_][A-Za-z0-9_]*")
    for gtest in required:
        suite = gl.test_target_from_gtest(gtest)
        hit = None
        if suite:
            for rel, text in file_text.items():
                if _suite_registered(text, suite, _GTEST_MACRO_RE):
                    hit = rel
                    break
        if hit:
            covered.append(gtest)
            lines.append("[OK ] %s -> suite %s in %s" % (gtest, suite, hit))
        else:
            missing.append(gtest)
            lines.append("[MISS] %s -> suite %s not found in any new test file" % (gtest, suite))
    return required, covered, missing, lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    gdir = gl.resolve_git_dir(state)
    gl.evidence_dir(pdir, PHASE)

    # The freeze snapshot (written at phase-2 close) is the entry precondition:
    # without it there is no frozen feature bundle to author tests over.
    freeze = gl.read_control_json(pdir, *FREEZE_PARTS)
    if not freeze:
        gl.emit(pdir, PHASE, GATE, verdict="FAIL",
                reason="missing development_freeze_snapshot — run gate_develop.py (phase 2) first",
                artifacts_rel=[])
        gl.write_failure_report(pdir, PHASE, GATE,
                                "development freeze snapshot missing",
                                resume_hint="先跑 gate_develop.py 完成 phase 2 冻结")
        sys.exit("PHASE 3 FAIL: development_freeze_snapshot missing — run gate_develop.py first")

    # FEATURE FREEZE: after phase 2 locked the functional fingerprint, only NEW
    # test files may appear. Any non-test path added since freeze is a violation
    # (mirrors prepare_test_bundle._verify_feature_freeze, reused directly).
    current_paths = gl._changed_paths(state)
    prefixes = ptb._pipeline_internal_prefixes(pdir, state)
    if prefixes:
        current_paths = [p for p in current_paths
                         if not any(p == pref[:-1] or p.startswith(pref) for pref in prefixes)]
    frozen_paths = freeze.get("locked_all_paths") or freeze.get("changed_files") or []
    non_test_extra = [p for p in current_paths
                      if p not in frozen_paths and gl.classify_path(p) != "test"]

    new_tests = _new_test_paths(state, freeze)
    files_rel = "evidence/phase3/new_test_files.txt"
    with open(os.path.join(pdir, files_rel), "w", encoding="utf-8") as f:
        f.write("new test files (added since phase-2 feature freeze):\n")
        f.write("\n".join(new_tests) or "(none)")
        f.write("\n")
    arts = [files_rel]

    # RULE CHECK the authored test code now (rules-only). Test files were never
    # style-gated before P4/CI, so banned APIs in tests leaked straight to the CI
    # gate — this closes that gap at author time.
    style_problems, style_rel = _rule_check_new_tests(pdir, gdir, new_tests)
    arts.append(style_rel)

    # H1 FILE HYGIENE: license-header mirror of the CI file check over the newly
    # authored test files. Blocking, fail-closed — same as P2.
    hygiene_problems, hygiene_rel = _hygiene_check_new_tests(pdir, gdir, new_tests)
    arts.append(hygiene_rel)

    # CONTRACT AUTHORSHIP COVERAGE: recover the contract from the SIGNED design.
    c_ok, contract, c_detail = gl.load_signed_contract(pdir)
    contract_status = "ok" if c_ok else ""
    required, covered, missing, cov_lines = [], [], [], []
    if c_ok:
        required, covered, missing, cov_lines = _coverage(contract, gdir, new_tests)
        cov_rel = "evidence/phase3/authorship_coverage.txt"
        with open(os.path.join(pdir, cov_rel), "w", encoding="utf-8") as f:
            f.write("required test_cases (from signed ar-contract): %d\n" % len(required))
            f.write("new test files scanned: %d\n\n" % len(new_tests))
            f.write("\n".join(cov_lines) or "(no test_cases in contract)")
            f.write("\n")
        arts.append(cov_rel)
        # Snapshot the authored test sources into the evidence dir and bind the
        # snapshots (sha256) into the signed record — mirrors gate_develop's
        # diff.patch capture. hash_artifacts resolves paths under pdir, and the
        # real sources live in the repo (gdir), so we copy rather than reference
        # them across roots. The snapshot is the immutable proof that these tests
        # were authored at gate time; validate_closing_entry re-checks the copies
        # when advance.py closes phase 3.
        snap_dir = os.path.join(pdir, "evidence", "phase3", "authored")
        os.makedirs(snap_dir, exist_ok=True)
        for t in new_tests:
            src = os.path.join(gdir, t)
            if not os.path.isfile(src):
                continue
            flat = t.replace("/", "__")
            snap_rel = "evidence/phase3/authored/%s" % flat
            with open(src, "r", encoding="utf-8", errors="replace") as sf, \
                    open(os.path.join(pdir, snap_rel), "w", encoding="utf-8") as df:
                df.write(sf.read())
            arts.append(snap_rel)
    elif "absent" in (c_detail or ""):
        contract_status = "absent"
    else:
        gl.emit(pdir, PHASE, GATE, verdict="FAIL",
                reason="ar-contract unrecoverable: %s" % c_detail, artifacts_rel=arts)
        gl.write_failure_report(pdir, PHASE, GATE,
                                "ar-contract unrecoverable: %s" % c_detail,
                                resume_hint="签名由 gate_design.py 自动生成、严禁手改;重跑 gate_design.py 让它重新生成"
                                            "(改了功能代码则先 advance.py reset 回 P1),再重跑 gate_test_develop.py")
        sys.exit("PHASE 3 FAIL: ar-contract unrecoverable: %s" % c_detail)

    problems = []
    if non_test_extra:
        problems += ["feature freeze violated by non-test path: %s" % p for p in non_test_extra]
    problems += style_problems
    problems += hygiene_problems
    if contract_status == "ok" and missing:
        problems += ["declared test_case not authored (suite not referenced by any new test file): %s"
                     % g for g in missing]
    if contract_status == "ok" and required and not new_tests:
        problems.append("contract declares test_cases but no new test files were authored")

    bypass = " (AR-CONTRACT-BYPASS: %s)" % c_detail if contract_status == "absent" else ""
    reason = ("test-develop authorship: contract=%s, required=%d authored=%d, "
              "new_test_files=%d%s") % (
        contract_status or "n/a", len(required), len(covered), len(new_tests), bypass)
    if missing:
        reason += " MISSING: %s" % ", ".join(missing)
    print(reason)

    verdict = "PASS" if not problems else "FAIL"
    if verdict == "PASS":
        # Best-effort control navigation (signed_test_scope / matrix / status /
        # handoff). run_prepare re-verifies freeze + derives the bundle; it never
        # grants pass authority. A control write failure must not flip the verdict,
        # so it is guarded.
        try:
            ptb.run_prepare(pdir, state)
        except SystemExit:
            # run_prepare._block() calls sys.exit on a control-layer inconsistency.
            # The signed truth (authorship) already passed; surface but do not fail.
            print("WARNING: control-layer bundle derivation reported an issue; "
                  "signed authorship gate still PASSED")
        except Exception as exc:  # pragma: no cover - defensive
            print("WARNING: control-layer bundle derivation failed: %s" % exc)
        gl.write_phase_summary(pdir, PHASE, GATE, "PASS", reason,
                               checks=["feature_freeze", "authorship_coverage"])
        gl.clear_failure_report(pdir, PHASE)
    else:
        gl.write_phase_summary(pdir, PHASE, GATE, "FAIL", reason, checks=problems)
        gl.write_failure_report(pdir, PHASE, GATE, reason, problems=problems,
                                resume_hint="为每个 test_cases.gtest 写引用其 suite 的新测试文件后"
                                            "重跑 gate_test_develop.py（不得改功能代码）")

    if verdict == "PASS":
        gl.write_gate_phase_memory_card(
            pdir, PHASE, "test-develop", verdict="PASS",
            current_blocker=None,
            forbidden_actions=[
                "modify_functional_code_after_feature_freeze",
                "count_test_execution_as_authorship",
                "treat_control_bundle_as_signed_truth",
            ],
            next_expected_action_class="advance",
            last_failure_class=None)
    else:
        # S2: P3 now emits a repair packet (+ FAIL card) via finalize_control so
        # a weak model gets a concrete author/repair route. A style finding is a
        # code_ruleset finding in test code; otherwise authorship is incomplete.
        style_failed = bool(style_problems) or bool(hygiene_problems)
        failure_class = ("test_style_finding" if style_failed
                         else "test_authoring_incomplete")
        # S3: backfill line-level suspects from the findings the guards already
        # wrote for the authored tests. suspect_files stays the fallback.
        suspect_locations = (
            gl.suspect_locations_from_findings_json(
                pdir, "evidence/phase3/test_style_findings.json")
            + gl.suspect_locations_from_findings_json(
                pdir, "evidence/phase3/test_hygiene_findings.json"))
        gl.finalize_control(
            pdir, phase=PHASE, phase_name="test-develop", verdict="FAIL",
            repair_packet_parts=REPAIR_PACKET_PARTS,
            failure_class=failure_class,
            suspect_files=new_tests, suspect_tests=new_tests,
            suspect_locations=suspect_locations,
            problems=problems, last_failure_reason=reason,
            must_rerun=[GATE],
            next_action_class=("repair" if style_failed else "run_gate"),
            forbidden_actions=[
                "modify_functional_code_after_feature_freeze",
                "count_test_execution_as_authorship",
                "treat_control_bundle_as_signed_truth",
            ])
    gl.write_gate_stage_packet_from_def(
        pdir, "test_develop", "test-develop", physical_phase=PHASE)
    gl.emit(pdir, PHASE, GATE, verdict=verdict, reason=reason, artifacts_rel=arts)
    if verdict == "PASS":
        print("PHASE 3 PASS — advance.py advance --phase 3")
    else:
        sys.exit("PHASE 3 FAIL: %s" % reason)


if __name__ == "__main__":
    main()
