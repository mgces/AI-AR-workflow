# 源码导航使用指南

## Workflow 调用

P1 只用导航结果缩小搜索范围：

```bash
python3 openharmony-knowledge-base/tools/search/kb_search.py \
  --source-root "$OHOS_ROOT" \
  --query-file "$PDIR/ar.md" \
  --k 8 \
  --out "$PDIR/design_refs.md"
```

`design_refs.md` 必须明确区分：

- `stable-navigation`：候选层级和关键词；
- 当前源码仓候选及其 HEAD；
- 尚未在源码中验证的内容。

不能把导航摘要中的路径、接口、target、依赖或行为直接写进 `AR_design.md`。

## 当前源码验证

```bash
test -d "$OHOS_ROOT/.repo"
repo list | rg -i '<subsystem|component|feature>'
git -C "$OHOS_ROOT/<repo>" rev-parse HEAD
rg -n '<symbol|feature>' "$OHOS_ROOT/<repo>"
rg -n '<component|target>' "$OHOS_ROOT/<repo>" \
  -g 'bundle.json' -g 'BUILD.gn' -g '*.gni'
```

随后读取真实接口、调用方、测试、产品配置和运行配置。只有这些当前源码与验证结果可以成为代码事实。

## 更新导航

只在稳定归属或名称发生变化时更新 `subsystems/**/README.md`：

```bash
python3 openharmony-knowledge-base/tools/rebuild_navigation.py
python3 openharmony-knowledge-base/tools/rebuild_navigation.py --check
python3 openharmony-knowledge-base/tools/search/build_index.py --rebuild
```

禁止提交工作区状态、repo/component/target 全量清单、产品选入快照、运行实体快照和流水线证据副本。
