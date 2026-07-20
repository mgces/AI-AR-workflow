# 防伪协议(evidence-protocol)

目标:让"阶段通过"无法被自由文本伪造,且真机证据在**设备 RTC 错乱**下仍可信。

## 1. 签名账本

- `evidence/manifest.jsonl`,每行一条门控记录:
  `{ts_utc,seq,prev,phase,gate,cmd,argv,exit_code,nonce,artifacts:[{path,sha256}],verdict,reason,hmac}`。
- `hmac` = HMAC-SHA256(per-run 密钥, 规范化(去掉 hmac 字段、键排序) 的记录字节)。
- 密钥:`~/.claude/.lifecycle-secret/<run_id>`,32 字节,mode 600,**不在** `specs/pipeline/` 内。
- 篡改任一字段或任一 artifact → 重算 sha256/HMAC 不符 → `advance.py`/`verify-all` 拒绝。
- **哈希链防重放**:每条记录带 `seq`(位置)+`prev`(上一条的 hmac),两者都进签名字节。
  因此把一条**历史上合法**的 PASS 记录复制到末尾(即使把 artifact 也回滚成当初内容)也无法闭合阶段——
  它的 `seq`/`prev` 对不上真实链尾,而无密钥无法重新签名。`validate_closing_entry` 先 `verify_chain`
  校验全链连续,再看该阶段末条 PASS。(旧的无 `seq` 账本按 legacy 只做逐条 HMAC 校验,向后兼容。)

## 2. 主机侧证据(P1/P2/P3/P5 报告)

- 主机时钟正确。新鲜度锚:
  - P2:记录 build.log 启动前字节偏移,只在**新追加的尾部**找成功横幅 → 旧横幅无效。
  - P3/P5:运行前后对 `developer_test/reports/20*` 做集合差,要求**本次新建**报告目录 → 旧报告无效。
  - P1:用 git `base_commit`→`HEAD` 的 tracked diff 加 untracked 文件清单/内容指纹,与时间无关。
- 通过条件全部是可解析事实:exit code、横幅字符串、`<testsuites>` 的 tests/failures/errors。

## 3. 真机证据(P4,及设备型 P5)— RTC 无关三锚

1. **per-run nonce**(`secrets.token_hex(16)`):主机生成,注入 hilog
   (`log -t LIFECYCLE_GATE NONCE=<n> START/END`)并经 `$GATE_NONCE` 传给场景脚本,
   要求抓取文本中**必含本次 nonce**——旧/伪造日志不可能含本次随机串。
2. **`/proc/uptime` 单调锚**:部署前/抓取后各采一次,要求严格递增且 >0
   → 证明抓取发生在本次 boot、且在部署之后,完全不依赖墙钟。
3. **内容切窗 + sha256**:用 START/END nonce 标记界定窗口(非时间);原始抓取整体 sha256 入签名记录。
4. **命令留痕**:每条 `hdc` 命令 + exit code 落 `device_cmds.txt`;部署命令非 0 即判 FAIL。

## 4. 上库证据(P6)— SHA 绑定

- 真实证据 = 已创建的 PR(号/URL/head SHA)+ `openharmony_ci.py` 对该 PR `overall==success`。
- CI 状态绑定到**本次 push 的不可变 commit SHA**:PR head SHA 必须等于本地 push 的 SHA,
  杜绝"旧 commit 的绿"冒充。
- push 为唯一对外不可逆动作:无 `--allow-push` 时只做 DRY(不产 PASS);需 `consent --phase 6` 令牌。

## 5. 人工确认门(P4 真机 / P5 质量与 review / P6 上库)

证据 PASS 不等于自动放行。**P4 真机功能测试**、**P5 质量与 code review 报告** 与
**P6 上库** 三个阶段,门控产出真实证据后**停下并把真实结果/产物路径呈现给人**
(P4 还打印 hilog 末尾片段),等人工核对真机结果、P5 覆盖率/性能/功耗/稳定性/code review 报告、
或上库结果。人工认可后 `advance.py consent --phase 4|5|6 --token <人>` 写入 `consent_tokens`,
`advance` 才放行;缺令牌时 `advance --phase 4|5|6` 直接 HOLD 不推进。

consent 是**签名且绑定证据**的记录(非明文令牌):`consent --phase N` 会先校验该阶段当前的
签名 PASS 证据,再把 consent 绑定到该证据的 `entry_id` 并 HMAC 签名。因此:
(a) 没出 PASS 证据的阶段无法盖章;(b) 重跑门控产生新证据后旧 consent 自动失效、必须重新确认;
(c) 手改 `pipeline.json` 里的 consent 记录会破坏其 HMAC。consent 只由 `advance.py` 写。
(注:per-run 密钥人机共用,签名不从密码学上区分"人"与"模型";它消除的是"凭空盖章"与"陈旧
consent 复用"两个实际漏洞。真正的带外人机确认列为后续增强。)
