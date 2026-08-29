# <feature> 导航

> 本页只保存 feature 名称和归属关键词，不复制实现、构建或测试事实。

## 导航身份

- 类型：`feature`
- 层级：`<subsystem> -> <component-or-process> -> <capability> -> <feature>`

## 当前源码定位

```bash
repo list | rg -i '<component-or-process>'
rg -n '<feature-keyword>' "$OHOS_ROOT/<candidate-repo>"
git -C "$OHOS_ROOT/<candidate-repo>" rev-parse HEAD
```
