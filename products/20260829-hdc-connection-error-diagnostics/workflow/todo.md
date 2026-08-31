# Change Todo

## Change Info

- Change: `20260829-requirement-add-hdc-connection-error-diagnostics`
- Original request: `开发前述 HDC client + host 连接错误码，构造测试验证对应分支，完成验证并提交上游 PR`
- CHANGES_ROOT: `specs/changes`
- Status: completed (compatibility-preserving endpoint-instance diagnostics addendum)

## Phase Status

| Phase | Status | Output |
|-------|--------|--------|
| REQUIREMENT_CLARIFYING | completed | compatibility addendum in `clarification.md`, `requirement-spec.md` |
| ARCHITECTURE_DESIGNING | completed | endpoint metadata design in `architecture.md` |
| TESTCASE_DESIGNING | completed | F-015/F-016 coverage in `test-cases.md`, `feature-test-matrix.md` |
| DEVELOPING | completed | E002116/E002117 source, metadata lifecycle and tests |
| VALIDATING | completed | Linux/Windows host builds, isolated CLI scenarios and AR validator |

## Gate Log

| Gate | Decision | Notes |
|------|----------|-------|
| REQUIREMENT_CLARIFYING -> ARCHITECTURE_DESIGNING | approved | 用户明确要求完整开发、测试、验证和 PR 闭环；既有方案已确认范围 |
| ARCHITECTURE_DESIGNING -> TESTCASE_DESIGNING | approved | 用户已授权完整闭环；所有 F-xxx 已映射到组件、接口、风险和回滚 |
| TESTCASE_DESIGNING -> DEVELOPING | approved | F-001～F-014 全覆盖；30 个 F/TC pair 均有 Given/When/Then，用户已授权进入开发 |
| DEVELOPING -> VALIDATING | approved | 18/18 mapper tests、2/2 lifecycle tests、full target link and four isolated CLI checks passed |
| VALIDATING -> COMPLETE | approved | 14 features / 30 F-TC pairs validated; source is ready for contribution workflow |
| COMPATIBILITY ADDENDUM -> DEVELOPING | approved | 用户明确要求不修改已有规格，只新增 E002116/E002117 并更新既有 PR、编译产物 |
| ADDENDUM VALIDATING -> COMPLETE | approved | 23/23 catalog/mapper、2/2 lifecycle、3 个实例 E2E 分支、Linux/Windows 全目标编译和 AR validator 通过 |
