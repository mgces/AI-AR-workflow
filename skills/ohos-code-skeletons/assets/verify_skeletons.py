#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
verify_skeletons.py — self-consistency checks for the code-skeleton library.

Two invariants, no third-party deps:
  1. Placeholder coverage: every `<PLACEHOLDER>` that appears in a skeleton file
     is documented in that skeleton dir's README.md (so nothing is un-explained).
  2. Structural markers: each skeleton kind still contains its mandatory real
     structure (REGISTER/OnLoad for plugins; test.gni/ohos_unittest/HWTEST_F for
     tests), so the skeletons stay compile-shaped, not pseudo-code.

Exit 0 = all pass; non-zero = a violation (prints details).
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# Real skeleton placeholders are <UPPER_SNAKE>, <lower_snake> (with an underscore),
# or one of a small allow-list of bare lowercase names. This deliberately EXCLUDES
# C++ include/template tokens (<memory>, <bool>, <Event>, <cstdint>) which also look
# like <word> but are not placeholders.
_BARE_ALLOW = {"<target>"}
_TOKEN_RE = re.compile(r"<[A-Za-z][A-Za-z0-9_]*>")


def _is_placeholder(tok):
    if tok in _BARE_ALLOW:
        return True
    inner = tok[1:-1]
    if "_" in inner:               # <plugin_dir>, <PLUGIN_NAME>, <header_under_test>
        return True
    if inner.isupper() and len(inner) > 1:  # <SUBSYSTEM_NS> handled above; bare <NS> rare
        return True
    return False


def find_placeholders(text):
    return {t for t in _TOKEN_RE.findall(text) if _is_placeholder(t)}

# skeleton dir -> list of (filename, [required substrings])
STRUCTURE = {
    "hiview-plugin": [
        ("plugin_name.cpp", ["REGISTER(", "OnLoad", "OnUnload"]),
        ("plugin_name.h", ["public Plugin", "OnLoad"]),
        ("BUILD.gn", ["ohos_shared_library", "sources"]),
    ],
    "test-unittest": [
        ("target_test.cpp", ["HWTEST_F(", "testing::Test"]),
        ("BUILD.gn", ['import("//build/test.gni")', "ohos_unittest("]),
    ],
    "test-moduletest": [
        ("target_module_test.cpp", ["HWTEST_F("]),
        ("BUILD.gn", ['import("//build/test.gni")', "ohos_moduletest("]),
    ],
    "test-fuzztest": [
        ("target_fuzzer.cpp", ["LLVMFuzzerTestOneInput", 'extern "C"']),
        ("BUILD.gn", ['import("//build/test.gni")', "ohos_fuzztest("]),
    ],
}


def placeholders_in(path):
    with open(path, encoding="utf-8") as f:
        return find_placeholders(f.read())


def check_placeholder_coverage(skel_dir):
    """Every placeholder in non-README files must appear in the dir's README."""
    errs = []
    readme = os.path.join(skel_dir, "README.md")
    if not os.path.isfile(readme):
        return ["%s: missing README.md" % skel_dir]
    documented = placeholders_in(readme)
    for fn in os.listdir(skel_dir):
        fpath = os.path.join(skel_dir, fn)
        if fn == "README.md" or not os.path.isfile(fpath):
            continue
        for ph in placeholders_in(fpath):
            if ph not in documented:
                errs.append("%s: placeholder %s not documented in README.md" % (fn, ph))
    # also scan config/ subdir if present
    cfg = os.path.join(skel_dir, "config")
    if os.path.isdir(cfg):
        for fn in os.listdir(cfg):
            for ph in placeholders_in(os.path.join(cfg, fn)):
                if ph not in documented:
                    errs.append("config/%s: placeholder %s not documented" % (fn, ph))
    return errs


def check_structure(skel_dir, name):
    errs = []
    for fn, required in STRUCTURE.get(name, []):
        fpath = os.path.join(skel_dir, fn)
        if not os.path.isfile(fpath):
            errs.append("%s/%s: missing" % (name, fn))
            continue
        with open(fpath, encoding="utf-8") as f:
            text = f.read()
        for sub in required:
            if sub not in text:
                errs.append("%s/%s: missing required marker %r" % (name, fn, sub))
    return errs


def main():
    assets = HERE
    all_errs = []
    for name in sorted(os.listdir(assets)):
        skel_dir = os.path.join(assets, name)
        if not os.path.isdir(skel_dir):
            continue
        all_errs += check_placeholder_coverage(skel_dir)
        all_errs += check_structure(skel_dir, name)
    if all_errs:
        print("SKELETON VERIFY FAIL:")
        for e in all_errs:
            print("  - %s" % e)
        sys.exit(1)
    print("skeleton verify OK (placeholders documented + structure intact)")


if __name__ == "__main__":
    main()
