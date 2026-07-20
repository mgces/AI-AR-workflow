# ohos-code-skeletons

OpenHarmony(rk3568,C/C++)系统组件的可复用代码骨架库,加速流水线 P1 写码,并为
AR_design.md 的「完整代码框架/完整测试框架」章节提供可填充素材。

- **hiview 插件** / **单元测试** / **模块测试** / **模糊测试**:占位符模板(真实结构 + `<PLACEHOLDER>`)。
- **SA / NAPI**:指向 `ohos-dev-sa-codegen` / `ohos-dev-napi-module`(不重复造)。

用法与骨架清单见 [SKILL.md](SKILL.md)。每个骨架目录的 `README.md` 含变量表、裁剪点、
真实源码范例路径与常见坑。校验:`python3 assets/verify_skeletons.py`。
