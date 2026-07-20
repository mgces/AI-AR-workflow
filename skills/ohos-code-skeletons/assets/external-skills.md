# SA / NAPI / HDF — 用现有 skill,不在本骨架库造轮子

以下原型已有**专门的生成 skill**深度覆盖(IDL、Proxy/Stub、注册、profile、SELinux、BUILD.gn
全套),比静态骨架强得多。写这些代码时**优先调用对应 skill**,不要从本库拷插件/测试骨架。

| 原型 | 用哪个 skill | 覆盖 | 全仓规模(实证) |
| --- | --- | --- | --- |
| SystemAbility(SA) | `ohos-dev-sa-codegen` | IDL 定义 → Proxy/Stub 生成 → SA 注册 → profile 配置 → CFG → SELinux | SA ~95 / IDL ~1773 |
| NAPI 原生模块 / ArkTS 绑定 | `ohos-dev-napi-module` | napi_module_register、DECLARE_NAPI、ace_napi 共享库、async work、Sendable/QoS | NAPI ~1971 |
| HDF 驱动 | (暂无骨架,第二批) | HDF_INIT / HdfDriverEntry / HCS,与板级强绑定 | HDF ~306 |

## 触发方式

- 新建/修改 SA:`使用 $ohos-dev-sa-codegen ...`(触发词:新建 SA / 生成 SA / 迁移到 IDL / 修改 SA)。
- NAPI 模块:`使用 $ohos-dev-napi-module ...`。

## 与本库的分工

- **本库(ohos-code-skeletons)**:hiview 插件、单测/模块测试/模糊测试 —— 现有 skill 未覆盖的模式。
- **上述 skill**:SA / NAPI —— 已有深度生成能力。

在 AR_design「完整代码框架」里,若功能是 SA/NAPI,直接注明"用 `ohos-dev-sa-codegen` /
`ohos-dev-napi-module` 生成",文件清单按该 skill 的产物列。
