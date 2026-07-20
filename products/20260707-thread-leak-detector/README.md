# 本产物如何复核

本目录是一次流水线运行的**脱敏交付物**,只保留:

- `ar.md` —— 脱敏后的架构需求(AR)。
- `manifest_summary.md` —— 脱敏证据账本摘要(阶段/verdict/reason/产物 sha256)。

原始、可 HMAC 验签的完整证据留在**本地 run-state 目录**(`specs/pipeline/<run>/`,
已 gitignore,不进仓),复核步骤:

```bash
S=~/.claude/skills/ohos-ar-dev-phases/scripts
python3 $S/advance.py --pipeline-dir <本地 PDIR> verify-all   # 重校验全部签名证据
python3 $S/advance.py --pipeline-dir <本地 PDIR> status
```

脱敏摘要里的产物 sha256 可与本地 `evidence/manifest.jsonl` 对应记录逐条比对。
