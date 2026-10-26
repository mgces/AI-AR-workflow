# ARM64 QEMU 开发

四个 QEMU skill 已随仓库 `skills/` 一起分发，可独立执行，也可作为 AR 开发流水线的环境、构建和运行能力。

| Skill | 用途 |
|---|---|
| `ohos-qemu-workflow` | 环境、编译、启动与验证的公共入口 |
| `ohos-qemu-env` | QEMU/noVNC 检查、锁定软件包校验与离线恢复 |
| `ohos-qemu-build` | arm64_virt 整编、指定 GN target、hb 部件构建 |
| `ohos-qemu-run` | 实例启停、定向 HDC、图形和原始截图 |

## 安装与前提

在本仓根执行 `bash sync-skills.sh --agent codex`，或通过 `--target <技能目录>` 安装到其他 Agent。
工具、源码和镜像不随技能分发。目标 OpenHarmony 源码树须包含 `.gn`、`build.sh`、developer_test、
`vendor/ohemu/qemu_arm64_linux_full/qemu_run.sh` 及 `vendor/ohemu/virt/qemu_run/arm64/qemu_profile.json`。
宿主为 Ubuntu 24.04 x86_64/WSL2，Python 3.11+；SDK HDC 路径按当前分支填写。

以下命令从 OpenHarmony 源码根执行，`AGENT_SKILLS_DIR` 是安装后的 skills 目录，`OHOS_ROOT` 是源码根。

```bash
QEMU_WORKFLOW="$AGENT_SKILLS_DIR/ohos-qemu-workflow/scripts/workflow.py"
python3 -B "$QEMU_WORKFLOW" --root "$OHOS_ROOT" init
./qemu-workflow/qemu env check
./qemu-workflow/qemu status
```

`init` 保留已有配置与入口。按实际工具、SDK 和实例目录调整 `qemu-workflow/config.json`。
缺运行环境时使用 `env prepare` 从已校验的本地归档恢复；缺包且允许下载时显式加 `--download`。

## 编译与运行

已有镜像时可直接启动。确需整编或定向编译时：

```bash
./qemu-workflow/qemu build full --background
./qemu-workflow/qemu build status
# 真实 GN 标签从当前源码确认；这里只展示调用形式。
./qemu-workflow/qemu build target //path/to/component:target_name --dry-run
```

系统整编以本次退出码、日志和必需镜像核验结果为准；target/hb 构建还需核对真实 ARM64 产物。
构建不自动部署或重启实例。

AR 的 P0/P4/P5 都可能执行编译，而运行实例不能引用将被改写的产品输出基础盘。
因此先创建独立镜像集，在快照上运行：

```bash
# 等本次构建结束且镜像验证成功后执行；名字已存在时使用新的名字。
./qemu-workflow/qemu snapshot ar-dev
# 若已有实例，先用原配置 stop 并确认 status 已停止。
QEMU_CONFIG="$OHOS_ROOT/out/qemu-workflow/image-sets/ar-dev/config.json"
python3 -B "$QEMU_WORKFLOW" --root "$OHOS_ROOT" --config "$QEMU_CONFIG" up --timeout 600
python3 -B "$QEMU_WORKFLOW" --root "$OHOS_ROOT" --config "$QEMU_CONFIG" verify
```

快照复制基础镜像，旧 overlay 中的数据不会自动迁移。已有实例若仍引用产品输出，构建仍会拒绝执行。
更新产品镜像不会更新运行快照，新产物须按设计显式部署。

## 接入 AR 流水线

环境选择为 `openharmony-qemu`，产品 `arm64_virt`、输出 `out/arm64_virt/`，上库使用 GitCode。
原 `openharmony` 分支仍使用 rk3568；HarmonyOS 分支继续使用其 profile。
`RUN` 为运行标识，组件、GN 目标和测试 part 由 Agent 根据当前 AR 与源码确认。

```bash
S="$AGENT_SKILLS_DIR/ohos-ar-dev-phases/scripts"
PDIR=$(python3 "$S/advance.py" init \
  --repo "$OHOS_ROOT" --run-id "$RUN" --optimized-checks \
  --environment openharmony-qemu --qemu-config "$QEMU_CONFIG" \
  --git-dir "$COMPONENT_DIR" --build-target "$BUILD_TARGET" --part "$TEST_PART" \
  | sed -n 's/^PDIR=//p')
python3 "$S/gate_env_init.py" --pipeline-dir "$PDIR" --probe-target "$BUILD_TARGET"
python3 "$S/advance.py" --pipeline-dir "$PDIR" advance --phase 0
```

| 阶段 | QEMU 接入行为 |
|---|---|
| P0 | 检查运行工具、运行器、RUNNING 实例、定向 HDC 与 AArch64；执行原能力探针，签名 `qemu.json`、`env.json` |
| P1–P3 | 原设计、代码和测试规则；设计明确 QEMU 可验证的范围和真实部署方式 |
| P4 | 公共入口执行 arm64_virt target，保留基础盘保护和原产物、静态分析门控 |
| P5 | 构建测试，developer_test 使用 `-p arm64_virt`，xdevice 固定 SDK HDC/server/serial |
| P6 | 部署本次产物，再验证 hash、nonce、功能日志、进程和副作用 |
| P7 | 继续原质量报告门控；按需补充依赖硬件的实机证据 |
| P8 | 原 GitCode、review、CI 与人工确认 |

P0 将配置摘要和连接记录到本 run。配置或端口变化后重新初始化并执行 P0，旧证据不能直接沿用。
`resume` 可回放连接，QEMU 分支不会采用当前 shell 中其他设备的连接变量。

## 证据边界

`basic_boot_pass` 只表示基本启动。桌面可见需查看本轮原始截图；应用功能、UT/XTS 各自执行并断言，
未跑项目记录 `NOT_RUN`。P6/P7 的人工 consent、签名与失败回退规则继续生效。
TCG 环境不能代表真机外设、性能、功耗与安全行为，验收依赖这些能力时需提供实机证据。

## 延伸阅读

- [环境初始化](/getting-started/environment-init)
- [P4 编译](/workflow/phase-4-build)
- [P5 单元测试](/workflow/phase-5-test-ut)
- [Skill 映射](/reference/skill-map)
