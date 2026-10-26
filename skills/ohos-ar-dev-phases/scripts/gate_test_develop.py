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
    signed ar-contract, a test file added or modified by this run (diff against
    base_commit) must genuinely register that suite. Tests may be created during
    P2 for TDD or during P3; unchanged historical tests cannot satisfy the gate.
    This proves the tests were written before the build without inventing a
    meaningless post-P2 birth-time requirement.
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
import json
import os
import re
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import gatelib as gl  # noqa: E402
import prepare_test_bundle as ptb  # noqa: E402

PHASE = 3
GATE = "gate_test_develop.py"
REPAIR_PACKET_PARTS = ("repairs", "current.json")
FREEZE_PARTS = ("test_develop", "development_freeze_snapshot.json")

# Same guard P2 uses. In P3 we run it RULES-ONLY: gtest macro bodies legitimately
# vary in layout so clang-format must not block authorship. Only the explicit
# P2/P3 critical regex subset (gatelib.P2_P3_CRITICAL_RULESET_IDS) blocks; other
# rules and file hygiene remain signed observation evidence. resolve_dep mirrors
# gate_develop so both phases share one source.
STYLE_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/code_ruleset_guard.py",
                             env_var="CODE_RULESET_GUARD")
PREWRITE_CONTRACT = gl.resolve_dep(
    "code-ruleset-style-check/references/pre-write-contract.md",
    env_var="CODE_RULESET_PREWRITE_CONTRACT")
# Same author-time file-hygiene guard P2 uses (license header). It still runs
# over newly authored tests and is signed as evidence, but P3 no longer blocks on
# it; license/file hygiene is owned by P8 review and remote CI.
HYGIENE_GUARD = gl.resolve_dep("code-ruleset-style-check/scripts/file_hygiene_guard.py",
                               env_var="FILE_HYGIENE_GUARD")
CXX_EXTS = (".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx")

# Hypium/ArkTS authorship (kind==arkts), parallel to the C++ gtest macros below:
# describe('<suite>', ...) registers the suite, it('<case>', ...) the case. The
# quoted name may contain CJK/spaces, so we capture the string literal verbatim
# (1-200 chars) and match the suite name exactly (case-sensitive, as Hypium is).
_HYPIUM_DESCRIBE_RE = re.compile(
    r"\bdescribe\s*\(\s*(?:\"|\'|`)(?P<suite>[^\"\'`]{1,200})(?:\"|\'|`)")
_HYPIUM_IT_RE = re.compile(
    r"\bit\s*\(\s*(?:\"|\'|`)(?P<case>[^\"\'`]{1,200})(?:\"|\'|`)")


def _rule_check_authored_tests(pdir, gdir, test_paths, line_filter_path=None):
    """Run the code_ruleset guard (rules-only) over authored C/C++ test files and
    split its current report under the P2/P3 critical policy.

    Returns ``(problems, blocking_findings, observed_count, evidence_rel)``.
    Only the explicit high-risk regex subset can fail P3. A missing guard,
    missing pre-write contract, or missing/unreadable report fails closed —
    an unexecuted scan cannot prove the critical subset was clean. Non-critical
    findings stay in the signed JSON/report as observation evidence. The optional
    ``line_filter_path`` keeps the deterministic scan on changed lines, matching
    P2's changed-file/changed-line scope.
    """
    cxx = [t for t in test_paths if os.path.splitext(t)[1].lower() in CXX_EXTS]
    rel = "evidence/phase3/test_style_report.txt"
    out = os.path.join(pdir, rel)
    if not cxx:
        with open(out, "w", encoding="utf-8") as f:
            f.write("no C/C++ test files authored — code_ruleset rule check has no scope\n")
            f.write("(non-C/C++ test files, e.g. ArkTS .ets/.ts, are not covered by the "
                    "C/C++ code-ruleset workbook and are deliberately skipped)\n")
        return [], [], 0, rel
    if not os.path.exists(STYLE_GUARD):
        with open(out, "w", encoding="utf-8") as f:
            f.write("BLOCKER: code_ruleset guard not found at %s\n" % STYLE_GUARD)
        return ["code-ruleset-style-check guard missing: %s" % STYLE_GUARD], [], 0, rel
    if not os.path.exists(PREWRITE_CONTRACT):
        with open(out, "w", encoding="utf-8") as f:
            f.write("BLOCKER: code-ruleset pre-write contract not found at %s\n" % PREWRITE_CONTRACT)
        return (["code-ruleset pre-write contract missing: %s" % PREWRITE_CONTRACT],
                [], 0, rel)
    abs_cxx = [os.path.join(gdir, t) for t in cxx if os.path.isfile(os.path.join(gdir, t))]
    json_rel = "evidence/phase3/test_style_findings.json"
    report_path = os.path.join(pdir, json_rel)
    problems = []
    blocking, observed, advisory = [], [], []
    cp = None
    try:
        # Never let a previous report authorize a crashed/aborted scan.
        os.unlink(report_path)
    except FileNotFoundError:
        pass
    except OSError as exc:
        problems.append("cannot clear stale code_ruleset report: %s" % exc)
    if not problems:
        scope_args = (["--line-filter-json", line_filter_path]
                      if line_filter_path else [])
        cp = subprocess.run(
            [sys.executable, STYLE_GUARD, "--rules-only", "--json",
             report_path, "--repository-root", gdir, *scope_args, *abs_cxx],
            text=True, capture_output=True)
        findings, advisory, error = gl.load_ruleset_findings(pdir, json_rel)
        if error:
            problems.append("code_ruleset report unusable: %s" % error)
        else:
            # 0 = clean, 1 = findings/format observations; anything else means
            # the scan did not finish normally and must not look like a clean run.
            if cp.returncode not in (0, 1):
                problems.append(
                    "code_ruleset guard exited rc=%d (expected 0 or 1)"
                    % cp.returncode)
            blocking, observed = gl.partition_rule_findings(
                findings, gl.P2_P3_CRITICAL_RULESET_IDS)
            problems += [
                "test code violates critical rule %s at %s:%s" % (
                    f.get("rule_id"), f.get("file"), f.get("line"))
                for f in blocking[:100]]
    with open(out, "w", encoding="utf-8") as f:
        f.write("test files rule-checked (%d):\n%s\n"
                "changed_line_scope=%s\n\n"
                "--- code_ruleset_guard --rules-only ---\nrc=%s\n%s\n"
                "--- lifecycle static policy (P2/P3 critical subset) ---\n"
                "critical_blocking=%d\nobserved_non_blocking=%d\nadvisory=%d\n"
                "blocking_rules=%s\n"
                % (len(cxx), "\n".join(cxx),
                   "changed-lines" if line_filter_path else
                   "(full files; scope unavailable)",
                   cp.returncode if cp else "not-run",
                   (cp.stdout + cp.stderr) if cp else "",
                   len(blocking), len(observed) + len(advisory), len(advisory),
                   ", ".join(sorted({str(f.get("rule_id")) for f in blocking}))
                   or "(none)"))
    return problems, blocking, len(observed) + len(advisory), rel


def _hygiene_check_authored_tests(pdir, gdir, test_paths):
    """Run the deterministic file-hygiene guard (license header) over newly
    authored test files and keep the result as observation evidence. Returns
    (problems, evidence_rel); P3 does not fold these problems into its verdict.
    The guard self-scopes to header-bearing extensions, so we pass every
    authored test file on disk."""
    rel = "evidence/phase3/test_hygiene_report.txt"
    out = os.path.join(pdir, rel)
    abs_paths = [os.path.join(gdir, t) for t in test_paths
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


def _authored_test_paths(gdir, changed_paths, contract):
    """Test files authored or modified by this workflow run.

    P3 proves that tests exist before P4; it does not require them to have been
    born after P2. Limit candidates to the current diff against base_commit so
    unchanged historical tests cannot satisfy the contract, while accepting TDD
    tests legitimately created during P2. Contract-declared ArkTS test projects
    use the same path relaxation as the feature-freeze guard.
    """
    return sorted({
        p for p in changed_paths
        if gl.is_allowed_test_path(p, contract)
        and os.path.isfile(os.path.join(gdir, p))
    })


def _suites_referenced(gdir, test_paths):
    """Map each readable authored test file -> registered suite source text.
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


def _arkts_suite_registered(text, suite, file_rel):
    """True iff `suite` is the name of a real `describe('<suite>', ...)` call in
    the ArkTS test source. Matching runs on the COMMENT-STRIPPED text (via
    gl.executable_code_text) so a `// describe('X', ...)` comment never counts —
    the same fail-closed parity as the gtest _suite_registered. The suite name is
    matched verbatim (case-sensitive); a bare mention in a string or free text
    never matches."""
    exec_text = gl.executable_code_text(text)
    for m in _HYPIUM_DESCRIBE_RE.finditer(exec_text):
        if m.group("suite") == suite:
            return True
    return False


def _coverage(contract, gdir, test_paths):
    """Return (required_gtests, covered, missing, evidence_lines). A required
    gtest is covered when some NEW test file's text references its suite AND that
    reference is a real registration — for kind==gtest a `TEST(`/`TEST_F(`/
    `TEST_P(`/`TYPED_TEST(`/`TYPED_TEST_P(` macro with the suite as its first
    argument (allowing `::`-qualified names); for kind==arkts a Hypium
    `describe('<suite>', ...)` call in an authored test file (preferring the
    contract-declared `file` when present). A bare suite name in a comment, a
    string literal, or free text does NOT count.

    On top of suite authorship, each test_case's design-point `point` must be
    referenced in the file that registers the suite — a `TEST(FooTest, C)`
    with an empty/TODO body names the suite but never exercises the design
    intent, so it must not pass. Comments are stripped (a `// TODO 点一` never
    counts); string/char literals are KEPT, because a Chinese design point is
    usually asserted as a string literal (ASSERT_STREQ(actual, "点一")) — the
    assertion IS the implementation. This holds for ArkTS too (// and /* */ are
    its comment syntax; expect(...).assertEqual("点一") keeps the literal). See
    gl.point_core_tokens / gl.executable_code_text.
    """
    file_text = _suites_referenced(gdir, test_paths)
    required = [tc.get("gtest") for tc in (contract.get("test_cases") or []) if tc.get("gtest")]
    covered, missing, lines = [], [], []
    # matches TEST(FooManagerTest, Case) / TEST_F(Test::FooManagerTest, ...) ...
    _GTEST_MACRO_RE = re.compile(
        r"\b(?:TEST|TEST_F|TEST_P|TYPED_TEST|TYPED_TEST_P|HWTEST|HWTEST_F|HWTEST_P)\s*\(\s*"
        r"([A-Za-z_][A-Za-z0-9_]*\s*::\s*)*[A-Za-z_][A-Za-z0-9_]*")
    for tc in contract.get("test_cases") or []:
        gtest = tc.get("gtest")
        if not gtest:
            continue
        kind = tc.get("kind", "gtest")
        suite = gl.test_target_from_gtest(gtest)
        hit = None
        if suite:
            if kind == "arkts":
                # Prefer the contract-declared file: the freeze-relaxed source is
                # the one that must actually author the suite. Otherwise scan all
                # authored test files.
                declared = (tc.get("file") or "").strip().lstrip("./")
                if declared and declared in file_text:
                    if _arkts_suite_registered(file_text[declared], suite, declared):
                        hit = declared
                if hit is None:
                    for rel, text in file_text.items():
                        if _arkts_suite_registered(text, suite, rel):
                            hit = rel
                            break
            else:
                for rel, text in file_text.items():
                    if _suite_registered(text, suite, _GTEST_MACRO_RE):
                        hit = rel
                        break
        if not hit:
            missing.append(gtest)
            if kind == "arkts":
                lines.append("[MISS] arkts %s -> describe('%s') not found in any authored ArkTS test file"
                             % (gtest, suite))
            else:
                lines.append("[MISS] %s -> suite %s not found in any authored test file" % (gtest, suite))
            continue
        # design-point semantic coverage: the suite file must exercise the point
        # in executable code (comments/strings stripped). A suite that exists but
        # never references its point fails the same way as a missing suite.
        point = tc.get("point")
        exec_text = gl.executable_code_text(file_text[hit])
        if not gl.point_covered(point, exec_text):
            missing.append(gtest)
            lines.append("[MISS] %s -> suite %s in %s but design point not in executable code"
                         % (gtest, suite, hit))
            continue
        covered.append(gtest)
        if kind == "arkts":
            lines.append("[OK ] arkts %s -> describe('%s') in %s" % (gtest, suite, hit))
        else:
            lines.append("[OK ] %s -> suite %s in %s" % (gtest, suite, hit))
    return required, covered, missing, lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline-dir")
    args = ap.parse_args()
    pdir = gl.pipeline_dir(args.pipeline_dir)
    state = gl.load_state(pdir)
    gl.require_current_phase(state, 3, "gate_test_develop.py")
    gdir = gl.resolve_git_dir(state)
    gl.evidence_dir(pdir, PHASE)
    from workflow_checks import enforce
    enforce(pdir, 3)

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

    # CONTRACT AUTHORSHIP COVERAGE: recover the contract from the SIGNED design.
    # Loaded up front so the feature-freeze check below can relax the test-only
    # rule for contract-declared ArkTS test projects.
    c_ok, contract, c_detail = gl.load_signed_contract(pdir)
    contract_status = "ok" if c_ok else ""

    # FEATURE FREEZE: after phase 2 locked the functional fingerprint, only NEW
    # test files may appear (plus contract-declared ArkTS app-test project files
    # for kind==arkts test_cases). Any other path added since freeze is a
    # violation (mirrors prepare_test_bundle._verify_feature_freeze).
    current_paths = gl._changed_paths(state)
    prefixes = ptb._pipeline_internal_prefixes(pdir, state)
    if prefixes:
        current_paths = [p for p in current_paths
                         if not any(p == pref[:-1] or p.startswith(pref) for pref in prefixes)]
    frozen_paths = freeze.get("locked_all_paths") or freeze.get("changed_files") or []
    non_test_extra = [p for p in current_paths
                      if p not in frozen_paths and not gl.is_allowed_test_path(p, contract)]

    authored_tests = _authored_test_paths(gdir, current_paths, contract)
    files_rel = "evidence/phase3/authored_test_files.txt"
    with open(os.path.join(pdir, files_rel), "w", encoding="utf-8") as f:
        f.write("test files authored/modified in this run (diff vs base_commit):\n")
        f.write("\n".join(authored_tests) or "(none)")
        f.write("\n")
    arts = [files_rel]

    # RULE CHECK the authored test code now (rules-only) on the same changed
    # lines P2 would use. Only the explicit high-risk P2/P3 subset blocks; the
    # rest stays in signed evidence.
    # The line filter is scratch input for the guard, not a signed artifact: use
    # a temp file so P3 adds no new evidence file or format to the pipeline.
    line_scope_path = ""
    temp_scope = ""
    try:
        from workflow_checks import current_scope
        _git, _base, _changed, line_ranges = current_scope(state)
        fd, temp_scope = tempfile.mkstemp(prefix="p3-line-scope-", suffix=".json")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(line_ranges, f, ensure_ascii=False, indent=2)
        line_scope_path = temp_scope
    except (ValueError, OSError) as exc:
        if temp_scope:
            try:
                os.unlink(temp_scope)
            except OSError:
                pass
        # Scanning the whole authored file is stricter than the changed-line
        # scope, so a scope-derivation failure must not silently skip the scan.
        print("WARNING: P3 changed-line scope unavailable; scanning full files: %s" % exc)
    try:
        style_problems, style_blocking, style_observed, style_rel = (
            _rule_check_authored_tests(
                pdir, gdir, authored_tests, line_scope_path or None))
    finally:
        if line_scope_path:
            try:
                os.unlink(line_scope_path)
            except OSError:
                pass
    arts.append(style_rel)

    # FILE HYGIENE observation: license-header mirror of the CI file check over
    # the newly authored test files. Recorded, but owned by P8 review / CI.
    hygiene_problems, hygiene_rel = _hygiene_check_authored_tests(pdir, gdir, authored_tests)
    arts.append(hygiene_rel)

    # CONTRACT AUTHORSHIP COVERAGE: recover the contract from the SIGNED design.
    c_ok, contract, c_detail = gl.load_signed_contract(pdir)
    contract_status = "ok" if c_ok else ""
    required, covered, missing, cov_lines = [], [], [], []
    if c_ok:
        required, covered, missing, cov_lines = _coverage(contract, gdir, authored_tests)
        cov_rel = "evidence/phase3/authorship_coverage.txt"
        with open(os.path.join(pdir, cov_rel), "w", encoding="utf-8") as f:
            f.write("required test_cases (from signed ar-contract): %d\n" % len(required))
            f.write("authored test files scanned: %d\n\n" % len(authored_tests))
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
        for t in authored_tests:
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
    # hygiene_problems is signed observation evidence only.
    if contract_status == "ok" and missing:
        problems += ["declared test_case not authored (suite not referenced by this run's test files): %s"
                     % g for g in missing]
    if contract_status == "ok" and required and not authored_tests:
        problems.append("contract declares test_cases but no test files were authored/modified in this run")

    bypass = " (AR-CONTRACT-BYPASS: %s)" % c_detail if contract_status == "absent" else ""
    reason = ("test-develop authorship: contract=%s, required=%d authored=%d, "
              "authored_test_files=%d, critical_rules_ok=%s, static_observed=%d, "
              "hygiene_observed=%d%s") % (
        contract_status or "n/a", len(required), len(covered), len(authored_tests),
        not style_problems, style_observed, len(hygiene_problems), bypass)
    blocking_rules = sorted({str(f.get("rule_id")) for f in style_blocking})
    if blocking_rules:
        reason += " BLOCKING_RULES: %s" % ", ".join(blocking_rules)
    non_finding_problems = [
        problem for problem in style_problems
        if not problem.startswith("test code violates critical rule")]
    if non_finding_problems:
        reason += "; " + "; ".join(non_finding_problems[:3])
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
        gl.write_phase_summary(
            pdir, PHASE, GATE, "PASS", reason,
            checks=["feature_freeze", "authorship_coverage", "critical_rules",
                    "static_observations"])
        gl.clear_failure_report(pdir, PHASE)
    else:
        gl.write_phase_summary(pdir, PHASE, GATE, "FAIL", reason, checks=problems)
        gl.write_failure_report(pdir, PHASE, GATE, reason, problems=problems,
                                resume_hint="为每个 test_cases.gtest 在本次 run 的测试变更中真实注册 suite,并确保可执行代码覆盖对应设计点(point)后重跑 gate_test_develop.py(不得改功能代码)")

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
        # a weak model gets a concrete author/repair route. Only a blocking
        # critical rule is a test_style_finding; hygiene observations never
        # drive repair.
        style_failed = bool(style_problems)
        failure_class = ("test_style_finding" if style_failed
                         else "test_authoring_incomplete")
        # S3: backfill line-level suspects ONLY from the in-memory blocking
        # findings. Non-critical/hygiene observations (and stale reports from an
        # aborted scan) stay evidence-only and never drive repair.
        suspect_locations = gl.normalize_suspect_locations([{
            "file": f.get("file"), "line": f.get("line"),
            "rule": f.get("rule_id"),
            "message": f.get("message") or f.get("remediation")}
            for f in style_blocking])
        gl.finalize_control(
            pdir, phase=PHASE, phase_name="test-develop", verdict="FAIL",
            repair_packet_parts=REPAIR_PACKET_PARTS,
            failure_class=failure_class,
            suspect_files=authored_tests, suspect_tests=authored_tests,
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
