# rk3568 HDF 设备拓扑（HCS）

## 归属

```text
kernel -> hdf -> rk3568 板级设备拓扑
```

回答"rk3568 这块板子上,HDF 实际挂载了哪些驱动、按什么进程组织"。事实源是板级 HCS
（HardWare Configuration Source）配置,由 HDF DevmgrService 解析后创建 host/device 节点。

## HCS 配置位置（源码仓相对路径）

| 路径 | 说明 |
| --- | --- |
| [vendor/hihope/rk3568/hdf_config/uhdf](../../../../vendor/hihope/rk3568/hdf_config/uhdf) | **用户态** HDF 设备配置（主) |
| [vendor/hihope/rk3568/hdf_config/khdf](../../../../vendor/hihope/rk3568/hdf_config/khdf) | **内核态** HDF 设备配置 |
| `uhdf/hdf.hcs` | 根配置,`#include` 汇聚各设备 HCS |
| `uhdf/device_info.hcs` | **设备节点总表**：定义 host（驱动宿主进程）→ device → moduleName（驱动 .so） |

## 设备组织：host → device → driver

`device_info.hcs` 定义 **28 个 host**（驱动宿主进程),每个 host 托管一组驱动。示例:

| host | 托管驱动（moduleName,节选) |
| --- | --- |
| usb_host | libusb_pnp_manager / libusbfn / libusb_driver / libusb_ddk_driver … |
| power_host | libpower_driver / libbattery_driver / libthermal_driver |
| blue_host / a2dp_host | libbluetooth_hci_hdi_driver / libaudio_bluetooth_hdi_adapter_server |
| sample_host | libsample_driver（示例) |

> DevmgrService 读 `device_info.hcs` → 为每个 host 拉起 DevHostService → 按 moduleName 加载对应
> `HdfDriverEntry` → Bind/Init（见 [HDF 驱动框架](hdf-framework.md)）。

## rk3568 挂载的设备类别（按 HCS 文件）

**平台驱动**（framework/support/platform）:
`i2c_config` / `rk3568_spi_config` / `rk3568_uart_config` / `pwm_config` / `dma_config` /
`adc_config_linux` / `rk3568_watchdog_config` / `sdio_config` / `emmc_config` / `gpio`（test）。

**外设**:
`camera_config` + `camera_host_config` / `audio_config` + `dai_config` + `dsp_config` /
`codec_config` + `media_codec_capabilities` / `lcd_config`（显示) / `input_config`（触摸) /
`usb_pnp_device` + `usb_ecm_acm` / `wlan_platform` + `wlan_chip_ap6275s` + `wlan_chip_hi3881`（WiFi)。

**传感器**（sensor_config + 各芯片):
`bmi160`（加速度/陀螺) / `bh1745`（环境光) / `magnetic_lsm303`（磁) / `mxc6655xa`（加速度) /
`proximity_apds9960`（接近) / `humidity/temperature_aht20|sht30` / `bme688`。

**振动/指示**:`vibrator_config` / `linear_vibrator_config` / `drv2605l_linear_vibrator_config` /
`light_config`。

> 带 `_test_config` 的是 HDF 平台测试配置,非生产设备。

## 用途

- **影响面分析**:改某驱动 → 查它属哪个 host、被哪些 HDI 用 → 定回归范围。
- **P4 真机**:确认某外设是否真的挂在 rk3568(HCS 有则加载),辅助构造真机场景。
- **完整内核网络**:这是「模块 → HDF 框架 → **板级设备拓扑**」链的末端具象。

## 注意

- HCS 是**配置事实**,实际是否工作仍需真机 `hdf` 相关节点/日志验证（知识库事实优先级:源码/配置 > 分析)。
- 驱动 .so 的实现见 [drivers/peripheral](../../../../drivers/peripheral) 对应外设目录。
