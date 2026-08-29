---
name: ohos-code-knowledge-base
description: Navigate the stable OpenHarmony subsystem/component/process hierarchy, then verify every code fact in the user's current OpenHarmony source checkout. Use for locating the responsible repository or narrowing where to inspect; do not use the knowledge base as evidence for current files, APIs, GN targets, dependencies, product configuration, tests, or runtime behavior.
---

# OpenHarmony Source Navigation

Use this skill as a map to the current source, never as a mirror of the source.

## Non-Negotiable Boundary

- The knowledge base may suggest a subsystem, component, process, capability, feature, or search term.
- Current code facts come only from the active source checkout and its build/config/test/runtime evidence.
- Never copy a path, API, target, dependency, product selection, process property, or behavior from a knowledge page into a design or patch without verifying it in the current source.
- Record the verified repository path and `git rev-parse HEAD` when a code fact affects implementation.

Read [references/architecture.md](references/architecture.md) when changing navigation hierarchy.
Read [references/semantic-analysis.md](references/semantic-analysis.md) before making implementation claims.
Read [references/incremental-update.md](references/incremental-update.md) when updating navigation nodes.

## Navigate Then Verify

1. Resolve the current source root from `--source-root`, `$OHOS_ROOT`, or the active pipeline state. If it is unavailable, return navigation candidates only and state that code facts remain unverified.
2. Query the stable navigation layer:

   ```bash
   python3 openharmony-knowledge-base/tools/search/kb_search.py \
     --source-root "$OHOS_ROOT" --query "<requirement>" --k 8
   ```

3. Use the returned current repository candidates as starting points, not conclusions.
4. In the current checkout, inspect `repo list`, `bundle.json`, `BUILD.gn`/`.gni`, public and internal interfaces, production configuration, tests, and representative callers.
5. Prefer current runtime/build/test evidence over documentation. If current source contradicts navigation text, update or remove the navigation node; never bend the source conclusion to match the knowledge base.

## Two Layers

`stable-navigation` is repository-owned and searchable:

- system architecture concepts;
- ownership hierarchy and durable names;
- subsystem -> component/process -> capability -> feature navigation;
- instructions for finding and validating the current source.

`dynamic-source` is not copied into this repository:

- checkout/branch/dirty state;
- file and API inventories;
- GN targets, dependencies, build artifacts, test parts;
- product selection and feature switches;
- init/SA/process/runtime facts;
- generated source scans and pipeline evidence.

Resolve `dynamic-source` on demand in the corresponding current code repository.

## Maintain Navigation

- Add only navigation nodes under `subsystems/**/README.md`.
- Do not commit generated TSV/JSON inventories, workspace snapshots, source-domain mirrors, product snapshots, or generated implementation analyses.
- A feature sink may record ownership terms and current-source lookup instructions, but not build/test/runtime results or copied implementation facts.
- Normalize and validate navigation after hierarchy changes:

  ```bash
  python3 openharmony-knowledge-base/tools/rebuild_navigation.py
  python3 openharmony-knowledge-base/tools/rebuild_navigation.py --check
  python3 openharmony-knowledge-base/tools/search/build_index.py --rebuild
  ```

## Report

Separate the result explicitly:

- `Navigation candidates`: knowledge-base paths and ownership terms.
- `Verified current-source facts`: source repository, HEAD, files/config read, and the conclusion.
- `Unverified`: anything that could not be checked in the active checkout.
