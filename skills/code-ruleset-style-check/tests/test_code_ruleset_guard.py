#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Regression tests for workbook-derived C/C++ rule semantics."""
import importlib.util
import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
GUARD = SKILL / "scripts" / "code_ruleset_guard.py"
SAFE_RULESET = SKILL / "data" / "ruleset_c.safe.json"
COVERAGE = SKILL / "data" / "ruleset_coverage.json"
PREWRITE_CONTRACT = SKILL / "references" / "pre-write-contract.md"


class CodeRulesetGuardTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir = Path(self.tmp.name)

    def _run(self, name, source):
        path = self.dir / name
        path.write_text(source, encoding="utf-8")
        report = self.dir / (name + ".json")
        cp = subprocess.run(
            [sys.executable, str(GUARD), "--rules-only", "--json", str(report), str(path)],
            text=True,
            capture_output=True,
        )
        data = json.loads(report.read_text(encoding="utf-8"))
        return cp, data

    @staticmethod
    def _rule_ids(data):
        return [finding["rule_id"] for finding in data["findings"]]

    def test_findings_outside_changed_lines_are_baselined(self):
        path = self.dir / "legacy.cpp"
        path.write_text("int *Legacy = NULL;\nint g_added = 1;\n", encoding="utf-8")
        line_filter = self.dir / "lines.json"
        line_filter.write_text(
            json.dumps({str(path.resolve()): [[2, 2]]}), encoding="utf-8")
        report = self.dir / "report.json"
        cp = subprocess.run(
            [sys.executable, str(GUARD), "--rules-only",
             "--line-filter-json", str(line_filter), "--json", str(report), str(path)],
            text=True, capture_output=True)
        data = json.loads(report.read_text(encoding="utf-8"))
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertNotIn("G.EXP.35-CPP", self._rule_ids(data))

    def test_git_baseline_catches_context_finding_on_unchanged_line(self):
        subprocess.run(["git", "-C", str(self.dir), "init", "-q"], check=True)
        subprocess.run(["git", "-C", str(self.dir), "config", "user.email", "t@t"], check=True)
        subprocess.run(["git", "-C", str(self.dir), "config", "user.name", "t"], check=True)
        path = self.dir / "context.cpp"
        path.write_text(
            "#include <vector>\nusing namespace std;\nint main() { return 0; }\n",
            encoding="utf-8")
        subprocess.run(["git", "-C", str(self.dir), "add", "context.cpp"], check=True)
        subprocess.run(["git", "-C", str(self.dir), "commit", "-q", "-m", "base"], check=True)
        base = subprocess.run(
            ["git", "-C", str(self.dir), "rev-parse", "HEAD"],
            text=True, capture_output=True, check=True).stdout.strip()
        path.write_text(
            "#include <vector>\nusing namespace std;\n#include <string>\n"
            "int main() { return 0; }\n", encoding="utf-8")
        line_filter = self.dir / "lines.json"
        line_filter.write_text(
            json.dumps({str(path.resolve()): [[3, 3]]}), encoding="utf-8")
        report = self.dir / "context.json"
        cp = subprocess.run(
            [sys.executable, str(GUARD), "--rules-only",
             "--line-filter-json", str(line_filter),
             "--baseline-git-dir", str(self.dir), "--baseline-commit", base,
             "--json", str(report), str(path)], text=True, capture_output=True)
        data = json.loads(report.read_text(encoding="utf-8"))
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("G.INC.08-CPP", self._rule_ids(data))

    def test_git_baseline_suppresses_unchanged_legacy_finding(self):
        subprocess.run(["git", "-C", str(self.dir), "init", "-q"], check=True)
        subprocess.run(["git", "-C", str(self.dir), "config", "user.email", "t@t"], check=True)
        subprocess.run(["git", "-C", str(self.dir), "config", "user.name", "t"], check=True)
        path = self.dir / "legacy.cpp"
        path.write_text("int *Legacy = NULL;\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(self.dir), "add", "legacy.cpp"], check=True)
        subprocess.run(["git", "-C", str(self.dir), "commit", "-q", "-m", "base"], check=True)
        base = subprocess.run(
            ["git", "-C", str(self.dir), "rev-parse", "HEAD"],
            text=True, capture_output=True, check=True).stdout.strip()
        path.write_text("int *Legacy = NULL;\nint g_new_value = 1;\n", encoding="utf-8")
        report = self.dir / "legacy-baseline.json"
        cp = subprocess.run(
            [sys.executable, str(GUARD), "--rules-only",
             "--baseline-git-dir", str(self.dir), "--baseline-commit", base,
             "--json", str(report), str(path)], text=True, capture_output=True)
        data = json.loads(report.read_text(encoding="utf-8"))
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertNotIn("G.EXP.35-CPP", self._rule_ids(data))

    def test_global_prefix_rule_ignores_locals_and_prefixed_globals(self):
        cp, data = self._run(
            "scope.cpp",
            "int g_count = 0;\nvoid update()\n{\n    int local = 1;\n}\n")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertNotIn("G.NAM.03-CPP", self._rule_ids(data))

    def test_global_prefix_rule_flags_unprefixed_file_scope_variable(self):
        cp, data = self._run("global.cpp", "int count = 0;\n")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("G.NAM.03-CPP", self._rule_ids(data))

    def test_normal_cpp_constructs_pass(self):
        cp, data = self._run(
            "clean.cpp",
            """#include <string>

using namespace std;

class Widget {
public:
    int Value() const
    {
        return value_;
    }

private:
    int value_ = 0;
};
""",
        )
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertEqual(data["findings"], [])

    def test_using_namespace_before_include_reports_inc_08_cpp(self):
        cp, data = self._run(
            "bad_include_order.cpp",
            """using namespace std;
#include <string>

int value()
{
    return 0;
}
""",
        )
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("G.INC.08-CPP", self._rule_ids(data))

    def test_namespace_in_comment_or_string_does_not_report_inc_08_cpp(self):
        cp, data = self._run(
            "comment_include_order.cpp",
            """// using namespace fake;
const char *text = \"using namespace fake;\";
#include <string>

int value()
{
    return 0;
}
""",
        )
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertNotIn("G.INC.08-CPP", self._rule_ids(data))

    def test_using_namespace_after_include_in_header_reports_inc_09_cpp(self):
        cp, data = self._run(
            "bad_header.h",
            """#ifndef BAD_HEADER_H
#define BAD_HEADER_H
#include <string>
using namespace std;
#endif
""",
        )
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("G.INC.09-CPP", self._rule_ids(data))
        self.assertNotIn("G.NAM.02", self._rule_ids(data))

    def test_downward_goto_is_allowed_by_ctl_06(self):
        cp, data = self._run(
            "forward_goto.c",
            """int run(void)
{
    goto cleanup;
cleanup:
    return 0;
}
""",
        )
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertNotIn("G.CTL.06", self._rule_ids(data))

    def test_upward_goto_reports_ctl_06(self):
        cp, data = self._run(
            "backward_goto.c",
            """int run(int retry)
{
again:
    if (retry-- > 0) {
        goto again;
    }
    return 0;
}
""",
        )
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("G.CTL.06", self._rule_ids(data))
        self.assertNotIn("G.CTL.01", self._rule_ids(data))

    def test_reused_label_in_another_function_does_not_report_ctl_06(self):
        cp, data = self._run(
            "reused_labels.c",
            """int first(void)
{
out:
    return 0;
}

int second(void)
{
    goto out;
out:
    return 0;
}
""",
        )
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertNotIn("G.CTL.06", self._rule_ids(data))

    def test_return_with_comment_or_string_is_not_unreachable(self):
        cp, data = self._run(
            "return_text.cpp",
            """int value()
{
    const char *text = \"return value;\";
    // return value;
    return 1;
}
""",
        )
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertNotIn("G.OTH.01", self._rule_ids(data))

    def test_unreachable_statement_after_return_reports_oth_01(self):
        cp, data = self._run(
            "dead.cpp",
            """int Value()
{
    return 1;
    int never = 2;
}
""",
        )
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("G.OTH.01", self._rule_ids(data))

    def test_cpp_only_standard_header_rule_does_not_apply_to_c(self):
        cp, data = self._run(
            "clean.c",
            """#include <stdio.h>

int main(void)
{
    return 0;
}
""",
        )
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertNotIn("G.STD.01-CPP", self._rule_ids(data))

    def test_default_capture_uses_res_06_not_escape_rule_res_05(self):
        cp, data = self._run(
            "capture.cpp",
            """int Value()
{
    int value = 1;
    auto getter = [&]() { return value; };
    return getter();
}
""",
        )
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("G.RES.06-CPP", self._rule_ids(data))
        self.assertNotIn("G.RES.05-CPP", self._rule_ids(data))

    def test_every_local_rule_id_exists_in_workbook_manifest(self):
        spec = importlib.util.spec_from_file_location("code_ruleset_guard_test", GUARD)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        manifest = json.loads(SAFE_RULESET.read_text(encoding="utf-8"))
        workbook_ids = {rule["rule_id"] for rule in manifest["rules"]}
        local_ids = {rule[0] for rule in module._RAW_RULES}
        self.assertEqual(local_ids - workbook_ids, set())

    def test_coverage_manifest_accounts_for_every_workbook_row(self):
        source = json.loads(
            (SKILL / "data" / "ruleset_c.json").read_text(encoding="utf-8")
        )
        coverage = json.loads(COVERAGE.read_text(encoding="utf-8"))
        rows = coverage["rows"]

        self.assertEqual(source["total_workbook_rows"], 545)
        self.assertEqual(len(rows), 545)
        self.assertEqual(
            {row["row"] for row in rows},
            {row["row"] for row in source["rules"]},
        )
        for row in rows:
            self.assertTrue(row["backends"], row)
            self.assertTrue(row["phases"], row)
            self.assertNotIn("unmapped", row["backends"])

        summary = coverage["summary"]
        self.assertEqual(summary["workbook_rows"], 545)
        self.assertEqual(summary["mapped_rows"], 545)
        self.assertLess(summary["author_time_rows"], summary["workbook_rows"])

    def test_prewrite_contract_is_manifest_backed_and_preserves_later_owners(self):
        contract = PREWRITE_CONTRACT.read_text(encoding="utf-8")
        coverage = json.loads(COVERAGE.read_text(encoding="utf-8"))
        self.assertIn("545 workbook rows", contract)
        self.assertIn("415 rows", contract)
        self.assertIn("clang-tidy AST rows", contract)
        self.assertIn("repository OAT rows", contract)
        self.assertIn("public:", contract)
        self.assertIn("G.OTH.01", contract)
        self.assertIn("G.INC.08-CPP", contract)
        self.assertEqual(coverage["summary"]["workbook_rows"], 545)
        self.assertEqual(coverage["summary"]["author_time_rows"], 415)
        self.assertGreater(coverage["summary"]["later_stage_rows"], 0)

    def test_clang_tidy_finding_keeps_diagnostic_file_path(self):
        spec = importlib.util.spec_from_file_location("code_ruleset_guard_ct", GUARD)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        fake_bin = self.dir / "clang-tidy"
        fake_bin.write_text(
            "#!/bin/sh\n"
            "echo '/tmp/sample.cpp:7:3: warning: missing default [cppcoreguidelines-missing-default-case]'\n",
            encoding="utf-8",
        )
        fake_bin.chmod(fake_bin.stat().st_mode | stat.S_IXUSR)
        compile_dir = self.dir / "build"
        compile_dir.mkdir()
        (compile_dir / "compile_commands.json").write_text("[]\n", encoding="utf-8")
        source = self.dir / "sample.cpp"
        source.write_text("int run() { return 0; }\n", encoding="utf-8")

        old_path = os.environ.get("PATH", "")
        os.environ["PATH"] = str(self.dir) + os.pathsep + old_path
        try:
            findings, note = module._clang_tidy_findings([source], compile_dir)
        finally:
            os.environ["PATH"] = old_path

        self.assertEqual(note, "")
        self.assertEqual(findings[0]["file"], "/tmp/sample.cpp")
        self.assertEqual(findings[0]["line"], 7)

    def test_repository_codecheck_ignore_suppresses_matching_rule(self):
        path = self.dir / "legacy.cpp"
        path.write_text("int *Legacy = NULL;\n", encoding="utf-8")
        ignore = self.dir / "codecheck_ignore.json"
        ignore.write_text(json.dumps({"legacy.cpp": {"G.EXP.35-CPP": "*"}}),
                          encoding="utf-8")
        report = self.dir / "ignored.json"
        cp = subprocess.run(
            [sys.executable, str(GUARD), "--rules-only",
             "--repository-root", str(self.dir), "--codecheck-ignore", str(ignore),
             "--json", str(report), str(path)], text=True, capture_output=True)
        data = json.loads(report.read_text(encoding="utf-8"))
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertEqual(data["findings"], [])
        self.assertEqual(data["ignored_findings"][0]["rule_id"], "G.EXP.35-CPP")

    def test_sensitive_words_scan_comments_and_strings(self):
        data = json.loads((SKILL / "data" / "ruleset_c.json").read_text(encoding="utf-8"))
        word = next(item["word"] for item in data["sensitive_words"]
                    if item.get("word") and item["word"].isascii() and " " not in item["word"])
        cp, report = self._run("sensitive.cpp", '// %s\nconst char *s = "%s";\n' % (word, word))
        self.assertNotEqual(cp.returncode, 0)
        self.assertGreaterEqual(len([f for f in report["findings"]
                                     if f["rule_id"].startswith("WordsTool.")]), 2)

    def test_semantic_regex_hint_is_advisory_not_blocking(self):
        cp, report = self._run("assertion.cpp", "void Check() { assert(true); }\n")
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)
        self.assertEqual(report["findings"], [])
        self.assertIn("G.AST.02", [finding["rule_id"]
                                   for finding in report["advisory_findings"]])

    def test_gint04_is_a_hard_rule_not_advisory(self):
        """G.INT.04 is retained in the lifecycle P2/P3 critical subset, so the
        guard must report it as a blocking deterministic finding."""
        cp, report = self._run(
            "integer_overflow.cpp",
            "void Add(uint32_t a, uint32_t b)\n{\n"
            "    uint32_t total = a + b;\n    (void)total;\n}\n")
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("G.INT.04", self._rule_ids(report))
        self.assertNotIn("G.INT.04", [finding["rule_id"]
                                      for finding in report["advisory_findings"]])

    def test_fuu21_variants_follow_translation_unit(self):
        """C files report G.FUU.21; C++ files additionally report the -CPP
        variant. The lifecycle critical subset keeps both ids."""
        body = 'void Use(void)\n{\n    system("ls");\n}\n'
        c_cp, c_report = self._run("unsafe.c", body)
        self.assertNotEqual(c_cp.returncode, 0)
        c_ids = self._rule_ids(c_report)
        self.assertIn("G.FUU.21", c_ids)
        self.assertNotIn("G.FUU.21-CPP", c_ids)

        cpp_cp, cpp_report = self._run("unsafe.cpp", body)
        self.assertNotEqual(cpp_cp.returncode, 0)
        cpp_ids = self._rule_ids(cpp_report)
        self.assertIn("G.FUU.21-CPP", cpp_ids)

    def test_clang_tidy_malformed_diagnostic_is_a_backend_failure(self):
        """A checker-tagged diagnostic the parser cannot read must become a
        blocking backend finding, never an implicit clean result."""
        spec = importlib.util.spec_from_file_location(
            "code_ruleset_guard_malformed", GUARD)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        fake_bin = self.dir / "clang-tidy"
        fake_bin.write_text(
            "#!/bin/sh\n"
            "echo '/tmp/sample.cpp:7: warning: odd diagnostic layout [bugprone-infinite-loop]'\n",
            encoding="utf-8",
        )
        fake_bin.chmod(fake_bin.stat().st_mode | stat.S_IXUSR)
        compile_dir = self.dir / "build-malformed"
        compile_dir.mkdir()
        (compile_dir / "compile_commands.json").write_text("[]\n", encoding="utf-8")
        source = self.dir / "malformed.cpp"
        source.write_text("int run() { return 0; }\n", encoding="utf-8")

        old_path = os.environ.get("PATH", "")
        os.environ["PATH"] = str(self.dir) + os.pathsep + old_path
        try:
            findings, note = module._clang_tidy_findings([source], compile_dir)
        finally:
            os.environ["PATH"] = old_path

        self.assertEqual(note, "")
        self.assertEqual([finding["rule_id"] for finding in findings],
                         ["clang-tidy-backend"])

    def test_clang_tidy_nonzero_with_findings_is_still_a_backend_failure(self):
        """Warnings alone do not make clang-tidy exit non-zero. A nonzero rc is a
        backend failure even if some diagnostics were parsed."""
        spec = importlib.util.spec_from_file_location(
            "code_ruleset_guard_nonzero", GUARD)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        fake_bin = self.dir / "clang-tidy"
        fake_bin.write_text(
            "#!/bin/sh\n"
            "echo '/tmp/sample.cpp:7:3: warning: fixture [clang-analyzer-core.DivideZero]'\n"
            "exit 3\n",
            encoding="utf-8",
        )
        fake_bin.chmod(fake_bin.stat().st_mode | stat.S_IXUSR)
        compile_dir = self.dir / "build-nonzero"
        compile_dir.mkdir()
        (compile_dir / "compile_commands.json").write_text("[]\n", encoding="utf-8")
        source = self.dir / "nonzero.cpp"
        source.write_text("int run() { return 0; }\n", encoding="utf-8")

        findings, note = module._clang_tidy_findings(
            [source], compile_dir, str(fake_bin))
        self.assertEqual(note, "")
        rules = [finding["rule_id"] for finding in findings]
        self.assertIn("G.INT.03", rules)
        self.assertIn("clang-tidy-backend", rules)

    def test_clang_tidy_unavailable_returns_a_note_for_fail_closed_gates(self):
        spec = importlib.util.spec_from_file_location(
            "code_ruleset_guard_unavailable", GUARD)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        compile_dir = self.dir / "no-compdb"
        findings, note = module._clang_tidy_findings(
            [self.dir / "none.cpp"], compile_dir, "/fake/clang-tidy")
        self.assertEqual(findings, [])
        self.assertIn("compile_commands.json not found", note)

    def test_p2_p3_critical_ids_are_detectable_by_guard(self):
        """Every id in the lifecycle P2/P3 critical subset has a concrete,
        deterministic fixture. This keeps the policy list and the regex
        backends from drifting apart."""
        cases = [
            ("G.FUU.21", "critical_fuu21.c",
             'void f(void) { system("ls"); }\n'),
            ("G.FUU.21-CPP", "critical_fuu21.cpp",
             'void f() { system("ls"); }\n'),
            ("G.STR.01", "critical_str01.c",
             'void f(void) { char b[8]; itoa(1, b, 10); }\n'),
            ("G.ARR.03", "critical_arr03.c",
             'void f(void) { unsigned long n = sizeof(char *); (void)n; }\n'),
            ("G.MEM.05", "critical_mem05.c",
             'void f(void) { char *p = malloc(8) + 1; (void)p; }\n'),
            ("G.FUU.10", "critical_fuu10.c",
             'void f(void) { void *p = alloca(8); (void)p; }\n'),
            ("G.EXP.03", "critical_exp03.c",
             'void f(int a, int b) { int x = a++ + b; (void)x; }\n'),
            ("G.EXP.33-CPP", "critical_exp33.cpp",
             'void f(int a, int b) { int x = a++ + b; (void)x; }\n'),
            ("G.INT.04", "critical_int04.c",
             'void f(uint32_t a, uint32_t b) { uint32_t t = a + b; (void)t; }\n'),
            ("G.EXP.26-CPP", "critical_exp26.cpp",
             'void f(uint32_t a, uint32_t b) { uint32_t t = a + b; (void)t; }\n'),
            ("G.STD.15-CPP", "critical_std15.cpp",
             'void f() { execl("/bin/sh", "sh", "-c", "x", nullptr); }\n'),
            ("G.FUU.17", "critical_fuu17.c",
             'void f(void) { dlopen("libx.so", 1); }\n'),
            ("G.STD.07-CPP", "critical_std07.cpp",
             'void f() { std::string password = "x"; }\n'),
            ("G.FIL.03", "critical_fil03.c",
             'void f(void) { open("/tmp/x", 0); }\n'),
            ("G.FUU.05", "critical_fuu05.c",
             'void f(void) { kill(1, 9); }\n'),
            ("G.STD.17-CPP", "critical_std17.cpp",
             'void f() { kill(1, 9); }\n'),
            ("G.CRY.03", "critical_cry03.c",
             'void f(void) { CRYPT_encrypt(0); }\n'),
            ("G.FUU.09", "critical_fuu09.c",
             'void f(void) { realloc(0, 1); }\n'),
        ]
        for rule_id, name, source in cases:
            with self.subTest(rule_id=rule_id):
                cp, report = self._run(name, source)
                self.assertNotEqual(cp.returncode, 0, cp.stdout + cp.stderr)
                self.assertIn(rule_id, self._rule_ids(report))

    def test_p4_critical_checkers_map_to_expected_rule_ids(self):
        """All clang-tidy checkers retained by P4 map to the explicit critical
        ids; the two G.EXP.08-CPP checkers both resolve to that rule."""
        spec = importlib.util.spec_from_file_location(
            "code_ruleset_guard_p4_map", GUARD)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        checkers = [
            ("clang-analyzer-cplusplus.NewDelete", "G.RES.07-CPP"),
            ("clang-analyzer-unix.Malloc", "G.FUU.11"),
            ("clang-analyzer-core.uninitialized", "G.VAR.01"),
            ("cppcoreguidelines-pro-type-member-init", "G.EXP.08-CPP"),
            ("clang-analyzer-core.CallAndMessage", "G.EXP.08-CPP"),
            ("clang-analyzer-core.DanglingTempObject", "G.STD.04-CPP"),
            ("bugprone-undefined-memory-manipulation", "G.EXP.12-CPP"),
            ("clang-analyzer-core.DivideZero", "G.INT.03"),
            ("cppcoreguidelines-virtual-class-destructor", "G.CLS.10-CPP"),
        ]
        fake_bin = self.dir / "clang-tidy"
        lines = ["/tmp/p4.cpp:%d:1: warning: fixture [%s]" % (n, checker)
                 for n, (checker, _rule) in enumerate(checkers, 1)]
        fake_bin.write_text("#!/bin/sh\nprintf '%s\\n' " + " ".join(
            "'%s'" % line for line in lines) + "\n", encoding="utf-8")
        fake_bin.chmod(fake_bin.stat().st_mode | stat.S_IXUSR)
        compile_dir = self.dir / "build-p4"
        compile_dir.mkdir()
        (compile_dir / "compile_commands.json").write_text("[]\n", encoding="utf-8")
        source = self.dir / "p4.cpp"
        source.write_text("int run() { return 0; }\n", encoding="utf-8")

        findings, note = module._clang_tidy_findings(
            [source], compile_dir, str(fake_bin))
        self.assertEqual(note, "")
        mapped = [finding["rule_id"] for finding in findings]
        expected = {rule for _checker, rule in checkers}
        self.assertEqual(set(mapped), expected)
        self.assertEqual(mapped.count("G.EXP.08-CPP"), 2)


if __name__ == "__main__":
    unittest.main()
