# memory_security — 渲染进程内存保护

## 归属

```text
kernel -> common_modules -> memory_security
```

## 目标与边界

针对"当前 Linux 内核在内存安全方面仍有加固空间",对渲染进程等做内存保护:JIT 内存管控、
内存地址隐藏,降低内存安全漏洞的可利用性。

- 目标：JIT 空间管控（可写与可执行分离）、内存地址隐藏。
- 非目标：通用堆/栈保护（属编译器/内核基础）。

## 代码入口（源码仓相对路径）

| 文件 | 职责 |
| --- | --- |
| [module.c](../../../../../kernel/linux/common_modules/memory_security/module.c) | 模块入口 |
| [src/jit_space_list.c](../../../../../kernel/linux/common_modules/memory_security/src/jit_space_list.c) | JIT 空间列表 |
| [src/jit_process.c](../../../../../kernel/linux/common_modules/memory_security/src/jit_process.c) | 进程 JIT 管控 |

## 配置与开关

- `CONFIG_MEMORY_SECURITY`、`CONFIG_HIDE_MEM_ADDRESS`、`CONFIG_JIT_MEM_CONTROL`。
- **rk3568:三者均 `=y`（启用）。**

## 运行链

- 模块加载注册后,对目标进程（如渲染进程）的 JIT 内存分配施加 W^X 类约束,并隐藏内存地址暴露。
  具体作用进程与钩子需读 `jit_process.c` 确认。

## 风险 / 安全

- **安全关键**:内存安全加固。JIT 场景下可写/可执行页管理的正确性是重点。

## 运维

暂无独立 operations。
