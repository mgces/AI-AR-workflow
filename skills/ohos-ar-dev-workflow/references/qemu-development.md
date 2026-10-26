# 在 ARM64 QEMU 上运行 AR 开发流程

使用 `--environment openharmony-qemu`，产品为 `arm64_virt`、产物目录为
`out/arm64_virt/`，上库仍走 GitCode。原有 `openharmony` 保留 rk3568 默认行为；
HarmonyOS 分支保持独立。这里的命令在 OpenHarmony 源码根运行。

## 准备源码、镜像和实例

四个 `ohos-qemu-*` 必须与 AR skills 一起安装，公共脚本只在 `ohos-qemu-workflow/scripts/`。
运行器来自目标源码树：`vendor/ohemu/qemu_arm64_linux_full/qemu_run.sh` 和
`vendor/ohemu/virt/qemu_run/arm64/qemu_profile.json`。这套 skills 不包含运行器、QEMU 软件包、
源码、SDK 或系统镜像；目标分支缺少运行器时先适配源码，不能仅安装 skill 就声称可以启动。
宿主运行包支持 Ubuntu 24.04 x86_64/WSL2，Python 3.11+。

```bash
QEMU_WORKFLOW="$AGENT_SKILLS_DIR/ohos-qemu-workflow/scripts/workflow.py"
python3 -B "$QEMU_WORKFLOW" --root "$OHOS_ROOT" init
./qemu-workflow/qemu env check
# 环境缺失时按 ohos-qemu-env 恢复；已有镜像时跳过整编。
./qemu-workflow/qemu build full --background
./qemu-workflow/qemu build status
```

等待本次整编退出并核对成功横幅和必需镜像。AR 的 P0/P4/P5 都可能再次构建，
而构建不能改写运行实例的基础盘，因此先创建独立镜像集并在其上运行：

```bash
./qemu-workflow/qemu snapshot ar-dev
# 若已有实例，先用原配置 stop 并确认 status 已停止；保留 overlay。
QEMU_CONFIG="$OHOS_ROOT/out/qemu-workflow/image-sets/ar-dev/config.json"
python3 -B "$QEMU_WORKFLOW" --root "$OHOS_ROOT" --config "$QEMU_CONFIG" up --timeout 600
python3 -B "$QEMU_WORKFLOW" --root "$OHOS_ROOT" --config "$QEMU_CONFIG" verify
```

快照只复制基础镜像，运行实例的旧 overlay 数据不会自动迁移。切换配置不自动停止旧实例，
其他实例若仍占用产品输出，构建仍会阻塞。详情见
[编译与部署](../../ohos-qemu-build/references/build-and-deploy.md)。

## 初始化 AR

Agent 从 AR 和源码确定 `COMPONENT_DIR`、`BUILD_TARGET`、`TEST_PART`，按原流程确认环境与部件；
用户已经指定 QEMU 时直接采用该选择。`QEMU_CONFIG` 指向上述快照配置。

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

P0 检查运行工具、源码运行器、当前实例 RUNNING、实例定向 HDC shell、AArch64、编译探针及原有能力；
`qemu.json` 和 `env.json` 纳入签名证据。P0 不自动下载、编译完整镜像或启动 QEMU。
`--qemu-config` 默认 `<OHOS_ROOT>/qemu-workflow/config.json`；配置内容摘要和实例目录、manifest、
qcow2 overlay inode 在 P0 绑定。后续设备门会拒绝被重置或替换的数据盘，即使 HDC serial 未变；
配置、实例或磁盘身份变化后须重新初始化并执行 P0，不能沿用旧运行证据。

## P1–P8 的执行差异

| 阶段 | QEMU 分支 |
|---|---|
| P1 | 设计契约写真实 ARM64 产物、实例部署路径和功能断言；评估哪些验收依赖硬件 |
| P2/P3 | 按原编码/测试规则；新增 GN 目标须正常生成，不假定 QEMU 已运行新代码 |
| P4 | 门控经过公共 QEMU 构建入口执行真实 target，保留镜像占用保护、构建日志和契约产物校验 |
| P5 | 测试构建走同一入口；developer_test 取 `-p arm64_virt`，xdevice 使用 P0 的 HDC server/serial 和 SDK HDC |
| P6 | 用 ohos-qemu-run 管理实例，以原部署/scenario/hilog 门控验证新产物，保留 hash、nonce、进程和副作用断言 |
| P7 | 原质量报告要求继续生效；QEMU 是本 workflow 的一种真机/设备目标，但 TCG 下测得的性能、功耗、外设表现和安全行为不能代表 rk3568 实体硬件，依赖这些能力的验收需补实体硬件证据 |
| P8 | 继续原 GitCode/PR/CI 门控与人工确认 |

P6/P7 的人工 consent、签名与失败回退规则不变。`basic_boot_pass` 只证明基本启动；桌面需查看本轮
真实截图，UT/XTS 和应用功能需独立运行。未执行的项目写 `NOT_RUN`，不能用截图或启动成功代替。

P0 持久化配置中的 SDK HDC、独立 loopback server、launcher 返回的实例转发端口及禁止自动启动
server 的设置。P6/P7 设备门和 P5/P7 xdevice 使用这些连接，当前 shell 的 USB/远端变量不会改写
QEMU 目标。设备门执行前重新核对实例和 qcow2 overlay 身份，配置、端口或磁盘漂移即阻塞。重打包不会更新快照中的运行镜像；
按部署方案传入新产物，或保留旧实例后使用新的镜像集并重新初始化流水线。

安全模式下的 P6 应用探针若返回 `10106102`/`UnlockScreenManager`，先按设备锁定前置条件处理：
暂停重复探测，经本实例 noVNC 或人工交互解锁，并用应用实际进入前台/进程启动验证解锁，再重跑
P6。桌面出现或触摸命令返回成功都不构成应用可启动的证据。
