# 句柄泄露检测插件

在 `base/hiviewdfx/hiview` 中，新增一个句柄泄露检测插件：
- 每隔 60 秒查看一次 `/proc/{pid}/fd` 目录
- 下辖句柄数量超过 5000，就将句柄数量记录在 `data/log/reliability/resource_leak/fd_leak/` 当中
