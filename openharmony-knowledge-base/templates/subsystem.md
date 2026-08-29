# <subsystem> 导航

> `stable-navigation`，不包含当前代码事实。

## 导航身份

- 类型：`subsystem`
- 节点：`<subsystem>`

## 当前源码定位

```bash
repo list | rg -i '<subsystem>'
rg -n '<subsystem>' "$OHOS_ROOT" -g 'bundle.json' -g 'BUILD.gn'
```

记录真实仓路径与 HEAD 后，再读取当前组件、接口、配置和测试。
