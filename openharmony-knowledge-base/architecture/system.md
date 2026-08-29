# 系统概念导航

本页只提供稳定的分析顺序，不保存当前系统实现清单。

## 所有权路线

```text
需求
  -> 候选 subsystem
    -> candidate component / process
      -> capability / feature
        -> 当前 repo manifest 中的真实仓
```

## 当前源码验证路线

在 `$OHOS_ROOT` 中依次确认：

1. `repo list` 中的真实仓路径与当前 HEAD；
2. `bundle.json` 的当前组件归属；
3. 当前接口与代表性调用方；
4. init、SA、插件、权限等生产配置；
5. 当前测试与真实运行证据。

子系统、组件或进程名称只能作为候选导航词。运行身份、依赖和能力边界都属于动态源码事实。
