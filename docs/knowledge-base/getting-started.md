# 快速上手

## 自动导航

```bash
python3 openharmony-knowledge-base/tools/search/kb_search.py \
  --source-root "$OHOS_ROOT" \
  --query-file "$PDIR/ar.md" \
  --k 8 \
  --out "$PDIR/design_refs.md"
```

导航结果可能过时，只用于缩小搜索范围。

## 当前源码验证

```bash
repo list | rg -i '<candidate>'
git -C "$OHOS_ROOT/<repo>" rev-parse HEAD
rg -n '<symbol-or-feature>' "$OHOS_ROOT/<repo>"
rg -n '<component-or-target>' "$OHOS_ROOT/<repo>" \
  -g 'bundle.json' -g 'BUILD.gn' -g '*.gni'
```

最后读取当前接口、调用方、测试、产品和运行配置，并把仓路径与 HEAD 记录进设计依据。

## 导航维护

```bash
python3 openharmony-knowledge-base/tools/rebuild_navigation.py
python3 openharmony-knowledge-base/tools/rebuild_navigation.py --check
python3 openharmony-knowledge-base/tools/search/build_index.py --rebuild
```
