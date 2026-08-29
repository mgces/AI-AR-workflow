# distributedhardware 导航

> 本页属于 `stable-navigation`：只记录层级、名称和源码定位入口。
> 它不声明当前文件、接口、GN target、依赖、产品选入或运行行为；这些事实必须
> 在当前 `$OHOS_ROOT` 对应代码仓中验证。

## 导航身份

- 类型：`subsystem`
- 节点：`distributedhardware`
- 层级：`distributedhardware`
- 上级：[返回上级](../README.md)

## 当前源码定位（必须执行）

知识库只给出候选关键词。以当前源码仓输出为准：

```bash
test -d "$OHOS_ROOT/.repo"
repo list | rg -i distributedhardware
rg -n distributedhardware "$OHOS_ROOT" -g 'bundle.json' -g 'BUILD.gn' -g '*.gni'
```

定位候选仓后，必须读取其当前 `bundle.json`、`BUILD.gn`、接口、测试和运行配置，
并记录仓路径与 `git rev-parse HEAD`；不得把本页内容直接写入代码契约。
