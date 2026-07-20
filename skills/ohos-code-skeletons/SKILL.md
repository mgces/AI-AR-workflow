---
name: ohos-code-skeletons
description: >
  OpenHarmony(rk3568,C/C++)系统组件的可复用代码骨架库:提供 hiview 插件、
  单元测试(ohos_unittest)、模块测试(ohos_moduletest)、模糊测试(ohos_fuzztest)
  的占位符模板(真实可编译结构 + <PLACEHOLDER> + 变量表),替换占位符后可直接进编译。
  SA/NAPI 指向 ohos-dev-sa-codegen / ohos-dev-napi-module。用于加速 P1 写码,并填充
  AR_design.md 的「完整代码框架/完整测试框架」章节。当用户说"插件骨架/测试骨架/
  ohos_unittest 模板/写码脚手架/生成 hiview 插件/生成测试骨架"时触发。
---

# OHOS 代码骨架库

给 OHOS 系统组件开发提供"照着写"的最小可编译脚手架。骨架是**真实结构的占位版**——
含注册宏、生命周期、BUILD.gn 目标,替换 `<PLACEHOLDER>` 后可直接进 P1b→P2 编译,不是伪代码。

## 骨架清单

| 骨架 | 目录 | 用途 | 关键结构 |
|---|---|---|---|
| hiview 插件 | `assets/hiview-plugin/` | 把新功能做成 hiview 插件 | `REGISTER` + Plugin 派生 + OnLoad/OnEvent/OnUnload + BUILD.gn |
| 单元测试 | `assets/test-unittest/` | P3 单测 | `ohos_unittest` + `import("//build/test.gni")` + `HWTEST_F` |
| 模块测试 | `assets/test-moduletest/` | P5 端到端(真实阈值) | `ohos_moduletest`(`-t MST`) |
| 模糊测试 | `assets/test-fuzztest/` | 鲁棒性 | `ohos_fuzztest` + `LLVMFuzzerTestOneInput` |
| SA / NAPI | `assets/external-skills.md` | 指向现有 skill,不造轮子 | `ohos-dev-sa-codegen` / `ohos-dev-napi-module` |

## 用法

1. 选骨架 → 读其 `README.md` 的**变量表**(每个 `<PLACEHOLDER>` 的含义与取值来源)。
2. 把骨架文件拷到目标位置,重命名(如 `plugin_name.cpp` → `thread_leak_detector.cpp`)。
3. 全量替换占位符。多数占位符可从**知识库** `components.tsv`(bundle_path、targets、part_name)查得。
4. 按 README 的**裁剪点**删掉不需要的部分(如 poll-only 插件删 OnEvent)。

## 占位符约定

- `<PLUGIN_NAME>` 等 UPPER/Pascal 表示**标识符**(类名/宏);`<plugin_dir>` 等小写表示**路径/文件名**。
- 每个骨架里出现的占位符,都在其 README 变量表里有说明(`assets/verify_skeletons.py` 校验这一点)。

## 对接流水线

- **P1 设计(AR_design.md)**:写「完整代码框架」时,选对应骨架 → 文件清单填进「文件清单」、
  每文件职责填「每文件功能」、粘关键片段进「代码框架」——gate_design 的三锚点自然满足。
  测试骨架填进「完整测试框架/需测试的功能点」。
- **P3 只增测试约束**:测试骨架天然落在 `test/` 路径,不触发功能指纹漂移(优化点3),`advance` 放行。
- **P4 真机 marker**:插件骨架里预留了 `<RUNTIME_MARKER>`/`<E2E_MARKER>` 注释——必须由**运行路径真实
  输出**,不能写死在部署/场景脚本(gate_device_func 会拒)。

## 注意

- 骨架不实际编译(需 OHOS 源码树)。替换后由 P2 `gate_build.py` 真编译验证。
- SA/NAPI 用现有 skill,见 `assets/external-skills.md`。
