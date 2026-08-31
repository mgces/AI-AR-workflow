---
name: ohos-doc-quality-check
description: Review OpenHarmony Markdown, API documentation, and knowledge-base updates for source consistency, links, terminology, commands, and workflow synchronization. Use when code or workflow changes require documentation and knowledge-base updates.
---

# OpenHarmony documentation quality check

Review documentation against the current repository state rather than treating existing prose as authoritative.

## Checks

- Every mentioned Skill, script, option, phase and output path exists in `skills/`, the unique installable source.
- Workflow changes are synchronized across the entry Skill, phase docs, gate contract, skill map, examples and knowledge-base routing.
- OHOS SDD and AR remain distinct workflows; SDD produces `AR.md`, which is the AR workflow input.
- Commands state their working directory, prerequisites, mutation scope and evidence of success.
- Links and VitePress navigation resolve; generated `dist/` is not used as the source.
- Claims such as “CI equivalent”, “full coverage” and “PASS” name the backend and evidence. Missing or advisory tooling is not presented as success.
- API facts and subsystem ownership are checked against local source or an authoritative upstream source, with uncertainty stated explicitly.

Return findings with file, section, impact and the source used for verification. Update documents only when the user has requested changes.
