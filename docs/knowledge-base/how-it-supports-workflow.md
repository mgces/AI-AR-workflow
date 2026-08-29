# 知识库如何支撑 workflow

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
