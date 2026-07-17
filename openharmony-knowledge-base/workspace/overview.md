# 工作区总览

## 多仓结构

`/home/mgces/openharmony/code` 由 `repo` 管理。根目录 `.repo/manifest.xml` 只包含 `default.xml`，后者使用 GitCode `master` 作为默认远端/分支，并继续包含：

```text
.repo/manifests/ohos/ohos.xml
.repo/manifests/chipsets/all.xml
```

当前共 512 个 Git 子仓。511 个处于 detached HEAD，这是 `repo` 按 manifest 固定修订检出的正常形态；唯一具名分支是：

```text
base/hiviewdfx/hiview
branch: thread-leak-detector-plugin
head: a6624f1d25522aac18c59c22746cbbc16335026e
```

根目录不能直接使用 `git status` 管理全部代码。常用操作：

```bash
repo status
repo list
git -C <project-path> status
git -C <project-path> log -1
```

## 项目分布

| 一级目录 | 子仓数 | 主要职责 |
| --- | ---: | --- |
| `third_party` | 183 | 第三方源码、工具链依赖和协议适配 |
| `foundation` | 117 | Ability、ArkUI、通信、多媒体、图形、数据、系统服务 |
| `base` | 109 | 安全、DFX、帐号、电源、全球化、电话等基础子系统 |
| `applications` | 30 | 系统应用、样例和预置应用 |
| `developtools` | 11 | HDC、Profiler、打包和前端构建工具 |
| `test` | 11 | developer_test、xdevice、XTS、稳定性测试 |
| `kernel` | 9 | Linux、LiteOS、UniProton 和内核公共模块 |
| `arkcompiler` | 7 | ETS 前端、运行时、静态运行时和工具链 |
| `commonlibrary` | 7 | C/C++ 与 Rust 公共库 |
| `device` | 7 | 板级和 SoC 适配 |
| `drivers` | 5 | HDF 核心、HDI 接口、外设实现 |
| 其他 | 16 | `build`、`docs`、`interface`、`vendor`、`domains` 等 |

完整清单见 [projects.tsv](../generated/projects.tsv)。

## 代码规模

排除 `out/`、`prebuilts/`、`.repo/` 和 `node_modules/` 后，共约 1,208,065 个文件。

主要目录：

| 目录 | 文件数 |
| --- | ---: |
| `third_party` | 337,307 |
| `test` | 252,311 |
| `kernel` | 162,112 |
| `foundation` | 142,215 |
| `arkcompiler` | 91,868 |
| `applications` | 80,030 |
| `base` | 49,479 |
| `docs` | 31,604 |
| `device` | 22,423 |

主要文件类型：

| 类型 | 数量 | 说明 |
| --- | ---: | --- |
| `.h` | 165,677 | Native 接口与实现头文件 |
| `.ets` | 157,923 | ArkTS/ETS 应用、接口和测试 |
| `.cpp` | 125,750 | C++ 系统服务、框架和测试 |
| `.c` | 102,855 | 内核、驱动、三方库和底层实现 |
| `.json` | 73,011 | 组件、产品、SA、应用和测试配置 |
| `.ts` | 54,073 | TS 工具、前端和应用代码 |
| `.rs` | 32,097 | Rust 三方库及部分系统实现 |
| `.gn` | 25,895 | GN 构建描述 |
| `.py` | 12,087 | 构建、测试、代码生成和工具脚本 |
| `.cj` | 7,361 | 仓颉接口和包装层 |

数量包含大量自动生成测试数据和第三方源码，不能直接用文件数衡量模块复杂度。

## 组织层级

OpenHarmony 代码需要同时理解六个层级：

| 层级 | 定义 | 例子 |
| --- | --- | --- |
| Git 项目 | `repo` 管理的版本控制单元 | `foundation/ability/ability_runtime` |
| 子系统 | 产品裁剪和能力分类单元 | `ability`、`hiviewdfx` |
| 组件/部件 | `bundle.json` 或 `ohos.build` 声明的可裁剪单元 | `ability_runtime`、`hiview` |
| GN 模块 | 实际构建目标 | `ohos_shared_library`、`ohos_executable`、`ohos_unittest` |
| 运行实体 | 进程、System Ability、应用、驱动 host | `foundation`、`samgr`、`render_service` |
| 交付产物 | so、bin、HAP、配置、镜像 | `lib*.z.so`、`system.img` |

这些层级不是一一对应关系。例如一个组件可以生成几十个 GN 目标和多个运行库；多个 SA 也可以装载进同一个 `foundation` 进程。

## 组件元数据

全树有 552 个可解析 `bundle.json`，覆盖 65 个子系统：

- 声明组件依赖 6,131 条。
- 声明 `inner_kits` 1,982 项。
- 声明 `sub_component` 构建入口 1,118 项。
- 声明测试入口 980 项。

被最多组件依赖的公共节点：

| 组件 | 被引用次数 |
| --- | ---: |
| `hilog` | 285 |
| `c_utils` | 279 |
| `ipc` | 258 |
| `init` | 178 |
| `samgr` | 166 |
| `hisysevent` | 146 |
| `access_token` | 143 |
| `hitrace` | 138 |
| `bounds_checking_function` | 137 |
| `napi` | 133 |
| `safwk` | 131 |

这类高入度组件是全局修改的高风险区域。声明数据详见 [components.tsv](../generated/components.tsv)。

## 当前产品上下文

当前 preloader 选择的是 `vendor/hihope/rk3568`：

```text
system type: standard
target OS: ohos
target CPU: arm
board arch: armv8-a
CPU core: Cortex-A55
toolchain: Clang
kernel default: Linux 6.6
```

产品显式配置 22 个子系统/65 个组件，并继承 `rich.json` 与 `chipset_common.json`。实际预加载结果去重、合并后为 58 个子系统/387 个部件。

当前 `out/rk3568` 来自 `hiview_package` 和测试目标的部分构建：

- `out/preloader/rk3568` 完整存在，可用于产品和部件分析。
- `out/rk3568/args.gn` 显示当前 `build_variant="root"`。
- `out/rk3568/packages/phone/images` 没有完整系统镜像，不能据此判断全量产品已构建。

## 生成索引边界

- `projects.tsv` 统计 Git 工作树条目，不解释修改意图。
- `components.tsv` 只解析标准 JSON `bundle.json`，不展开所有 GN `deps`。
- `rk3568-parts.tsv` 依赖当前 `out/preloader/rk3568/parts.json`，切换产品或重新预加载后必须刷新。
- 文件统计会包含测试资源和源码中的 LFS 指针文件，但排除了主要构建输出和预编译工具链。
