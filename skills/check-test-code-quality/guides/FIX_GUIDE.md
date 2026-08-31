# XTS 质量问题修复导航

本页只提供修复导航。`scripts/main.py --fix` 不会自动修改源码；Agent 执行任何修复前，必须确认目标文件和用户授权，并在修改后重新扫描、构建和测试。

| 规则 | 指南 | 边界 |
|---|---|---|
| R008 | [用例声明格式](R008_testcase_format/R008_FIX_GUIDE.md) | 只改格式，保持测试语义 |
| R011 | [testsuite 重名](R011_testsuite_duplicate/R011_FIX_GUIDE.md) | 修改名称后同步引用并复测 |
| R012 | [p7b 签名问题](R012_p7b_signature/R012_FIX_GUIDE.md) | 工具、私钥、证书和 profile 均由用户从受信渠道提供 |
| R014 | [HAP 命名](R014_hap_naming/R014_HAP_NAMING_GUIDE.md) | BUILD.gn 与 Test.json 必须一致 |
| R016 | [testcase 命名](R016_testcase_naming/R016_FIX_GUIDE.md) | 修改 it 名称后同步 `@tc.name` |
| R018 | [testcase 重复](R018_testcase_duplicate/R018_FIX_GUIDE.md) | 去重后保持用例覆盖范围 |

没有确定性扫描器的规则只能作为 advisory 分析；未执行、跳过或工具不可用不得记为 0 问题。
