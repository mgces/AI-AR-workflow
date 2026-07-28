# 产品

> 给出 `products/` 的二级入口说明,不一上来铺开所有页面。

## products 是什么

`openharmony-knowledge-base/products/` 按产品组织,记录该产品选入了哪些子系统/组件:

- `rk3568/` — 当前 workflow 的目标产品
- `rk3568-parts.tsv` — rk3568 选入的部件清单(机器生成)

## 什么时候看这页

- P1 设计时需要确认 AR 改的组件是否在 rk3568 产品选入范围
- P3~P7 验证时确定依赖范围与测试边界
- 想理解 OHOS 产品选入机制时

## 产品选入的意义

rk3568 是本 workflow 的目标产品(`out/ohos_config.json` 产品=rk3568)。`rk3568-parts.tsv` 列出该产品选入的部件:

- 若 AR 改的组件不在选入清单 → 编译可能失败或产物不进该产品
- 若依赖的组件不在选入清单 → 运行时可能缺失依赖

## 二级入口

具体产品页面请直接查 `openharmony-knowledge-base/products/<产品>/` 目录。

## 延伸阅读

- [子系统](/knowledge-base/subsystems) — 子系统专题导航
- [workspace 与生成索引](/knowledge-base/workspace-and-generated-indexes) — generated 索引说明
- [架构总览](/knowledge-base/architecture-overview) — build-runtime 架构(产物路径)
- [P0 环境预检](/workflow/phase-0-init) — 产品 rk3568 的环境校验
