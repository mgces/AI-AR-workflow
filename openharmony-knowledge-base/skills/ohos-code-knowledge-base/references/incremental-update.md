# Incremental Update Policy

## Contents

1. Refresh sequence
2. Change interpretation
3. Removal policy
4. Completion gates

## Refresh Sequence

Run indexes before process mapping and process mapping before functional documentation:

```text
workspace facts -> source indexes -> runtime indexes -> generated docs -> manual impact update -> verification
```

## Change Interpretation

Use `changes.json` to locate structural changes, then inspect source Git diffs to understand intent.

- Repository change: refresh state and ownership.
- Component change: inspect metadata, dependencies, features, and product selection.
- Module change: inspect build boundary and affected tests.
- Process/runtime change: inspect identity, startup, SA, security, and lifecycle.
- Removed entry: verify product/config variants before declaring removal.

## Removal Policy

Do not automatically delete manual documentation. Regenerated domain-specific pages can disappear from navigation, but stale capability/feature directories must be reported as candidates and removed only with evidence or explicit approval.

Preserve historical evidence when it is useful, but label it with source revision and date.

## Completion Gates

Require coverage equations, document coverage, valid links, no trailing whitespace, script syntax success, and confirmation that source repositories were not modified by generation.

Update top-level visible counts only after all generated files exist, because documentation creation changes workspace file totals.
