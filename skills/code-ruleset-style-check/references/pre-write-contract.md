# Pre-write coding contract

This contract is the author-time companion to the workbook gate. Load it before
creating or modifying a C/C++ source, header, test, build file, or generated
snippet in P2 or P3.

It is guidance for how to write the change; it is not PASS evidence. The only
author-time verdict is the shared `code_ruleset_guard.py` (and its file-hygiene
companion) run by the phase gate after the change is written.

## One source, two enforcement layers

- `data/ruleset_c.json` contains every one of the 545 workbook rows.
- `data/ruleset_coverage.json` maps every row to a backend and lifecycle owner.
- The current deterministic author-time layer covers 415 rows: 307 sensitive-word
  rows, 94 hard-regex rows, 7 multiline rows, 6 file-hygiene rows, and 1 static-gate row.
- Another 10 rows run as non-blocking advisory regex hints because line matching
  cannot prove their type/control-flow semantics.
- The remaining 130 rows are not deleted. They are owned by advisory regex,
  clang-format (P2),
  clang-tidy (P4), metrics (P4/P7), repository OAT (P7/CI), or semantic review.

The counts and row-to-backend mapping are auditable in the coverage manifest;
do not copy a second rule list into a skill. Repository exceptions come only
from the target checkout's `codecheck_ignore.json` and are recorded in output.
When the workbook changes, regenerate the data and coverage manifests before
updating this contract.

## Before the first edit

1. Read this contract and the relevant rows in `data/ruleset_coverage.json`.
2. Read `ohos-dev-cpp-coding-style/references/rules.md` for OpenHarmony API,
   ownership, inheritance, naming, and comment decisions.
3. Inspect nearby files and preserve their established conventions unless they
   conflict with a workbook gate rule.
4. Keep the change scoped to the requested files. Do not scan or reformat the
   whole repository as a substitute for changed-file validation.
5. Plan the safe form before typing the unsafe form: approved APIs, explicit
   lambda captures, checked bounds, explicit ownership, and a real header
   declaration rather than a stray `extern` declaration.

## Lifecycle critical subset

The lifecycle gates consume the guard's existing JSON under one explicit policy
(`gatelib.P2_P3_CRITICAL_RULESET_IDS` / `P4_CRITICAL_AST_RULESET_IDS`). These are
the only static findings that can close P2/P3/P4:

- **P2/P3 deterministic rules**: `G.FUU.21`, `G.FUU.21-CPP`, `G.STR.01`,
  `G.ARR.03`, `G.MEM.05`, `G.FUU.10`, `G.EXP.03`, `G.EXP.33-CPP`, `G.INT.04`,
  `G.EXP.26-CPP`.
- **P4 clang-tidy AST rows**: `G.RES.07-CPP`, `G.FUU.11`, `G.VAR.01`,
  `G.EXP.08-CPP`, `G.STD.04-CPP`, `G.EXP.12-CPP`, `G.INT.03`.

Everything else — clang-format, other regex rules, sensitive words, filename
checks, file hygiene, metrics — is retained as signed observation evidence but is
owned by P8 review / remote CI. A missing guard, unreadable report, or
unavailable clang-tidy/compile database is fail-closed, not clean.

## Rules to apply while writing

These are the high-signal author-time families. The standalone guard reports them
all; the lifecycle P2/P3 verdict is determined only by the critical subset above,
and P4 by its AST subset. Write to the full contract anyway: observations still
reach review, and the critical subset is deliberately small.

- **Sensitive words (`WordsTool.*`)**: avoid all workbook-sensitive terms in
  identifiers, comments, strings, test names, and build metadata. The guard
  reports only the rule ID; do not echo the matched term into evidence.
- **Headers and preprocessing**: use `.h`/`.cpp` for new C++ files, include
  guards instead of `#pragma once`, keep includes outside `extern "C"`, avoid
  function-like macro control flow and macro-local-name dependencies, and do
  not add header-level namespace imports.
- **Namespace order**: never put `using namespace` before the final include.
  A `.cpp` import after includes is not the `G.INC.08-CPP` violation; a header
  namespace import remains disallowed by the OpenHarmony/C++ checks.
- **Unsafe and security-sensitive APIs**: do not introduce `system`, `popen`,
  unsafe string/memory functions, `realloc`, `alloca`, `abort`, direct process
  termination, `atexit`, weak crypto, unvalidated dynamic loading, or insecure
  randomness. Use the approved project wrapper or a checked alternative.
- **Memory and ownership**: use `make_unique`/`make_shared` for the matching
  smart-pointer construction, do not retain `c_str()` pointers, clear sensitive
  data through the approved secure primitive, and make non-owning lifetime
  boundaries explicit.
- **Expressions and control flow**: use `nullptr`, avoid confusing literal
  suffixes and magic values, parenthesize mixed-precedence expressions, guard
  division, give loops a real exit, and do not leave code after a terminator or
  jump upward with `goto`.
- **Lambdas and types**: avoid default captures; list captures explicitly when
  a lambda is stored, posted, or crosses a thread boundary. Keep pointer and
  reference parameters `const` when they are not mutated.
- **Comments and delivery hygiene**: remove commented-out code, unresolved
  TODO/FIXME/TBD/HACK markers, empty placeholder API comments, and static-analysis
  suppression comments. Public API comments must explain behavior, ownership,
  lifetime, threading, constraints, or failure semantics when those are not
  obvious from the signature.
- **Files and build inputs**: add the required OpenHarmony license header, keep
  text UTF-8/LF, do not add binary artifacts, and ensure literal C/C++ paths in
  `BUILD.gn` exist.

## P2 and P3 specifics

- **P2 feature code**: apply the full contract, then run the normal guard mode
  (format plus author-time rules) on changed C/C++ files. P2 signs the critical
  subset verdict; format and file hygiene are observations.
- **P3 tests**: apply the same contract to test code, fixtures, and test build
  inputs. `--rules-only` skips layout formatting for gtest macro bodies and scans
  changed lines against the same critical subset; other rules and hygiene are
  observations.
- Test names and test data are still code-review inputs. Do not assume that a
  test-only file is exempt from workbook rules, even when a non-critical finding
  no longer blocks P3.

## Known safe semantics

These cases are deliberately handled so normal C++ is not rejected:

- `public:`, `private:`, and `protected:` are access specifiers, not `goto`
  labels for the purpose of `G.CTL.06`.
- A normal `return value;` is not unreachable code. `G.OTH.01` fires only when a
  later executable statement is actually present in the same function scope.
- A namespace import after all includes in a `.cpp` file is not the
  `G.INC.08-CPP` before-include violation.

Do not weaken a rule because a regex cannot prove a semantic property. The
coverage owner remains responsible for later AST, metric, OAT, or human review.

## Checks that cannot be completed before writing

Do not claim these rows were checked merely because the pre-write contract was
loaded:

- clang-format rows are checked by P2's default guard mode and recorded as
  observation;
- the critical clang-tidy AST subset is checked by P4 after a compile database
  exists; an unavailable tool/database/report fails closed;
- metric rows are recorded after a successful build as observation, and P7 keeps
  its existing quality ownership;
- repository OAT rows are checked by the repository/CI OAT tooling;
- semantic-review rows require the ownership, API, concurrency, validation, and
  security reasoning described by the relevant review skill.

If a later owner is unavailable, leave the gate fail-closed or observation-only
as specified by the lifecycle phase documentation; never delete the workbook row.
