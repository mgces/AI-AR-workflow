# 知识库如何支撑 workflow

## Skills 与知识库的边界

`skills/` 是唯一可安装能力真源；知识库只保存稳定的子系统所有权、源码定位和验证导航，不能复制 Skill 指令或保存某次 CI/测试结论。新增的 XTS、Fuzz、覆盖率、CodeArts 预检和文档一致性能力均从 `skills/` 调用，产生的本次运行证据进入 pipeline `evidence/`，不会回写成知识库事实。

在“OpenHarmony 需求分析与开发作业线”中，知识库既辅助 OHOS SDD 的可行性/架构分析，也辅助需求开发 P1 定位当前源码；分析设计阶段最终通过 `AR.md` 交接，知识库不承担交接协议。

## OHOS SDD：需求阶段候选导航

SDD 的可行性预检可以用 `kb_search.py` 将需求缩小到候选子系统、组件、进程和仓库。
查询结果只支撑“去哪里找”，不支撑“当前代码一定如此”。

SDD 产出的 AR.md 应区分：

- 知识库候选导航。
- SDD 阶段已读取的当前源码证据。
- 尚待需求开发工作流 P1 重新验证的动态事实。

## P1：只做候选导航

P1 使用 `kb_search.py --source-root "$OHOS_ROOT"` 生成 `design_refs.md`。输出包括稳定导航节点、当前 repo 候选及其 HEAD。

它不能确定：

- 当前文件或接口；
- GN target、依赖和产物；
- test part、suite 或设备 marker；
- 产品选入、init、SA、进程与权限；
- 当前实现行为。

这些内容必须在候选代码仓中读取当前 `bundle.json`、`BUILD.gn`、接口、测试和生产配置后确认。

## P2–P8：不以知识库作证

开发、测试、构建、真机和上库阶段只认可当前源码、签名 evidence、真实构建/测试/设备/CI 结果。知识库摘要不能作为门控证据，也不能替代源码 review。

## Feature 导航回填

`archive_product.py --sink-feature` 只新增 subsystem/component/feature 的稳定导航节点。它不会把本次 run 的文件、target、测试结论、设备标记或实现分析复制回知识库。
