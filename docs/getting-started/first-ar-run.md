# 首次运行一个 AR

> 通过一个最小 AR 示例带用户第一次看懂:run 目录如何创建、PDIR 是什么、evidence / reports / pipeline.json 的关系,以及 first run 的典型用户动作。

## run 目录如何创建

当你调用 `/ohos-ar-dev-workflow <AR 文本>`,编排器会在 `specs/pipeline/` 下为这个 AR 建独立流水线目录:

```
specs/pipeline/{YYYYMMDD}-{slug}/
```

`slug` 由 AR 文本提炼而来。这个目录就是 **PDIR**(pipeline dir),整个 AR 的运行态都落在这里。

## PDIR 里有什么

```
$REPO/specs/pipeline/{YYYYMMDD}-{slug}/
├── pipeline.json        # 规范状态(只有 advance.py 写;含 functional_fingerprint/locked_all_paths)
├── ar.md                # 输入的已澄清 AR 原文
├── AR_design.md         # P1 固化的设计文档(6 必含章节;签名副本在 evidence/phase1/)
├── todo.md              # 人读镜像(由 refresh_todo.py 依 AR_design 重写,与 TodoWrite 双轨)
├── next_action.json     # 导航层:当前逻辑阶段/物理 phase/substate/下一步
├── evidence/            # ← 机器证据(签名,gitignore),真相所在
│   ├── manifest.jsonl   #   追加式 HMAC 链式签名证据账本
│   └── phase0/ … phase8/  # 各阶段真实产物
├── controls/            # ← 弱模型控制/导航层(best-effort,非放行依据,可缺失容忍)
└── reports/             # ← 人读 Markdown 审计报告(脱敏,可归档),与 evidence/ 分离
```

## evidence / reports / pipeline.json 的关系

三者职责严格分离:

| 目录/文件 | 角色 | 谁属 |
|---|---|---|
| `pipeline.json` | 规范状态:当前 phase、consent、功能指纹等。**只有 `advance.py` 能写** | 机器 |
| `evidence/` | 机器证据账本:HMAC 签名 + 产物 sha256。**放行唯一真相源** | 机器(gitignore) |
| `reports/` | 人读 Markdown 审计报告:可脱敏归档。**给人看,不是放行依据** | 人读 |

## first run 的典型用户动作

第一次跑一个 AR,你会经历:

1. **确认编译部件**:编排器会先问你本 AR 要编译哪个组件(默认 hiview)
2. **P0 自动跑完**:环境校验通过后自动推进到 P1
3. **P1 设计固化**:编排器写 `AR_design.md`,跑 `gate_design.py` 校验 6 章节 + ar-contract 契约,通过后**停下等你 consent**
4. **你 consent 设计**:`advance.py consent --phase 1 --token <你的确认令牌>`
5. **P2 开发**:编排器按签名设计写代码,跑 `gate_develop.py` 校验改动 + C++ 门控,通过后锁定功能指纹,自动推进
6. **P3 测试开发**:只允许新增独立测试文件,契约每个 `test_cases[].gtest` 的 suite 出现在新测试文件
7. **P4 编译**:真跑 `build.sh`,捕获成功横幅
8. **P5 单测执行**:developer_test 跑通,tests>0 且 fail==0 err==0
9. **P6 真机**:部署 + hilog 抗伪造三层证明,**停下等你核对真机结果并 consent**
10. **P6 真机**:部署 + hilog 抗伪造三层证明,**停下等你核对真机结果并 consent**
11. **P7 质量**:覆盖率/性能/功耗/稳定性报告,**停下等你核对质量并 consent**
12. **P8 上库**:本地自检零问题 → commit → push → 建 PR → PR review 零问题 → CI 绿,**停下等你确认上库并 consent**

## 常见误区

- **以为模型说"完成"就是完成**:不是。只有门控脚本 PASS + `advance.py` 推进才算阶段通过
- **想跳阶段**:阶段顺序不可跳,只能关闭 `current_phase` 指向的阶段
- **改了功能代码想继续当前阶段**:不行。改功能代码必须 `advance.py reset` 回 P1 重走(功能指纹漂移会被拒)

## 延伸阅读

- [run 目录结构参考](/reference/pipeline-layout)
- [Consent 与 Reset](/workflow/consent-and-reset)
- [新增功能端到端示例](/examples/new-feature-end-to-end)
