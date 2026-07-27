---
name: ohos-code-knowledge-base
description: Generate, refine, verify, and incrementally update a full OpenHarmony code knowledge base for any provided workspace path, source domain, subsystem, component, or repository. Use when users ask to analyze a code directory globally, build a code knowledge base, generate repository/component/GN target indexes, document subsystem and component functions, model real processes/init/System Abilities and cross-component hosts, refresh documentation after code changes, compare knowledge-base changes, or continue drilling into capabilities and features. Triggers include “生成代码知识库”, “全局索引”, “功能说明”, “进程维度”, “分析这个目录/子系统”, “更新知识库”, and equivalent requests.
---

# OpenHarmony Code Knowledge Base

Build a two-view knowledge base:

```text
physical source domain -> repositories/components/targets
ownership tree -> subsystem -> component or process -> capability -> feature
```

Do not treat a physical directory such as `foundation/` or `base/` as a subsystem.

## Select The Workflow

1. Resolve the workspace root, source path, domain name, product context, and knowledge-base path.
2. Check for an existing domain-specific generator under `specs/knowledge-base/tools/`.
3. Reuse a proven domain generator when it covers the requested path and output architecture.
4. Otherwise run the bundled generic pipeline.
5. For an update, reuse the previous domain name and source path from `generated/<domain>/summary.json` unless the user overrides them.

Read [references/architecture.md](references/architecture.md) before changing hierarchy or mapping rules.
Read [references/semantic-analysis.md](references/semantic-analysis.md) before writing or refining functional documentation.
Read [references/incremental-update.md](references/incremental-update.md) for update and removal handling.

## Gather Inputs

Determine without unnecessary questions when the workspace provides the answer:

- `workspace-root`: multi-repository checkout root.
- `source-path`: path to scan, inside the workspace.
- `domain-name`: stable physical source-domain identifier.
- `knowledge-base`: default `specs/knowledge-base`.
- `product-parts`: optional product selection file such as `out/preloader/<product>/parts.json`.
- excludes: default `.git`, `.repo`, `out`, `prebuilts`, and `node_modules`.
- focus: optional runtime, security, performance, API, build, or reliability deep dive.

Never clean, reset, checkout, or rewrite source repositories. Record dirty repositories as input facts.

## Run The Generic Pipeline

Set `SKILL_DIR` to this skill directory, then run:

```bash
python3 "$SKILL_DIR/scripts/build_knowledge_base.py" \
  --workspace-root <workspace-root> \
  --source-path <source-path> \
  --domain-name <domain-name> \
  --knowledge-base <knowledge-base> \
  --product-parts <optional-parts.json>
```

Omit `--product-parts` when no current product evidence exists. Pass additional excluded directory names with repeated `--exclude`.

The pipeline executes:

```text
scan repositories/components/BUILD.gn/runtime configs
  -> write TSV/JSON indexes and changes.json
    -> generate source-domain/subsystem/component/process pages
      -> verify equations, document coverage, links, and whitespace
```

Use `--skip-docs` only when the user explicitly requests indexes without documentation.

## Expected Machine Outputs

Require these under `generated/<domain>/`:

- `repositories.tsv`
- `components.tsv`
- `modules.tsv`
- `unmapped-modules.tsv`
- `processes.tsv`
- `runtime-entities.tsv`
- `subsystems.tsv`
- `summary.json`
- `changes.json`
- `generated-documents.json`
- `verification.json`
- `verification.md`

Treat `changes.json` as the update worklist, not as a substitute for reading source diffs.

## Expected Document Outputs

Generate domain-specific files to avoid overwriting other source-domain views:

```text
source-domains/<domain>/README.md
subsystems/<subsystem>/<domain>-functional-overview.md
subsystems/<subsystem>/<domain>-processes.md
subsystems/<subsystem>/<domain>-index.md
subsystems/<subsystem>/components/<component>/<domain>-functional-overview.md
subsystems/<subsystem>/components/<component>/<domain>-index.md
subsystems/<host-subsystem>/processes/<process>/<domain>-runtime.md
```

Create entry `README.md` files only when absent. Never overwrite an existing manual README.

## Model Processes Correctly

Use production init/service configuration and SA profiles as strong evidence.

- Assign the init configuration owner as `init-owner` and primary host subsystem.
- Assign a matching production executable target as `executable-owner`.
- Assign the component containing an SA profile as `sa-provider`.
- Preserve cross-component and cross-subsystem hosting.
- Allow one process to host many components and one component to contribute to many processes.
- Exclude tests, examples, demos, benchmarks, and CLI tools from the production process tree.
- Mark SA-only host inference as medium confidence and require runtime confirmation.

Use [assets/templates/process.md](assets/templates/process.md) for manual process refinement.

## Refine Semantic Quality

The generic generator creates a factual baseline. After it passes verification:

1. Inspect weak component descriptions and high-risk/high-dependency components.
2. Read source README, public/inner interfaces, service entry points, init/SA profiles, and representative tests.
3. Replace shallow summaries with problem, caller, capability, interface, runtime, and risk explanations.
4. Add actual call chains for important services and processes.
5. Put durable manual analysis in capability/feature nodes, not generated files.

Do not claim a detailed feature explanation by only humanizing a feature flag, directory, target, or library name.

Use the bundled templates when creating manual nodes:

- [assets/templates/capability.md](assets/templates/capability.md)
- [assets/templates/feature.md](assets/templates/feature.md)
- [assets/templates/process.md](assets/templates/process.md)

## Update Existing Knowledge

For a refresh:

1. Run the same pipeline with the same domain name.
2. Read `changes.json` for added, removed, and changed repositories, components, modules, processes, and runtime evidence.
3. Inspect actual Git diffs for changed source repositories.
4. Regenerate domain-specific generated pages.
5. Update manual capability/feature pages affected by API, process, configuration, or behavior changes.
6. Do not delete stale manual directories automatically. Report candidates and remove only with clear evidence or user approval.
7. Re-run verification and update visible workspace counts only after generation completes.

## Validation Gates

Do not report completion unless:

- repository/component/target/process summary counts equal TSV row counts;
- mapped targets plus unmapped targets equal all targets;
- component target totals equal mapped targets;
- subsystem target totals equal all targets;
- init and SA summary counts equal runtime evidence rows;
- every component and strong-evidence process has its domain page;
- local Markdown links resolve;
- generated Markdown has no trailing whitespace;
- generator scripts pass syntax checks;
- source repositories were not modified by generation.

If the generic scanner cannot parse a repository's metadata or build system, extend the scanner or add a domain-specific generator. Do not fabricate coverage.

## Final Report

Report:

- source path and domain;
- repository, component, subsystem, build file, target, process, init, SA, and document counts;
- product-selected component count when available;
- added/removed/changed counts from `changes.json`;
- source-domain entry, machine summary, and verification links;
- dynamic target, invalid config, product-context, and runtime-confirmation limitations;
- source repository status confirmation.

## Lexical Search Index (BM25) — build & incremental refresh

The knowledge base ships a **dependency-free BM25 lexical search** under `tools/search/`, used by
the P1 design phase (`ohos-ar-dev-phases/phase1-design.md`) to pull relevant subsystem/feature
docs as advisory design input. It is pure-Python (standard library only), fully offline, and locks
to no model. The index is derived output under `generated/search-index/` and is **gitignored** —
rebuild locally after cloning.

- **Build / full rebuild**:
  ```bash
  python3 openharmony-knowledge-base/tools/search/build_index.py          # incremental (full if absent)
  python3 openharmony-knowledge-base/tools/search/build_index.py --rebuild # discard cache, full rebuild
  ```
- **Incremental refresh (核心)**: after adding or editing ANY `*.md` (e.g. a new
  `subsystems/.../features/<feature>/README.md`), just rerun `build_index.py` — it compares each
  file's sha against the manifest and only re-chunks changed/new files, reusing the rest. This is
  how the search corpus keeps growing without a full re-index.
- **Query**:
  ```bash
  python3 openharmony-knowledge-base/tools/search/kb_search.py \
      --query-file <text> --k 8 --out <out.md>
  ```
  `kb_search.py` also auto-detects a stale/missing index and triggers an incremental rebuild before
  searching, so callers never see an out-of-date or absent index. All failures degrade to a
  placeholder + exit 0 (advisory, never blocks P1).
