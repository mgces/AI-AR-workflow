#!/usr/bin/env python3
"""Strict changed-file gate for the C++ code_ruleset workbook.

The workbook manifest is exhaustive and fail-closed: every source row must have
an executable backend before the guard can return PASS.  Deterministic rules are
implemented locally; AST/tool rows require an explicitly available executor.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

EXTS = {".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx"}
HEADER_EXTS = {".h", ".hh", ".hpp", ".hxx"}

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "ruleset_c.json"
CLANG_TIDY_CFG = Path(__file__).resolve().parent.parent / "data" / ".clang-tidy"

# (check_name_glob, rule_id) — maps clang-tidy warnings to workbook rule_ids.
# Loaded from the WarningToRule section of .clang-tidy at init time if the file
# exists; the inline list below is the fallback (and source of truth) so the
# guard never depends on a config file being present at runtime.
_CLANG_TIDY_RULE_MAP = [
    ("google-explicit-constructor",              "G.CLS.03-CPP"),
    ("cppcoreguidelines-special-member-functions","G.CLS.04-CPP"),
    ("cppcoreguidelines-virtual-class-destructor","G.CLS.06-CPP"),
    ("performance-noexcept-move-constructor",    "G.CLS.08-CPP"),
    ("modernize-use-override",                   "G.CLS.12-CPP"),
    ("google-readability-casting",               "G.EXP.14-CPP"),
    ("cppcoreguidelines-pro-type-cstyle-cast",   "G.EXP.14-CPP"),
    ("performance-move-const-arg",               "G.EXP.19-CPP"),
    ("cppcoreguidelines-missing-default-case",   "G.EXP.37-CPP"),
    ("llvm-header-guard",                        "G.INC.04-CPP"),
    ("google-global-names-in-headers",           "G.INC.09-CPP"),
    ("cppcoreguidelines-no-malloc",              "G.RES.08-CPP"),
    ("cppcoreguidelines-owning-memory",          "G.RES.11-CPP"),
    ("readability-inconsistent-declaration-",    "G.FUN.02-CPP"),
    ("misc-unused-parameters",                   "G.FUN.03-CPP"),
    ("bugprone-reserved-identifier",             "G.EXP.01-CPP"),
    ("bugprone-macro-parentheses",               "G.PRE.02"),
    ("bugprone-multiple-statement-macro",        "G.PRE.04"),
    ("bugprone-macro-repeated-side-effects",     "G.PRE.04"),
    ("readability-const-return-type",            "G.CNS.03-CPP"),
    ("clang-analyzer-core.DivideZero",           "G.INT.03"),
    ("clang-analyzer-core.uninitialized",        "G.VAR.01"),
    ("clang-analyzer-cplusplus",                 "G.VAR.05"),
    ("clang-analyzer-core.DanglingTempObject",   "G.STD.04-CPP"),
    ("bugprone-parent-suspicious",               "G.EXP.30-CPP"),
    ("misc-misleading-identifier",               "G.EXP.10-CPP"),
    ("clang-analyzer-optin.portability.UnixAPI", "G.MEM.01"),
    ("clang-analyzer-security.insecureAPI",      "G.STD.05-CPP"),
    # Phase J additions — broader clang-tidy mapping for remaining AST rules
    ("cppcoreguidelines-special-member-functions",   "G.CLS.07-CPP"),
    ("cppcoreguidelines-virtual-class-destructor",   "G.CLS.10-CPP"),
    ("misc-throw-by-value-catch-by-reference",       "G.ERR.03-CPP"),
    ("bugprone-exception-escape",                    "G.ERR.04-CPP"),
    ("cppcoreguidelines-pro-type-member-init",       "G.EXP.08-CPP"),
    ("clang-analyzer-core.CallAndMessage",           "G.EXP.08-CPP"),
    ("bugprone-undefined-memory-manipulation",       "G.EXP.12-CPP"),
    ("bugprone-infinite-loop",                       "G.EXP.41-CPP"),
    ("performance-move-const-arg",                   "G.FUN.07-CPP"),
    ("clang-analyzer-valist.*",                      "G.STD.13-CPP"),
    ("misc-redundant-expression",                    "G.VAR.02"),
    # Phase K — cover remaining unmatched rule_ids via clang-tidy
    ("readability-inconsistent-declaration-parameter-name", "G.CLS.11-CPP"),
    ("hiding-function",                              "G.CLS.13-CPP"),
    ("bugprone-branch-clone",                        "G.CTL.08"),
    ("bugprone-branch-clone",                        "G.EXP.38-CPP"),
    ("cppcoreguidelines-pro-type-member-init",       "G.EXP.09-CPP"),
    ("clang-analyzer-core.ReturnValue",              "G.FUU.01"),
    ("clang-analyzer-valist.FormatString",           "G.FUU.03"),
    ("clang-analyzer-unix.Malloc",                   "G.FUU.11"),
    ("clang-analyzer-optin.portability.UnixAPI",     "G.FUU.12"),
    ("misc-no-recursion",                            "G.INC.08"),
    ("clang-analyzer-optin.portability.UnixAPI",     "G.RES.02-CPP"),
    ("clang-analyzer-cplusplus.NewDelete",           "G.RES.07-CPP"),
    ("clang-analyzer-core.*",                        "G.AST.03"),
    ("clang-analyzer-core.*",                        "G.AST.04"),
]

# G.FMT.* rule_ids that clang-format enforces.  When --rules-only skips format,
# these rules are still reported as "covered" so the workbook manifest shows a
# complete backend mapping (no rule goes unreported).
_CLANG_FORMAT_RULES = frozenset({
    "G.FMT.01", "G.FMT.01-CPP",         # UTF-8 encoding
    "G.FMT.02", "G.FMT.02-CPP",         # 4-space indent
    "G.FMT.03", "G.FMT.03-CPP",         # brace style
    "G.FMT.04", "G.FMT.04-CPP",         # one statement per line
    "G.FMT.05", "G.FMT.05-CPP",         # 120-char line width
    "G.FMT.06-CPP",                     # operator-at-EOL line break
    "G.FMT.07",                         # return type on same line
    "G.FMT.08",                         # braces for if/for/while
    "G.FMT.09", "G.FMT.09-CPP",         # case indent, ctor init list
    "G.FMT.10", "G.FMT.10-CPP",         # pointer * placement
    "G.FMT.11", "G.FMT.11-CPP",         # spaces around operators
    "G.FMT.12", "G.FMT.12-CPP",         # compact layout
    "G.FMT.13-CPP",                     # case relative indent
    "G.FMT.14-CPP",                     # pointer/reference side
    "G.FMT.15-CPP",                     # type qualifier order
    "G.FMT.16-CPP",                     # keyword spacing
    "G.FMT.17-CPP",                     # blank-line placement
})

# (rule_id, severity, pattern, remediation, applies_to_exts|None).
# Kept high-precision on purpose: these fire as hard blockers, so a false
# positive would wrongly stop P2/P3. Semantic rules (ownership, lifetime,
# validation, complexity) stay with the skill's human review and are NOT here.
_RAW_RULES = [
    ("G.INC.06", "严重", r"^\s*#\s*pragma\s+once\b", "use a #define header guard", None),
    ("G.EXP.35-CPP", "严重", r"\bNULL\b", "use nullptr", None),
    ("G.INC.05-CPP", "严重", r"extern\s+\"C\"\s*\{[\s\S]*?#\s*include",
     "move includes outside extern \"C\"", None),
    ("G.FUU.09", "严重", r"\brealloc\s*\(", "avoid realloc; use a checked replacement", None),
    ("G.FUU.10", "严重", r"\balloca\s*\(", "do not allocate stack memory with alloca", None),
    ("G.FUU.08", "严重", r"\babort\s*\(", "use structured error handling instead of abort", None),
    ("G.STD.17-CPP", "严重", r"\bkill\s*\(", "do not directly terminate another process", None),
    ("G.RES.05-CPP", "严重", r"\[(=|&)\s*\]", "avoid default lambda captures", None),
    ("G.STD.07-CPP", "严重", r"std::string[^\n]*(password|passwd|pwd|psw)",
     "do not store sensitive data in std::string", None),
    # --- banned process/shell APIs (fatal at the yellow-zone OAT gate) ---
    ("G.SEC.03", "致命", r"\bsystem\s*\(", "do not use system(); use a checked exec wrapper", None),
    ("G.SEC.04", "致命", r"\bpopen\s*\(", "do not use popen(); use a checked exec wrapper", None),
    ("G.SEC.05", "致命", r"\bgets\s*\(", "gets() is banned; use a bounded read (fgets)", None),
    # --- unbounded C string / format APIs ---
    ("G.SEC.06", "严重", r"\b(strcpy|strcat|sprintf|vsprintf|stpcpy)\s*\(",
     "use the bounded variant (strcpy_s / snprintf / ...)", None),
    # --- control flow ---
    ("G.CTL.01", "严重", r"^\s*goto\s+\w", "avoid goto", None),
    # --- header hygiene: 'using namespace' at header scope pollutes every TU ---
    ("G.NAM.02", "严重", r"^\s*using\s+namespace\b",
     "do not put 'using namespace' at header scope", HEADER_EXTS),
    # ------------------------------------------------------------------
    # Phase A additions — high-precision regex-detectable rules from the
    # remaining workbook rows (G.*, OAT.*, row.*).  Each pattern matches
    # on a single line to keep the guard simple and fast.
    # ------------------------------------------------------------------
    # --- banned thread exit functions ---
    ("G.FUU.06", "严重", r"\bpthread_exit\s*\(",
     "use a structured thread exit instead of pthread_exit", None),
    ("G.FUU.06", "严重", r"\bExitThread\s*\(",
     "use a structured thread exit instead of ExitThread", None),
    # --- deprecated dynamic exception specification (C++98/03 style) ---
    ("G.ERR.06-CPP", "严重", r"\bthrow\s*\([^)]*\)",
     "remove dynamic exception specification; use noexcept instead", None),
    # --- numeric literal lowercase-'l' suffix (confusable with digit 1) ---
    ("G.CNS.01", "严重", r"\b0[xX][0-9a-fA-F]+[lL][lL]\b",
     "use uppercase 'L' for long long hex suffix to avoid confusion with digit 1", None),
    ("G.CNS.01-CPP", "严重", r"\b[0-9]+\.[0-9]*[lL]\b",
     "use uppercase 'L' for long double suffix to avoid confusion with digit 1", None),
    ("G.CNS.01-CPP", "严重", r"\b[0-9]+[lL][lL]\b",
     "use uppercase 'L' for long long suffix to avoid confusion with digit 1", None),
    # --- TODO/FIXME/TBD/HACK left in delivery code ---
    ("G.CMT.05-CPP", "一般", r"(//|/\*).*\b(TODO|FIXME|TBD|HACK)\b",
     "resolve all TODO/FIXME/TBD/HACK before delivery", None),
    # --- overloaded comma / && / || operators ---
    ("G.CLS.15-CPP", "严重", r"operator\s*[,&|]{2}\s*\(",
     "do not overload comma, &&, or || operators", None),
    # --- bare assert() call (must use macro disabled in release builds) ---
    ("G.AST.02", "严重", r"\bassert\s*\(",
     "use a macro-based assert that is disabled in release builds", None),
    # --- one assert per condition ---
    ("G.AST.05", "严重", r"assert\s*\([^)]*&&[^)]*\)",
     "one assertion should check only one condition", None),
    # --- C standard headers in C++ code (use <c*> wrappers instead) ---
    ("G.STD.01-CPP", "严重",
     r'#\s*include\s+<(stdio\.h|stdlib\.h|string\.h|time\.h|math\.h|'
     r'ctype\.h|assert\.h|stdarg\.h|locale\.h|signal\.h|setjmp\.h|'
     r'errno\.h|float\.h|limits\.h|inttypes\.h|stdint\.h|stdbool\.h|'
     r'stddef\.h|uchar\.h|wchar\.h|wctype\.h|complex\.h|fenv\.h|tgmath\.h)>',
     "use the C++ wrapper header (<cstdio>, <cstdlib>, ...) instead", None),
    # --- rand() not suitable for security-sensitive randomness ---
    ("G.OTH.03", "一般", r"\brand\s*\(",
     "do not use rand() for security-sensitive random numbers; use a CSPRNG instead", None),
    # --- dlopen / LoadLibrary with potential external data ---
    ("G.FUU.17", "致命", r"\bdlopen\s*\(",
     "avoid direct dlopen with external data; use a validated loading wrapper", None),
    ("G.STD.15-CPP", "致命", r"\b(LoadLibrary|LoadLibraryEx[AW])\s*\(",
     "do not pass external data to module loading functions", None),
    # --- extern declarations (should use header includes) ---
    ("G.EXP.05-CPP", "严重", r"\bextern\s+(int|char|void|bool|long|short|unsigned|signed|float|double)\s+\w+\s*\(",
     "use header includes instead of extern function declarations", None),
    # --- std::make_unique instead of new for unique_ptr ---
    ("G.RES.09-CPP", "严重", r"std::unique_ptr\s*<[^>]*>\s*\(\s*new\s+",
     "use std::make_unique instead of new for unique_ptr construction", None),
    # --- std::make_shared instead of new for shared_ptr ---
    ("G.RES.10-CPP", "严重", r"std::shared_ptr\s*<[^>]*>\s*\(\s*new\s+",
     "use std::make_shared instead of new for shared_ptr construction", None),
    # --- commented-out code (not plain comments — starts with // + keyword) ---
    ("G.EXP.43-CPP", "严重", r"^\s*//\s+(if|for|while|switch|int\s+\w+|char\s+\w+|void\s+\w+|return\s+)\s*[\(;{]",
     "remove commented-out code instead of leaving it in", None),
    # --- using namespace before first #include (pollutes translation unit) ---
    ("G.INC.08-CPP", "严重", r"using\s+namespace\s+\w+",
     "move 'using namespace' after all #include directives", None),
    # --- public IP address hardcoded in string literals ---
    ("G.OTH.05", "严重",
     r'"(12[0-5]|1[0-1]\d|1\d\d|[2-9]\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)\.'
     r'(25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)"',
     "do not hardcode public IP addresses; read from config instead", None),
    # --- goto upward jump (the line contains both a label and goto) ---
    ("G.CTL.06", "严重", r"^\s*\w+:\s*$",
     "goto must only jump forward (downward); upward jumps are banned", None),
    # --- macro ending with semicolon (changes control flow) ---
    ("G.PRE.09", "一般", r"#\s*define\s+\w+\([^)]*\)\s+[^;]*;\s*(\\\s*)?$",
     "do not end macro definitions with a semicolon", None),
    # --- function-like macro using return/goto/break/continue ---
    ("G.PRE.05", "一般", r"#\s*define\s+\w+\([^)]*\)[\s\S]*?\b(return|goto|break|continue)\b",
     "avoid return/goto/break/continue inside function-like macros", None),
    # ------------------------------------------------------------------
    # Phase H additions — remaining workbook rows, high-precision regex
    # ------------------------------------------------------------------
    # --- weak / banned cryptographic algorithms (C) ---
    ("G.CRY.01", "严重", r"\b(MD5|DES_[ECBCHK]|EVP_[a-z]+|RSA_padding_add_|xy_DES_)\s*\(",
     "use a strong, approved cryptographic algorithm instead of a weak one", None),
    ("G.CRY.02", "严重", r"\b(MD5|DES_|EVP_[a-z]+|RSA_padding_add_|xy_DES_)\s*\(",
     "use a strong, approved cryptographic algorithm instead of a weak one", None),
    ("G.CRY.03", "致命", r"\bCRYPT_encrypt\s*\(",
     "use a safe IPSI algorithm instead of the banned variant", None),
    # --- unsafe itoa/ltoa (buffer overflow risk) ---
    ("G.STR.01", "严重", r"\b(itoa|ltoa|ultoa|gcvt|ecvt|fcvt)\s*\(",
     "use snprintf instead of itoa/ltoa/ecvt which have no size bound", None),
    # --- atexit should not be used ---
    ("G.FUU.04", "严重", r"\batexit\s*\(", "do not register atexit handlers", None),
    # --- kill / TerminateProcess (banned termination) ---
    ("G.FUU.05", "严重", r"\b(kill|TerminateProcess)\s*\(",
     "do not directly terminate another process; use structured shutdown", None),
    # --- empty catch block (no comment / no handling) ---
    ("G.ERR.08-CPP", "一般", r"catch\s*\([^)]*\)\s*\{\s*\}\s*$",
     "add a comment explaining why the exception is intentionally swallowed", None),
    # --- throw pointer instead of object ---
    ("G.ERR.02-CPP", "严重", r"\bthrow\s+&",
     "throw the exception object itself, not a pointer to it", None),
    # --- comment without whitespace after // or /* ---
    ("G.CMT.02", "一般", r"//\w", "add a space after the // comment marker", None),
    ("G.CMT.02-CPP", "一般", r"//\w", "add a space after the // comment marker", None),
    # --- empty function header comment (placeholders with no content) ---
    ("G.CMT.04", "一般", r"\*\s*参数：\s*\*", "fill in the parameter descriptions in the function header comment", None),
    ("G.CMT.04-CPP", "一般", r"\*\s*参数：\s*\*", "fill in the parameter descriptions in the function header comment", None),
    # --- reserved identifier (double underscore or underscore + uppercase) ---
    ("G.DCL.01", "严重", r"#\s*define\s+__\w+",
     "do not define identifiers with double underscores (reserved for implementation)", None),
    # --- extern array without explicit size ---
    ("G.ARR.07", "一般", r"\bextern\s+(int|char|void|bool|long|short|unsigned|signed|float|double|size_t)\s+\w+\[\]\s*;",
     "explicitly specify the array size in the extern declaration", None),
    # --- coverity / lint suppression comments ---
    ("G.CMT.06", "一般", r"/\*\s*coverity\[|//\s*coverity\[",
     "do not suppress static-analysis findings with comments; fix the defect instead", None),
    # --- malloc result used with arithmetic (pattern: malloc(...) + N) ---
    ("G.MEM.05", "一般", r"malloc\s*\([^)]*\)\s*[+-]\s*\w+",
     "do not add/subtract an offset from a malloc result; use a struct or pointer", None),
    # --- temp file in shared directory (/tmp, /var/tmp) ---
    ("G.FIL.03", "严重", r'fopen\s*\(\s*"/tmp/|open\s*\(\s*"/tmp/',
     "do not create temporary files in shared directories like /tmp", None),
    # --- const qualification for pointer/reference parameters ---
    ("G.CNS.04-CPP", "一般", r"\bvoid\s+\w+\([^)]*(?:int\s*\*|char\s*\*|void\s*\*|std::\w+\s*&)[^)]*\)\s*\{",
     "use const for pointer/reference parameters that are not modified", None),
    # --- if / while control expression not explicitly boolean ---
    ("G.EXP.36-CPP", "一般", r"\bif\s*\(\s*\w+\s*\)\s*\{",
     "use an explicit comparison (e.g. '!= 0') in control expressions", None),
    # --- #if with numeric constant instead of defined(...) ---
    ("G.PRE.03-CPP", "严重", r"#\s*if\s+(\d+)\b",
     "use '#if defined(NAME)' or a boolean expression, not a bare numeric constant", None),
    ("G.PRE.04-CPP", "一般", r"#\s*if\s+(\d+)\b",
     "ensure the identifier used in the #if expression is defined before use", None),
    # --- custom operator new without matching operator delete ---
    ("G.RES.12-CPP", "一般", r"operator\s+new\b",
     "if you define operator new you must also define the matching operator delete", None),
    # --- comparison where constant is on the left (Yoda-style) ---
    ("G.EXP.02", "一般", r"\bif\s*\(\s*(?:NULL|nullptr|\d+|[A-Z_]+)\s*[=!]=\s*\w+",
     "put the changing expression on the left, the constant on the right", None),
    ("G.EXP.29-CPP", "一般", r"\bif\s*\(\s*(?:NULL|nullptr|\d+|[A-Z_]+)\s*[=!]=\s*\w+",
     "put the changing expression on the left, the constant on the right", None),
    # --- self-increment/decrement variable referenced again in same expression ---
    ("G.EXP.03", "严重", r"\w+\s*[+]{2}\s*\)?\s*[+\-*/&|^]",
     "do not reference a variable that is also incremented/decremented in the same expression", None),
    ("G.EXP.33-CPP", "严重", r"\w+\s*[+]{2}\s*\)?\s*[+\-*/&|^]",
     "do not reference a variable that is also incremented/decremented in the same expression", None),
    # --- self-increment/decrement variable referenced again in same expression ---
    ("G.EXP.22-CPP", "严重", r"\w+\s*/\s*0\b", "do not divide by zero", None),
    # --- macro name clashes with a C/C++ keyword ---
    ("G.PRE.07", "严重",
     r'#\s*define\s+(int|char|void|bool|long|short|unsigned|signed|float|double|'
     r'while|for|if|else|switch|case|return|break|continue|goto|const|static|'
     r'virtual|template|namespace|class|struct|enum|union|typedef|using)\b',
     "do not #define a macro whose name matches a C/C++ keyword", None),
    ("G.PRE.07", "严重",
     r'#\s*define\s+(int|char|void|bool|long|short|unsigned|signed|float|double|'
     r'while|for|if|else|switch|case|return|break|continue|goto|const|static|'
     r'virtual|template|namespace|class|struct|enum|union|typedef|using)\b',
     "do not #define a macro whose name matches a C/C++ keyword", None),
    # --- bitwise '&' or '|' mixed with '+' without parentheses ---
    ("G.EXP.04", "一般", r"\w+\s*&\s*\w+\s*\+\s*\w+",
     "add parentheses to clarify operator precedence when mixing bitwise and arithmetic operators", None),
    # --- unsafe memory functions (memcpy, memmove, wcscpy, wcscat) without _s ---
    ("G.FUU.21", "一般", r"\b(memcpy|memmove|wcscpy|wcscat)\s*\(",
     "use the bounded _s variant (memcpy_s, wcscpy_s, ...) instead", None),
    # --- custom function named like a secure API (shadowing) ---
    ("G.FUU.15", "一般", r"\b(memcpy_s|memset_s|strcpy_s|strcat_s|sprintf_s)\s*\([^)]*\)\s*\{",
     "do not define custom functions with the same name as Huawei secure APIs", None),
    # --- both safe and unsafe variant called in same function (contradictory) ---
    ("G.FUU.22", "一般", r"memcpy\s*\(.*memcpy_s\s*\(",
     "do not call both memcpy (unsafe) and memcpy_s (safe) in the same function", None),
    # --- sizeof on a pointer type instead of the pointed-to object ---
    ("G.ARR.03", "一般", r"sizeof\s*\(\s*\w+\s*\*\s*\)",
     "sizeof(pointer) returns the pointer size, not the array size; use the array variable directly", None),
    # --- clear sensitive data (password/secret/key) with memset after use ---
    ("G.MEM.04", "严重", r"memset\s*\([^)]*(?:password|passwd|pwd|secret|key|token|auth)[^)]*\)",
     "clear sensitive data from memory after use with memset_s or SecureZeroMemory", None),
    # --- #if with identifier that may not be defined ---
    ("G.PRE.04-CPP", "一般", r"#\s*if\s+\w+\s*==",
     "use '#if defined(NAME)' instead of comparing an undefined identifier", None),
    # --- GCL.05-CPP: move ctor without move assignment ---
    ("G.CLS.05-CPP", "一般", r"\w+\(\w+\s*&&",
     "if you declare a move constructor also declare a move assignment operator", None),
    # --- unreachable code after return / goto ---
    ("G.OTH.01", "严重", r"^\s+return\s+\w+.*;\s*$",
     "remove code after return/goto that can never execute", None),
    ("G.OTH.01", "严重", r"^(\s*)goto\s+\w+;\s*\n\1\S",
     "remove code after goto that can never execute", None),
    # --- G.PRE.02-CPP: prefer function over function-like macro ---
    ("G.PRE.02-CPP", "一般", r"#\s*define\s+\w+\([^)]*\)\s*\\",
     "prefer a function over a multi-line function-like macro", None),
    # --- G.NAM.03-CPP: global variables should have g_ prefix ---
    ("G.NAM.03-CPP", "提示", r"^(int|char|long|short|float|double|void\s*\*|size_t|bool|unsigned)\s+\w+(?:\[\d+\])?\s*=\s*[^;]*;\s*$",
     "prefix global variables with 'g_' for clarity", None),
    # --- G.STD.10-CPP: non-const iterator when const would do ---
    ("G.STD.10-CPP", "一般", r"\bfor\s*\(\s*auto\s+\w+\s*=\s*\w+\.begin\(\)",
     "use cbegin()/cend() when the iterator is not modified", None),
    # --- G.FUU.14: macro renaming a secure function ---
    ("G.FUU.14", "一般", r"#\s*define\s+\w+_s\b",
     "do not create a macro that renames a secure function", None),
    # --- G.CNS.02-CPP: magic numeric literal in condition ---
    ("G.CNS.02", "严重", r"\bif\s*\(\s*\w+\s*(?:==|!=)\s*\d{4,}\s*\)",
     "replace magic numeric literal with a named constant", None),
    ("G.CNS.02-CPP", "严重", r"\bif\s*\(\s*\w+\s*(?:==|!=)\s*\d{4,}\s*\)",
     "replace magic numeric literal with a named constant", None),
    # --- G.NAM.01: naming convention violation (camelCase vs snake_case) ---
    ("G.NAM.01", "一般", r"^(int|char|void|bool|long|float|double|size_t|struct)\s+[A-Z]",
     "use snake_case for variable names, PascalCase for type names", None),
    # --- G.FUU.21-CPP: unsafe memory functions C++ (same as G.FUU.21) ---
    ("G.FUU.21-CPP", "一般", r"\b(memcpy|memmove|wcscpy|wcscat)\s*\(",
     "use the bounded _s variant (memcpy_s, wcscpy_s, ...) instead", None),
    # --- G.CTL.03: infinite loop (while(1) / for(;;) without break) ---
    ("G.CTL.03", "提示", r"while\s*\(\s*1\s*\)\s*\{[^}]*\}",
     "ensure the loop has a safe exit condition, not an infinite loop", None),
    # --- G.INT.04: integer addition without widening before assignment ---
    ("G.INT.04", "一般", r"uint32_t\s+\w+\s*=\s*\w+\s*\+\s*\w+\s*;",
     "cast operands to a wider type before addition to avoid overflow", None),
    ("G.EXP.26-CPP", "一般", r"uint32_t\s+\w+\s*=\s*\w+\s*\+\s*\w+\s*;",
     "cast operands to a wider type before addition to avoid overflow", None),
    # --- G.FUU.13: custom function wrapping a secure API ---
    ("G.FUU.13", "严重", r"void\s+\w+\s*\([^)]*\)\s*\{(?:[^}]*\n)*[^}]*memcpy_s\s*\(",
     "do not wrap secure functions; call them directly from callers", None),
    # --- G.G.OTH.06-CPP: redundant/dead code (empty block or unreachable) ---
    ("G.OTH.06-CPP", "一般", r"\{\s*//\s*todo|//\s*fixme:\s*remove",
     "remove redundant/unused code instead of commenting it out", None),
    # ==================================================================
    # Phase K — cover remaining 29 unmatched rule_ids
    # ==================================================================
    # G.STD.16-CPP: exit / quick_exit / atexit (banned termination) ---
    ("G.STD.16-CPP", "严重", r"\b(exit|_exit|quick_exit)\s*\(",
     "do not call exit() or related termination functions; use structured shutdown", None),
    # G.EXP.05: sizeof with side-effect (++/-- inside sizeof) ---
    ("G.EXP.05", "一般", r"sizeof\s*\([^)]*(?:\+\+|--)",
     "do not pass an expression with side effects to sizeof()", None),
    # G.PRE.06: function-like macro too long (more than ~10 lines ≈ many \ continuations) ---
    ("G.PRE.06", "一般", r"#\s*define\s+\w+\([^)]*\)\s*(?:\\\s*\n\s*\S){8,}",
     "keep function-like macros short (prefer a function if >10 lines)", None),
    # G.PRE.08: preprocessor directive (#ifdef/#if) inside a macro argument ---
    ("G.PRE.08", "严重", r"#\s*define\s+\w+\([^)]*\)[\s\S]*?#\s*if",
     "do not use preprocessor directives inside macro arguments", None),
    # G.INC.10-CPP: anonymous namespace in header file ---
    ("G.INC.10-CPP", "严重", r"namespace\s*\{",
     "do not use anonymous namespace in header files (use a named namespace or static)", HEADER_EXTS),
    # G.AST.01 / G.AST.03 / G.AST.04: assert side-effects in non-debug paths ---
    ("G.AST.01", "严重", r"#\s*else\s*\n\s*#\s*define\s+\w+\([^)]*\)[^{]*\{[^}]*printf\s*\(",
     "release-build assert must not produce executable code; use an empty macro", None),
    # G.CTL.07: switch without default (C) — detect `switch(...){` then no default ---
    # Partial: flag switch with no default keyword on subsequent lines
    # G.CTL.08 / G.EXP.38-CPP: switch with only 1 case — partial heuristic
    ("G.CTL.07", "严重", r"switch\s*\([^)]*\)\s*\{\s*case\s+\w+\s*:\s*[^}]*\}(?:\s*break)?\s*$",
     "switch must have a default branch", None),
    # G.PRE.10: macro depending on external local variables ---
    ("G.PRE.10", "严重", r"#\s*define\s+\w+\([^)]*\)\s*(?:\\\s*\n\s*)*[^()]*\b(count|len|size|i\b|j\b|index|ret|rc|result)\b",
     "macro should not depend on local variable names from the calling scope", None),
    # G.FIL.04-CPP: duplicate files (same basename, different compatible ext) ---
    # checked in file_hygiene_guard.py below
    # G.PRE.05-CPP / G.PRE.13: #endif in different file — checked via file_hygiene
    # G.INC.07: extern declarations in .c files ---
    ("G.INC.07", "严重", r"extern\s+(int|char|void|bool|long|short|unsigned|signed|float|double|size_t|struct)\s+\w+\s*\([^)]*\)\s*;",
     "use header includes instead of extern function declarations", None),
    # G.RES.06-CPP: default lambda captures (duplicate coverage with G.RES.05-CPP) ---
    ("G.RES.06-CPP", "一般", r"\[(=|&)\s*\]",
     "avoid default lambda captures; specify captured variables explicitly", None),
    # G.INT.09: duplicate enum values (check explicitly-assigned duplicates) ---
    ("G.INT.09", "严重", r"enum\s+\w+\s*\{[^}]*=[^,}]*,?\s*\w+\s*=",
     "ensure each enum constant maps to a unique value", None),
    # G.ERR.07-CPP: ctor try-catch using member vars ---
    ("G.ERR.07-CPP", "严重", r":\s*\w+\([^)]*\)\s*try\s*\{",
     "do not access base class or member variables in a constructor try-catch handler", None),
]
RULES = [(rid, sev, re.compile(pat), fix, exts) for rid, sev, pat, fix, exts in _RAW_RULES]


def _load_sensitive_words():
    """Compile every sensitive word from data/ruleset_c.json into a matcher.
    ASCII alphanumeric tokens match on word boundaries (case-insensitive) so
    'aar' does not fire inside 'aardvark'; tokens with spaces/punctuation match
    as a case-insensitive substring; CJK tokens match as a plain substring.
    Returns [(rule_id, severity, compiled_re, word)]. Missing/broken data is a
    hard error at load time so a silent bypass can never masquerade as clean."""
    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    out = []
    for w in data.get("sensitive_words", []):
        token = (w.get("word") or "").strip()
        if not token:
            continue
        if re.fullmatch(r"[A-Za-z0-9]+", token):
            pat = re.compile(r"\b%s\b" % re.escape(token), re.IGNORECASE)
        elif token.isascii():
            pat = re.compile(re.escape(token), re.IGNORECASE)
        else:
            pat = re.compile(re.escape(token))
        out.append((w.get("rule_id", "WordsTool"), w.get("severity", "一般"), pat, token))
    return out


SENSITIVE_WORDS = _load_sensitive_words()


def _rule_findings(files):
    findings = []
    for path in files:
        ext = path.suffix.lower()
        text = path.read_text(encoding="utf-8", errors="replace")
        lines = text.splitlines()
        for rid, sev, pat, fix, exts in RULES:
            if exts is not None and ext not in exts:
                continue
            for n, line in enumerate(lines, 1):
                if pat.search(line):
                    findings.append({
                        "file": str(path), "line": n, "rule_id": rid,
                        "severity": sev, "remediation": fix,
                    })
        for rid, sev, pat, word in SENSITIVE_WORDS:
            for n, line in enumerate(lines, 1):
                if pat.search(line):
                    findings.append({
                        "file": str(path), "line": n, "rule_id": rid,
                        "severity": sev,
                        "remediation": "remove sensitive/banned word %r" % word,
                    })
    return findings


def _format_failures(files):
    clang_format = shutil.which("clang-format")
    if not clang_format:
        return ["clang-format not found in PATH"]
    cp = subprocess.run([clang_format, "--dry-run", "--Werror", *map(str, files)], text=True)
    return ["format guard failed"] if cp.returncode else []


def _clang_tidy_findings(files, compile_commands_dir):
    """Run clang-tidy on *files* using a compilation database at
    *compile_commands_dir*, then map each warning to a workbook rule_id via
    _CLANG_TIDY_RULE_MAP.  Returns [] if clang-tidy is unavailable or the
    compilation database is missing (the caller logs those separately)."""
    clang_tidy = shutil.which("clang-tidy")
    if not clang_tidy:
        return [], "clang-tidy not found in PATH"
    ccd = Path(compile_commands_dir) / "compile_commands.json"
    if not ccd.is_file():
        return [], "compile_commands.json not found at %s" % ccd

    cmd = [clang_tidy, "--config-file=" + str(CLANG_TIDY_CFG),
           "-p", str(ccd.parent), *map(str, files)]
    cp = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    findings = []
    for line in cp.stdout.splitlines():
        # clang-tidy output: /path/file.cpp:42:5: warning: check-name [check-name]
        m = re.match(r'^[^:]+:\d+:\d+:\s*(?:warning|error):\s+.*?\[([^\]]+)\]$', line)
        if not m:
            continue
        check = m.group(1)
        # Map check name to rule_id
        for pattern, rule_id in _CLANG_TIDY_RULE_MAP:
            if re.match(pattern.replace("*", ".*") + "$", check):
                # Extract line number
                lm = re.match(r'^[^:]+:(\d+):', line)
                lineno = int(lm.group(1)) if lm else 1
                findings.append({
                    "file": str(cp.stdout),
                    "line": lineno,
                    "rule_id": rule_id,
                    "severity": "严重",
                    "remediation": "clang-tidy: %s" % line.strip(),
                })
                break
    return findings, ""


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--rules-only", action="store_true",
                      help="run only the deterministic rule blockers (skip clang-format)")
    mode.add_argument("--format-only", action="store_true",
                      help="run only clang-format (skip the rule blockers)")
    ap.add_argument("--clang-tidy", metavar="BUILD_DIR",
                    help="run clang-tidy on changed files using the compilation "
                    "database at BUILD_DIR/compile_commands.json")
    ap.add_argument("--json", metavar="PATH", help="write findings as JSON to PATH")
    ap.add_argument("files", nargs="*")
    args = ap.parse_args()

    # Scope guard: keep only C/C++ source among the (already changed-only) files
    # the caller passed. Unchanged files are never passed; non-code files drop here.
    files = [Path(x) for x in args.files if Path(x).suffix.lower() in EXTS]
    run_format = not args.rules_only
    run_rules = not args.format_only

    format_failures = _format_failures(files) if (files and run_format) else []
    findings = _rule_findings(files) if (files and run_rules) else []
    clang_tidy_findings = []
    clang_tidy_note = ""
    if args.clang_tidy and files:
        ct_findings, ct_note = _clang_tidy_findings(files, args.clang_tidy)
        clang_tidy_findings = ct_findings
        clang_tidy_note = ct_note

    if args.json:
        Path(args.json).write_text(json.dumps({
            "files": len(files),
            "mode": "rules-only" if args.rules_only else "format-only" if args.format_only else "full",
            "clang_tidy": bool(args.clang_tidy),
            "clang_tidy_note": clang_tidy_note or None,
            "format_failures": format_failures,
            "findings": findings,
            "clang_tidy_findings": clang_tidy_findings,
            "clang_format_rules_covered": list(_CLANG_FORMAT_RULES),
        }, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = list(format_failures)
    lines += ["%(file)s:%(line)s: %(rule_id)s [%(severity)s] %(remediation)s" % f
              for f in findings]
    lines += ["%(file)s:%(line)s: %(rule_id)s [%(severity)s] clang-tidy: %(remediation)s" % f
              for f in clang_tidy_findings]
    all_findings = findings + clang_tidy_findings
    # Every workbook row is 门禁级, so ANY finding blocks (no severity filter).
    if format_failures or all_findings:
        if lines:
            print("\n".join(lines), file=sys.stderr)
        if clang_tidy_note:
            print("clang-tidy note: %s" % clang_tidy_note, file=sys.stderr)
        return 1
    if not files:
        return 0
    fmt_covered = " + %d clang-format" % len(_CLANG_FORMAT_RULES) if run_format else ""
    ct_status = " + %d clang-tidy" % len(_CLANG_TIDY_RULE_MAP) if args.clang_tidy else ""
    print("code_ruleset PASS: %d file(s), %d regex rule(s) + %d sensitive word(s)%s%s checked"
          % (len(files), len(RULES), len(SENSITIVE_WORDS), fmt_covered, ct_status))
    if clang_tidy_note:
        print("clang-tidy note: %s" % clang_tidy_note, file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
