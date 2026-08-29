# OpenHarmony 子系统导航

> 本页属于 `stable-navigation`：只记录层级、名称和源码定位入口。
> 它不声明当前文件、接口、GN target、依赖、产品选入或运行行为；这些事实必须
> 在当前 `$OHOS_ROOT` 对应代码仓中验证。

## 导航身份

- 类型：`subsystem-index`
- 节点：`subsystems`

## 当前源码定位（必须执行）

知识库只给出候选关键词。以当前源码仓输出为准：

```bash
test -d "$OHOS_ROOT/.repo"
repo list | rg -i subsystems
rg -n subsystems "$OHOS_ROOT" -g 'bundle.json' -g 'BUILD.gn' -g '*.gni'
```

定位候选仓后，必须读取其当前 `bundle.json`、`BUILD.gn`、接口、测试和运行配置，
并记录仓路径与 `git rev-parse HEAD`；不得把本页内容直接写入代码契约。

## 下级导航

- [ability](ability/README.md)
- [ai](ai/README.md)
- [arkui](arkui/README.md)
- [barrierfree](barrierfree/README.md)
- [bundlemanager](bundlemanager/README.md)
- [castplus](castplus/README.md)
- [communication](communication/README.md)
- [developtools](developtools/README.md)
- [deviceprofile](deviceprofile/README.md)
- [distributeddatamgr](distributeddatamgr/README.md)
- [distributedhardware](distributedhardware/README.md)
- [filemanagement](filemanagement/README.md)
- [graphic](graphic/README.md)
- [hiviewdfx](hiviewdfx/README.md)
- [kernel](kernel/README.md)
- [multimedia](multimedia/README.md)
- [multimodalinput](multimodalinput/README.md)
- [officeservice](officeservice/README.md)
- [resourceschedule](resourceschedule/README.md)
- [systemabilitymgr](systemabilitymgr/README.md)
- [window](window/README.md)
