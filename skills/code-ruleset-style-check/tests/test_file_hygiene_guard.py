#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the code-ruleset guards.

Covers file_hygiene_guard.py (H1 license header) one-positive / one-negative and
its fail-closed behavior, plus code_ruleset_guard.py's fail-closed guarantee when
its sensitive-word data file is missing (a silent bypass must never look clean).
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, "..", "scripts")
HYGIENE = os.path.join(SCRIPTS, "file_hygiene_guard.py")
RULESET = os.path.join(SCRIPTS, "code_ruleset_guard.py")

APACHE_HEADER = (
    "/*\n"
    " * Copyright (c) 2026.\n"
    " * Licensed under the Apache License, Version 2.0 (the \"License\");\n"
    " */\n"
)
GN_HEADER = (
    "# Copyright (c) 2026.\n"
    "# Licensed under the Apache License, Version 2.0.\n"
)


class FileHygieneH1Test(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def _write(self, name, text):
        p = os.path.join(self.dir, name)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)
        return p

    def _run(self, *files, json_out=None):
        cmd = [sys.executable, HYGIENE]
        if json_out:
            cmd += ["--json", json_out]
        cmd += list(files)
        return subprocess.run(cmd, text=True, capture_output=True)

    def test_headered_cpp_passes(self):
        p = self._write("good.cpp", APACHE_HEADER + "int main(){return 0;}\n")
        cp = self._run(p)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_headered_gn_passes(self):
        p = self._write("BUILD.gn", GN_HEADER + 'group("x") {}\n')
        cp = self._run(p)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_headerless_cpp_flagged(self):
        p = self._write("bad.cpp", "int main(){return 0;}\n")
        jout = os.path.join(self.dir, "f.json")
        cp = self._run(p, json_out=jout)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("H1.LICENSE", cp.stderr)
        with open(jout, encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(len(data["findings"]), 1)
        self.assertEqual(data["findings"][0]["rule_id"], "H1.LICENSE")

    def test_partial_header_flagged(self):
        # a bare "Copyright" without the Apache line does NOT satisfy H1
        p = self._write("bad.cpp", "// Copyright 2026\nint main(){return 0;}\n")
        cp = self._run(p)
        self.assertNotEqual(cp.returncode, 0)

    def test_header_too_deep_flagged(self):
        # a valid header pushed past the leading window must not count
        p = self._write("bad.cpp", "\n" * 12 + APACHE_HEADER + "int x;\n")
        cp = self._run(p)
        self.assertNotEqual(cp.returncode, 0)

    def test_json_out_of_scope_no_false_positive(self):
        # .json has no comment syntax -> H1 must not require a header there
        p = self._write("data.json", '{"a": 1}\n')
        cp = self._run(p)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_non_source_ignored(self):
        p = self._write("notes.txt", "just text, no header\n")
        cp = self._run(p)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)


class FileHygieneH2H5Test(unittest.TestCase):
    """H2 bytes / H3 JSON / H4 non-code sensitive words / H5 GN source existence.
    Same subprocess+--json convention as the H1 tests; findings keep the shared
    {file,line,rule_id,severity,remediation} shape."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = self.tmp.name

    def tearDown(self):
        self.tmp.cleanup()

    def _write_bytes(self, name, data):
        p = os.path.join(self.dir, name)
        with open(p, "wb") as f:
            f.write(data)
        return p

    def _write(self, name, text):
        p = os.path.join(self.dir, name)
        with open(p, "w", encoding="utf-8", newline="") as f:
            f.write(text)
        return p

    def _run(self, *files):
        jout = os.path.join(self.dir, "f.json")
        cp = subprocess.run(
            [sys.executable, HYGIENE, "--json", jout, *files],
            text=True, capture_output=True)
        with open(jout, encoding="utf-8") as f:
            data = json.load(f)
        return cp, data

    def _rules(self, data):
        return {f["rule_id"] for f in data["findings"]}

    # --- H2 bytes ---
    def test_bom_flagged(self):
        p = self._write_bytes("notes.txt", b"\xef\xbb\xbfhello\n")
        cp, data = self._run(p)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("H2.BOM", self._rules(data))

    def test_crlf_flagged(self):
        p = self._write_bytes("notes.txt", b"line1\r\nline2\n")
        cp, data = self._run(p)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("H2.CRLF", self._rules(data))

    def test_nul_flagged(self):
        p = self._write_bytes("notes.txt", b"ab\x00cd\n")
        cp, data = self._run(p)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("H2.NUL", self._rules(data))

    def test_clean_lf_text_passes(self):
        p = self._write("notes.txt", "clean line\nsecond line\n")
        cp, data = self._run(p)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    # --- H3 JSON ---
    def test_malformed_json_flagged(self):
        p = self._write("data.json", '{"a": 1,,}\n')
        cp, data = self._run(p)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("H3.JSON", self._rules(data))
        # the finding carries the decoder's line number, not a bare 1
        h3 = next(f for f in data["findings"] if f["rule_id"] == "H3.JSON")
        self.assertEqual(h3["line"], 1)

    def test_valid_json_passes(self):
        p = self._write("data.json", '{"a": 1, "b": [2, 3]}\n')
        cp, data = self._run(p)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    # --- H4 non-code sensitive words ---
    def test_sensitive_word_in_doc_flagged(self):
        # '香港' is a 门禁 word from the shared list; a markdown doc must be
        # scanned even though it is not C/C++.
        p = self._write("README.md", "# 标题\n本产品在香港首发\n")
        cp, data = self._run(p)
        self.assertNotEqual(cp.returncode, 0)
        self.assertTrue(data["findings"], "expected a sensitive-word finding")

    def test_clean_doc_passes(self):
        p = self._write("README.md", "# Title\njust a normal sentence\n")
        cp, data = self._run(p)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    # --- H5 GN source existence ---
    def test_gn_missing_source_flagged(self):
        # header present so H1 passes; the sources entry points at a file that
        # does not exist on disk -> the exact "nonexistent input" GN raises.
        p = self._write("BUILD.gn", GN_HEADER +
                        'ohos_shared_library("x") {\n  sources = [ "gone.cpp" ]\n}\n')
        cp, data = self._run(p)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("H5.GN.MISSING_SOURCE", self._rules(data))

    def test_gn_existing_source_passes(self):
        with open(os.path.join(self.dir, "real.cpp"), "w", encoding="utf-8") as f:
            f.write("int x;\n")
        p = self._write("BUILD.gn", GN_HEADER +
                        'ohos_shared_library("x") {\n  sources = [ "real.cpp" ]\n}\n')
        cp, data = self._run(p)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)

    def test_gn_generated_and_label_entries_skipped(self):
        # $target_gen_dir and //label / :dep entries are not statically decidable
        # and must never be flagged (false-positive-free).
        p = self._write("BUILD.gn", GN_HEADER +
                        'ohos_shared_library("x") {\n'
                        '  sources = [ "$target_gen_dir/gen.cpp" ]\n'
                        '  public = [ "//foo/bar:baz.h" ]\n'
                        '  deps = [ ":other" ]\n}\n')
        cp, data = self._run(p)
        self.assertEqual(cp.returncode, 0, cp.stdout + cp.stderr)


class CodeRulesetFailClosedTest(unittest.TestCase):
    """The content guard loads its sensitive-word list at import. If that data
    file is missing, the guard must fail closed (crash nonzero), never import to
    an empty word list and print PASS."""

    def test_missing_data_file_fails_closed(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        # copy ONLY the script into a tree with no sibling data/ruleset_c.json
        fake_scripts = os.path.join(tmp.name, "scripts")
        os.makedirs(fake_scripts)
        shutil.copy(RULESET, os.path.join(fake_scripts, "code_ruleset_guard.py"))
        src = os.path.join(tmp.name, "x.cpp")
        with open(src, "w", encoding="utf-8") as f:
            f.write(APACHE_HEADER + "int main(){return 0;}\n")
        cp = subprocess.run(
            [sys.executable, os.path.join(fake_scripts, "code_ruleset_guard.py"),
             "--rules-only", src],
            text=True, capture_output=True)
        # crash (nonzero) rather than a clean PASS with an empty word list
        self.assertNotEqual(cp.returncode, 0)
        self.assertNotIn("PASS", cp.stdout)


if __name__ == "__main__":
    unittest.main()
