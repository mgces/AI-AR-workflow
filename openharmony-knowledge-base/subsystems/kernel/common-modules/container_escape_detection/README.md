# container_escape_detection — 容器逃逸检测

## 归属

```text
kernel -> common_modules -> container_escape_detection
```

## 目标与边界

CED（Container Escape Detection）。在内核层检测容器逃逸行为(进程试图突破容器/命名空间隔离
获取更高权限),发现异常权限变化并处置。

- 目标：逃逸检测点、权限异常判定。
- 非目标：容器运行时本身。

## 代码入口（源码仓相对路径）

| 文件 | 职责 |
| --- | --- |
| [core/ced_module.c](../../../../../kernel/linux/common_modules/container_escape_detection/core/ced_module.c) | 模块入口 |
| [core/ced_detection.c](../../../../../kernel/linux/common_modules/container_escape_detection/core/ced_detection.c) | 检测逻辑 |
| [core/ced_permission.c](../../../../../kernel/linux/common_modules/container_escape_detection/core/ced_permission.c) | 权限判定 |
| [include/ced_detection_points.h](../../../../../kernel/linux/common_modules/container_escape_detection/include/ced_detection_points.h) | 检测点定义 |
| `apply_ced.sh` | 补丁应用脚本 |

## 配置与开关

- `CONFIG_SECURITY_CONTAINER_ESCAPE_DETECTION`。
- **rk3568:`=y`（启用）。**

## 运行链

- 模块加载后在预定义检测点(见 `ced_detection_points.h`)监视进程权限变化,
  `ced_detection.c` 判定逃逸、`ced_permission.c` 处置。

## 风险 / 安全

- **安全关键**:逃逸检测的检测点覆盖度决定能否发现真实逃逸;漏检即失效。

## 运维

暂无独立 operations。
