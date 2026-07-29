# FAQ

> 收录高频误解速查。

## 为什么 gate PASS 了还不能前进？

可能原因：

- 该阶段需要人工 `consent`（P1/P6/P7/P8）而你没签字 → `advance` 会 HOLD
- 产物 sha256 当前不匹配（证据被改动）→ `verify-all` 校验失配
- 功能指纹漂移（改了功能代码）→ 从 phase3 起 `advance` 被拒
- 阶段顺序不可跳，只能关闭 `current_phase` 指向的阶段

读 `evidence/phaseN/` 真实日志修复后重跑门控。

## 为什么改了代码必须回 P1？

硬控制：**P2 闭合时已锁定功能指纹**，`check_code_drift` 从 phase3 起生效。改功能代码/配置内容后 `advance P3..P8` 会因功能指纹漂移被拒——必须 `advance.py reset` 回 P1 重走。

不许只补跑当前阶段（功能指纹漂移会强制拒绝）。只有新增独立测试文件（test 路径）不触发漂移，可继续。

## 为什么不允许只看文本报告？

放行唯一真相源是 `evidence/manifest.jsonl` 签名记录，不是 `reports/*.md` 人读报告。报告可脱敏可归档，但不是放行依据——门控只认签名证据账本。

这是防伪核心：模型无法伪造 HMAC 签名（密钥隔离在 `.lifecycle-secret/`，不在证据目录内），但可以写人读报告。如果把报告当放行依据，就绕过了证据门控。

## 为什么需要 issue 才建 PR？

`gate_upload_ci.py` 的 `--issue N` 必填(**仅 gitcode/openharmony 后端**)——CI 门禁只对绑定 Issue 的 PR 触发。这是为了确保每个 PR 都有对应的需求追溯（issue），避免凭空上库。gerrit/HarmonyOS 后端走 refs/for 评审,不需要 issue。

## openharmony 和 HarmonyOS 环境有什么区别？

两种形态在同一套流水线里共存,从 `init` 就用 `--environment` 强制区分:

| | openharmony(默认) | harmonyos |
|---|---|---|
| 代码来源 | gitcode 下载 | 不下载(内部已有) |
| 编译命令 | `./build.sh --product-name rk3568 …` | 系统/芯片组件各不同(**占位待填**) |
| 上库后端 | gitcode(`oh-gc` PR + OpenHarmony CI) | gerrit(`git push refs/for` + review 标签) |
| 真机测试 | hdc/hilog(一致,复用) | hdc/hilog(一致,复用) |

环境相关取值全部由 `lib/environments.py` 单点解析,门控不写死。HarmonyOS 编译命令/上库命令**目前为占位**,未填时门控硬失败并打印"待填"提示,绝不静默跑错。`--environment harmonyos` 时 `--component-type system|chip` 必填。

## 为什么知识库不是源码真理？

知识库是 advisory 不进门控：

- 内容可能滞后于源码，以当前源码为准
- P1 的 `kb_search.py` 失败不阻断（advisory，不是必需）
- 门控只认 `evidence/` 真实证据，知识库内容是参考不是真相

## 真机 hilog 抓取里没有 nonce 怎么办？

scenario 脚本要让组件把 `$GATE_NONCE` 打进设备日志（`hilog`/`log -t … NONCE=$GATE_NONCE`），否则无法证明日志是本次的——新鲜度靠 nonce + `/proc/uptime` 单调锚 + 内容切窗 + sha256，不靠时间戳（设备 RTC 错乱）。

## 缺 runtime/e2e marker 或 hash 不一致怎么办？

scenario 必须从真实入口触发改动代码，并在成功路径输出 `--runtime-marker` 与 `--e2e-marker`；同时确认 `--host-artifact` 是本次构建产物、`--device-artifact` 是部署后设备实际文件。`gate_device_func.py` 会校验四类 marker + sha256 一致 + 抗伪造三层。

## 延伸阅读

- [Consent 与 Reset](/workflow/consent-and-reset) — 四处人工确认与功能指纹
- [Evidence 与 Gates](/workflow/evidence-and-gates) — 签名证据账本与防伪协议
- [门控契约](/reference/gate-contract) — 各 gate 的通过条件
- [关键命令](/reference/key-commands) — 修复用的命令速查
