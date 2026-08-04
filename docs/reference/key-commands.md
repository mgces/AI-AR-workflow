# 关键命令

> 按场景列关键命令:init / advance / consent / reset / verify-all / 各 gate 调用。

## 公共变量

```bash
PDIR=specs/pipeline/<run>
AGENT_SKILLS_DIR=<Agent 技能根目录>
S=$AGENT_SKILLS_DIR/ohos-ar-dev-phases/scripts
```

统一可用环境变量 `PIPELINE_DIR` 代替 `--pipeline-dir`。

## advance.py（唯一状态写入器）

```bash
python3 $S/advance.py --pipeline-dir "$PDIR" init \
    --environment openharmony|harmonyos [--component-type system|chip] \
    --git-dir <组件> --build-target <t> --part <p> [--base-commit <sha>]
python3 $S/advance.py --pipeline-dir "$PDIR" advance --phase N
python3 $S/advance.py --pipeline-dir "$PDIR" consent --phase N --token <s>
python3 $S/advance.py --pipeline-dir "$PDIR" reset --reason <s>
python3 $S/advance.py --pipeline-dir "$PDIR" verify-all
python3 $S/advance.py --pipeline-dir "$PDIR" migrate
python3 $S/advance.py --pipeline-dir "$PDIR" status [--json]
python3 $S/advance.py --pipeline-dir "$PDIR" next
```

> `--environment` 必填(缺失硬失败);`harmonyos` 时 `--component-type system|chip` 必填。组件参数三缺又不带 `--confirm-defaults` 也会硬失败。

## 各 gate 调用

### P0 环境预检
```bash
python3 $S/gate_env_init.py --pipeline-dir "$PDIR"
```

### P1 设计固化
```bash
python3 $S/gate_design.py --pipeline-dir "$PDIR" [--design F] [--allow-contract-v1]
```

### P2 代码开发
```bash
python3 $S/gate_develop.py --pipeline-dir "$PDIR" [--no-style] [--allow-missing-design]
```

### P3 测试开发
```bash
python3 $S/gate_test_develop.py --pipeline-dir "$PDIR" [--allow-missing-contract]
python3 $S/prepare_test_bundle.py --pipeline-dir "$PDIR"     # 控制层薄层,由 gate 调用
```

### P4 编译
```bash
python3 $S/gate_build.py --pipeline-dir "$PDIR" [--target T]
```

### P5 单元测试
```bash
python3 $S/gate_test_ut.py --pipeline-dir "$PDIR" --test-target T --suite S [--part P]
```

### P6 端到端功能测试
```bash
python3 $S/gate_device_func.py --pipeline-dir "$PDIR" \
    [--deploy-script f] --scenario-script f --marker M \
    --host-artifact F --device-artifact P \
    --runtime-marker M --e2e-marker M [--phase 6|7]
```

### P7 质量验证
```bash
python3 $S/gate_integration.py --pipeline-dir "$PDIR" [--testtype MST] --suites S1 [S2 …] [--part P] \
    --coverage-report F --performance-report F --power-report F --stability-report F \
    [--code-review-report F]
```

### P8 上库
```bash
# gitcode(openharmony)后端:--repo-slug / --issue 必填
python3 $S/gate_upload_ci.py --pipeline-dir "$PDIR" --repo-slug owner/repo --branch B [--base master] [--title T] \
    --issue N \
    --local-review-report F --pr-review-report F \
    [--pr N] [--allow-push]
# gerrit(harmonyos)后端:不需要 --repo-slug/--issue,push refs/for/<base>(命令占位待填)
```

## 编排器脚本（ohos-ar-dev-workflow/scripts/）

```bash
python3 $AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/refresh_todo.py --pipeline-dir "$PDIR"
python3 $AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/render_report.py --kind test|device|quality|summary
python3 $AGENT_SKILLS_DIR/ohos-ar-dev-workflow/scripts/archive_product.py \
    --pipeline-dir "$PDIR" --product-dir products/<run> [--include-reports]
```

## 设备连接（lib/device.sh 解析顺序）

| 项 | 解析顺序 |
|---|---|
| hdc 二进制 | `$HDC_BIN` → PATH 的 `hdc` → `~/.local/hdc/hdc` |
| hdc server | `$HDC_HOST_OVERRIDE` → `$HDC_WIN_PORT`（WSL 默认网关 IP:端口） → 原生 hdc |
| 设备序列号 | `$DEVICE_SERIAL` → `hdc list targets` 唯一目标 |

## 延伸阅读

- [状态机](/reference/workflow-state-machine) — advance.py 各子命令的状态流转
- [门控契约](/reference/gate-contract) — 各 gate 的通过条件
- [run 目录结构](/reference/pipeline-layout) — 产物落盘位置
