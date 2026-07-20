# rk3568 内核配置画像

## 归属

```text
kernel -> rk3568 内核配置
```

回答"rk3568 这块板子的内核开了哪些 feature、哪个版本、配置怎么合并出来的"。事实源是
`kernel/linux/config/linux-6.6/` 下的 defconfig,不是运行时。

## 内核版本

- **rk3568 默认 `linux_kernel_version="linux-6.6"`**（另有 linux-5.10 可选）。
- 架构 `arm64`。构建时复制到 `out/kernel/src_tmp/linux-6.6` 注入补丁后编译（见
  [architecture/system.md](../../architecture/system.md)）。

## 配置合并层次（三层叠加)

```
type/standard_defconfig   标准系统通用配置
      +
base_defconfig            linux-6.6 基线
      +
rk3568/arch/arm64_defconfig   板级配置(6193 行,最终生效)
```

| 层 | 路径 |
| --- | --- |
| 标准类型 | [config/linux-6.6/type/standard_defconfig](../../../../kernel/linux/config/linux-6.6/type/standard_defconfig) |
| 基线 | [config/linux-6.6/base_defconfig](../../../../kernel/linux/config/linux-6.6/base_defconfig) |
| 板级 | [config/linux-6.6/rk3568/arch/arm64_defconfig](../../../../kernel/linux/config/linux-6.6/rk3568/arch/arm64_defconfig) |

## 关键 OHOS 特性开关（rk3568 实测 =y）

**安全**：
| CONFIG | 能力 | 对应模块 |
| --- | --- | --- |
| `SECURITY_CODE_SIGN` + `FS_VERITY` + `FS_VERITY_BUILTIN_SIGNATURES` | 代码签名/文件完整性 | [code_sign](common-modules/code_sign/README.md) |
| `TZDRIVER` | TEE 通信 | [tzdriver](common-modules/tzdriver/README.md) |
| `SECURITY_XPM_DEBUG` | 执行页保护 | [xpm](common-modules/xpm/README.md) |
| `SECURITY_CONTAINER_ESCAPE_DETECTION` | 容器逃逸检测 | [container_escape_detection](common-modules/container_escape_detection/README.md) |
| `MEMORY_SECURITY` | 渲染内存保护 | [memory_security](common-modules/memory_security/README.md) |
| `SECURITY_SELINUX` | 强制访问控制 | （内核基础） |

**调度 / QoS**（支撑 FFRT）：
`QOS_CTRL=y`、`QOS_AUTHORITY=y`、`QOS_POLICY_MAX_NR=6`、`SCHED_LATENCY_NICE=y`、`SCHED_RTG_*`
→ 对应 [qos_auth](common-modules/qos_auth/README.md)（内核 QoS 鉴权,config 名即 `QOS_CTRL`/`QOS_AUTHORITY`）。

**内存 / 性能**：
`HYPERHOLD_*`（内存压缩换出）、`ZRAM_GROUP_WRITEBACK`、`MEM_PURGEABLE`、`RECLAIM_ACCT`
→ OHOS 特色的内存回收/压缩能力。

**文件系统**：`F2FS_FS`（含 security/ACL）—— OHOS 主力文件系统。

## 用途

- **判断某内核能力是否在 rk3568 生效**：查此画像的 `=y`,而非只看源码存在。
- **P0 环境 / P5 影响面**：改内核特性前确认它是否被 rk3568 启用。
- 与 [common_modules 总表](README.md)、[HCS 拓扑](rk3568-hdf-topology.md) 交叉印证。

## 注意

- 上表为抽取的关键项,全量以 `arm64_defconfig`（6193 行）为准。
- `# ... is not set` 表示未启用；`=y` 编入内核；`=m` 编为可加载模块。
