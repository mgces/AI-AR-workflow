# 新增目标、独立编译与部署

## 用产品工具链编译新增代码

1. 按实际模块路径读取 AGENTS.md。沿用该子系统已有 GN 模板；生成 C/C++ 时应用已有 ohos-dev-cpp-coding-style。
2. 查 BUILD.gn 中真实目标名、subsystem_name、part_name、依赖与安装属性；核对 bundle.json 和产品组件列表。只有写一个 BUILD.gn 不代表全量产品会包含它。
3. 定向 build.sh 需要 GN 图中可达的目标。新增目标正常生成 GN，不能先用 --fast。目标不存在时检查部件 `build.sub_component`、测试注册或上层 group 引用，不凭空修改公共构建模板。
4. 已有生成目录时可用以下工具查询，而非猜标签（在源码根执行）：

```bash
prebuilts/build-tools/linux-x86/bin/gn ls out/arm64_virt '//path/to/component:*'
prebuilts/build-tools/linux-x86/bin/gn desc out/arm64_virt //path/to/component:target_name outputs
```

上述路径是需替换的标签示意。GN 若要求 args 或环境，按当前构建日志恢复其环境，不手工覆盖现有 args.gn。根据 desc 的输出定位 stripped/unstripped、依赖库与测试配置。

5. 编译后 `file <实际产物>`、对应工具链 llvm-readelf -h 核对 AArch64；对宿主工具或 Cortex-M 等输出不要误发到 QEMU。新目标产物需要与本次命令、时间和日志关联，防止误认旧文件。

## hb 独立构建

`hb build <component> -i` 使用部件独立构建依赖配置；`-t` 编译其测试。某些部件可能缺少二进制依赖包或独立适配；需要按主日志解决，不能把失败视作 QEMU 不支持。

hb 不在 PATH 时先查现有虚拟环境。如果确需安装，优先专用 venv 中 `python -m pip install <OH_ROOT>/build/hb`，不要破坏宿主系统 Python，也不因缺 hb 自动下载源码/prebuilts。当前工作区创建这套技能时 hb 不在 PATH，真实 hb 独立构建未执行，因此不能在验收中写“已通过部件独立构建”。

## 编译与运行同时进行

不能在 QEMU 使用产品输出为 backing file 时重写这些基础镜像。新流程保守阻止这类产品构建，包括定向 build.sh，因为产品后处理可能更新镜像。

要让后续定向编译与运行并行，先为运行侧建立独立镜像集。以下命令会复制稀疏镜像（约数 GiB 逻辑容量），不会复制当前实例的修改，也不会切换或停止当前实例：

```bash
./qemu-workflow/qemu snapshot dev-baseline
```

成功输出新的配置文件，例如 `out/qemu-workflow/image-sets/dev-baseline/config.json`，其 images 是独立副本，实例根也独立。为继续使用同一实例编号和端口，先停止旧实例，确认 status 已停止，再执行：

```bash
./qemu-workflow/qemu stop
./qemu-workflow/qemu status
./qemu-workflow/qemu --config out/qemu-workflow/image-sets/dev-baseline/config.json up
```

普通停止未完成时先保留日志并确认 guest sync 已执行；用户确需结束时才显式 `stop --force`。不自动升级为强制停止。

后续针对该副本运行实例时，编译工作流可继续改写 out/arm64_virt/，因为副本不再引用产品输出。新的编译结果仍需显式部署。使用快照配置来编译时，也会检查其他运行实例是否仍引用产品输出。

快照只冻结原始镜像，不保存现有 qcow2 中的应用和数据。原实例保持在旧目录。如需保留其数据继续使用，先制定停机迁移方案，不直接修改 qcow2 backing chain。

## 把新产物交给系统运行

- 独立可执行文件：先确认 ABI 和动态依赖，再 `qemu hdc file send <产物> /data/local/tmp/<名称>`；按需 chmod，运行并核对退出码/功能输出。共享库放到独立临时目录，依据实际 loader 能力设置局部库路径，不覆盖系统库。
- HAP：核对签名与依赖 HSP 后 `qemu hdc install <签名HAP>`。启动成功文本不是功能断言；继续验证实际页面/日志/行为。发布签名的调试限制按实际能力处理。
- SA/系统服务/系统库：优先正确配置安装、产品打包后启动新镜像集。只有用户确需热替换时才按已有 HDC skill 做备份、路径/权限检查、写入验证、sync 和受影响服务重启；不自动 remount 或放宽 SELinux。
- 测试：编译测试目标、传测试产物、运行与收集真实报告是三个步骤；需要 xdevice/UT/XTS 时调用已有相关技能，不能由 `basic_boot_pass` 推导测试通过。

系统重新打包后为新镜像创建新快照/新实例根，保留旧实例数据。当前 CLI 不自动 reset/delete、不自动上库、不自动替换系统文件。
