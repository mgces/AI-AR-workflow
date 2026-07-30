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
        self.assertIn("423 rows", contract)
        self.assertIn("clang-tidy AST rows", contract)
        self.assertIn("repository OAT rows", contract)
        self.assertIn("public:", contract)
        self.assertIn("G.OTH.01", contract)
        self.assertIn("G.INC.08-CPP", contract)
        self.assertEqual(coverage["summary"]["workbook_rows"], 545)
        self.assertEqual(coverage["summary"]["author_time_rows"], 423)
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


if __name__ == "__main__":
    unittest.main()
