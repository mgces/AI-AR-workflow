# 门控契约(gate-contract)

所有 `gate_*.py` 遵守同一契约,`advance.py` 据此判定推进。

## 调用约定

- 统一参数 `--pipeline-dir <PDIR>`(或环境变量 `PIPELINE_DIR`)。
- 其余参数见各脚本 `--help`。
- 退出码:PASS → 0;FAIL → 非 0。但**退出码不是真相**——真相是脚本追加到
  `evidence/manifest.jsonl` 的签名记录的 `verdict`。

## 每个门控必须做的事

1. 真正执行该阶段的真实动作(跑 build.sh / developer_test / hdc / oh-gc 等)。
2. 把真实产物落到 `evidence/phaseN/`(日志、xml、hilog、patch……)。
3. 调 `gatelib.emit(pdir, phase, gate, verdict=..., reason=..., artifacts_rel=[...])`:
   - verdict 完全由脚本解析证据算出,**不接受调用方传入 verdict**;
   - emit 会对每个 artifact 计算 sha256,连同 cmd/exit_code/nonce 一起 HMAC 签名后追加。

## advance.py 推进 N→N+1 的充要条件

- `phase==current_phase`(顺序,不可跳);
- 该阶段最后一条 manifest 记录 `verdict=="PASS"`;
- HMAC 用 per-run 密钥校验通过(防伪造/篡改);
- 记录里每个 artifact 文件存在且当前 sha256 与记录一致(防事后替换);
- (P4 真机 / P6 上库)`consent_tokens[str(phase)]` 非空——证据 PASS 后还需人工核对真实结果并签字,否则 `advance` HOLD。

任一不满足 → `advance.py` 非 0 退出、不改状态。

## 唯一写状态者

`pipeline.json` 的 `phases[].status` / `current_phase` 只由 `advance.py` 写。
门控脚本只读状态拿配置(build_target/test.part 等),只写 `evidence/` 与 manifest。
