---
name: ohos-build-flash
description: |
  OpenHarmony (rk3568) 编译 + 真机刷机的可复用流程 skill。
  当用户说"编译镜像/整编/build.sh"、"刷机/烧录/flash 镜像"、"刷整套镜像"、"内核 ko 编译后上板"、
  "SELinux 策略上板验证"或类似表述时触发。
  覆盖：单目标增量编译、全量整编(make_all)、ko/插件/sepolicy 产物定位、
  经 hdcw 的整套镜像刷写(updater 模式 send+dd)、内核模块签名匹配、
  以及已踩过并验证的坑与规避。
---

# ohos-build-flash Skill

OpenHarmony（rk3568）的「编译 → 真机刷机 → 端到端验证」实测流程。本文命令均已真机跑通
（含踩坑与规避），照此复用即可。

> **路径约定**：本文用 `$OHOS_ROOT` 表示 OpenHarmony 源码根目录。**它不是固定值**——
> 每次按用户当前所在仓 / 用户指定的目录决定（例如可能是 `~/ohos/master`、`/work/oh` 等）。
> 文中出现的 `/home/user/ohos/master` 仅为示例，**不要写死**；执行前先确认实际根目录
> （如 `pwd`、或用户告知），再 `cd "$OHOS_ROOT"`。

---

## 0. 前置条件（不在本 skill 范围内，须已就绪）

本 skill **假设刷机/连机通道已由用户预先配置好**，自身不负责搭建该通道：

1. **设备 hdc 连接已通**——本环境是 WSL2，通过用户预置的 bash 函数 `hdcw` 转发到
   **Windows 侧的 hdc server**（hdc 二进制与真机 USB 实际都在 Windows 上）。
   验证：`hdcw list targets -v` 能列出设备且为 `Connected`。
   - `hdcw` 是**用户前置准备好的**，本 skill 直接使用，不重新定义/搭建。
   - 若环境不同（如 Linux 本机直连真机），把下文 `hdcw` 替换为对应的 `hdc` 调用即可，
     流程逻辑不变。
   - 在纯 WSL/Linux 侧无法做的部分（RK loader/maskrom 整刷、RKDevTool）属于 **Windows 侧**
     操作，需用户在 Windows 上完成；本 skill 走的是不依赖这些的 `updater + file send + dd` 路径。
2. **源码已可编译**——`$OHOS_ROOT` 下 `build.sh` 可用、依赖已装。

| 项 | 值（示例，按实际替换） |
|----|----|
| 源码根 | `$OHOS_ROOT`（运行时确定，勿写死） |
| 产品 | rk3568 |
| 镜像产物目录 | `$OHOS_ROOT/out/rk3568/packages/phone/images/` |
| ko 产物目录 | `$OHOS_ROOT/out/rk3568/packages/phone/chip_ckm/`（随 chip_ckm 分区） |

调用约定：
- 经 hdc 调用建议包 `bash -ic 'hdcw ...' 2>&1 | grep -vE 'terminal process group|job control'`。
- **多目标场景**（USB 设备 + COM UART 同列）`flash`/`shell` 会报 `need connect-key`，
  须加 `-t <connectkey>`（即 `hdcw list targets -v` 第一列那串）。

---

## 1. 编译

### 1.1 单目标增量编译（写一段编一段，几分钟级）
```bash
cd "$OHOS_ROOT"          # $OHOS_ROOT = 实际源码根, 勿写死
./build.sh --product-name rk3568 --ccache --build-target <target>
```
常用 target：
- 内核模块：`sysload_ko` → 产出 `out/rk3568/packages/phone/chip_ckm/<name>.ko`
- hiview gtest / 工具：`SysLoadXxxTest`、`sysload_inject` 等（**裸 target 名**，不要用 `//path:target` 形式——那会触发 indep 单组件构建而非编你的 target）
- sepolicy：`build_policy`(→policy.31) / `build_contexts`(→file_contexts)
- 全量 selinux 校验：`selinux_check`（**整编才会跑**，单独 build_policy 不跑）

### 1.2 全量整编（make_all，约 2 小时）
```bash
cd "$OHOS_ROOT"
./build.sh --product-name rk3568 --ccache > /tmp/full_build_$(date +%Y%m%d_%H%M%S).log 2>&1 &
```
后台跑，完成事件触发后**必须核验真实结果**（exit 0 不可信）：
```bash
grep -nE '=====build (successful|error)|GN Failed|FAILED:|Cost Time' <log> | tail
```
`=====build successful=====` 才算成功；`=====build error=====` 为失败，回看 `FAILED:` 上下文定位。

### 1.3 产物核验（整编后）
```bash
IMG=out/rk3568/packages/phone/images
ls -la $IMG/*.img                                   # 全套镜像
find out/rk3568 -name '<mod>.ko'                    # 内核模块编入
strings out/rk3568/.../libbdfr.z.so | grep <Plugin> # hiview 插件符号
P=$(find out/rk3568 -path '*system/etc/selinux/targeted/policy/policy.31'|head -1)
strings "$P" | grep <sepolicy_type>                 # SELinux 类型编入
```

---

## 2. 已验证的坑与规避（务必先读）

| 坑 | 现象 | 规避 |
|----|------|------|
| **`--build-target //path:target`** | 触发 indep 单组件构建，编的是整包不是你的 target，产物找不到 | 用**裸 target 名** |
| **OHOS 部件隔离** | hiview 目标 `#include` 内核源码报 `do not directly use header files of other components` | 内核逻辑**vendored 复制**进 hiview 测试目录（带 KEEP-IN-SYNC 注释） |
| **内核 .ko 仓非注册部件** | 无法在内核仓挂 `ohos_unittest`/`ohos_executable` | 测试用例统一落 hiview 仓 |
| **hiview 强制 CFI** | test 目标报 `sanitizers.gni:446 Assertion failed ... cannot enable cfi` | test target 加 `sanitize={cfi=true cfi_cross_dso=true cfi_vcall_icall_only=true debug=false}` |
| **chr_file ioctl 缺 allowxperm** | 整编 `selinux_check` 报 `check ioctl rule in user mode failed ... allow X dev_xxx:chr_file ioctl` | 在 `sepolicy/whitelist/ioctl_xperm_whitelist.json` 的 `user` 列表登记 `"X dev_xxx chr_file"`（镜像 dev_ucollection），或写 `allowxperm X dev_xxx:chr_file ioctl { 0x.. }` |
| **内核模块签名 sig_enforce=Y** | `insmod` 报 `Key was rejected by service` | 自编 ko 必须与设备 boot 同密钥 → **刷匹配的自编 `boot_linux.img`** 后再 insmod；certs 重生成后旧私钥不可复用 |
| **`target boot -bootloader`** | 进 RK loader/maskrom，hdc 显示 `USB Offline`，**`hdc flash` 全部 `[E001005] Device not found`，且 WSL2 侧够不到** | **不要用**；要刷机走 **updater 模式**（见 §3） |
| **正常态 `hdc flash`** | 挂死（Terminated/143） | hdcd 正常系统不支持 flash，必须先进 updater |
| **updater 模式 `hdc flash` 子命令** | 同样挂死无响应（本环境 TCP 转发链路） | **不用 flash 子命令**，改 `file send` + 设备端 `dd`（见 §3） |
| **updater 下 `/data`** | 是 tmpfs（~972M），放不下 2GB system.img | 手动挂载真 userdata 分区（p15）暂存（见 §3） |

---

## 3. 整套镜像刷机（updater 模式：file send + dd）

> 经 WSL2→Windows-hdc 的链路下，`hdc flash`/loader 均不可用；唯一稳定路径是
> **进 updater 模式 → 挂 userdata 暂存 → file send 镜像 → 设备端 dd 到 by-name 分区**。
> 辅助脚本：`scripts/flash_all.sh`（封装本节全部步骤）。

### 3.1 进 updater 模式（OHOS 标准，可靠）
```bash
CK=$(hdcw list targets -v | awk 'NR==1{print $1}')   # connect-key
hdcw -t "$CK" shell "reboot updater"
sleep 45
hdcw -t "$CK" shell "ls /bin/updater >/dev/null 2>&1 && echo IN-UPDATER || echo not"
```
确认 `IN-UPDATER`（根为 rootfs，system/vendor 未挂载）。

### 3.2 挂载 userdata 暂存（updater 的 /data 是 tmpfs 不够用）
```bash
hdcw -t "$CK" shell "mkdir -p /mnt/ud; mount /dev/block/mmcblk0p15 /mnt/ud; df -k /mnt/ud|tail -1"
```
（mmcblk0p15 = userdata；忽略 `Invalid argument` 警告，能 df 出 ~19G 即成功。）

### 3.3 逐分区 send + dd（**跳过 userdata 保用户数据**）
分区↔镜像映射（rk3568）：
```
uboot.img→uboot  boot_linux.img→boot_linux  ramdisk.img→ramdisk  resource.img→resource
updater.img→updater  chip_ckm.img→chip_ckm(含 ko)  chip_prod.img→chip-prod
sys_prod.img→sys-prod  eng_system.img→eng_system  vendor.img→vendor  system.img→system
(userdata.img→userdata 跳过)
```
单分区操作：
```bash
cd "$OHOS_ROOT"/out/rk3568/packages/phone/images
hdcw -t "$CK" file send <img> /mnt/ud/_f.img
hdcw -t "$CK" shell "dd if=/mnt/ud/_f.img of=/dev/block/by-name/<part> bs=4M; sync; rm -f /mnt/ud/_f.img"
```
顺序建议：先小分区（uboot/boot_linux/ramdisk/resource/updater/chip_ckm/chip-prod/sys-prod/eng_system），再 vendor(256M)，最后 system(2GB, dd 约 30s)。

### 3.4 收尾 + 重启
```bash
hdcw -t "$CK" shell "umount /mnt/ud; sync; reboot"
sleep 90
hdcw list targets -v        # 等回 Connected
```

---

## 4. 刷后端到端验证
```bash
CK=$(hdcw list targets -v | awk 'NR==1{print $1}')
hdcw -t "$CK" shell "ls /bin/updater >/dev/null 2>&1 && echo STILL-UPDATER || echo NORMAL; getenforce"
# SELinux 类型/标签编入
hdcw -t "$CK" shell "grep -i <node> /system/etc/selinux/targeted/contexts/file_contexts"
# 内核模块随镜像 + 加载 + 节点标签(Enforcing) + 0 误拒
hdcw -t "$CK" shell "insmod /chip_ckm/<mod>.ko; sleep 2; ls -Z /dev/<node>; dmesg|grep -ic 'avc.*<type>'"
```
期望：`NORMAL` + `Enforcing` + 节点正确打 SELinux 标签 + 误拒计数 `0` + 功能正常。

---

## 5. 仅内核改动的快路径（不整刷）

只改了内核模块时，无需整刷 system —— 只刷 boot（解决签名）+ 推 ko：
```bash
# 1) 编 ko（会顺带产出匹配密钥的 boot_linux.img）
./build.sh --product-name rk3568 --ccache --build-target <mod>_ko
# 2) 刷 boot 使签名密钥匹配（dd，boot_linux=mmcblk0p5；或走 §3 updater）
hdcw shell "dd if=/data/local/tmp/boot_linux.img of=/dev/block/by-name/boot_linux bs=1M; sync"  # 需先 file send
hdcw shell "reboot"; sleep 70
# 3) 重启后加载自编 ko
hdcw shell "insmod /data/local/tmp/<mod>.ko [params...]"
```

## 6. 仅 SELinux 策略上板（不整刷，需 eng 构建无 dm-verity）
```bash
./build.sh --product-name rk3568 --ccache --build-target build_policy --build-target build_contexts
# 设备 / (system) 可 remount,rw 时：备份→替换→重启 即持久强制
hdcw shell "mount -o remount,rw /; cp /system/.../policy.31 <bak>; "  # 详见会话归档
```

---

## 附：辅助脚本
- `scripts/flash_all.sh` — 一键执行 §3 整套刷机（updater→挂载→逐分区 send+dd→重启）。
  用法：`bash scripts/flash_all.sh [images_dir]`，默认 `out/rk3568/packages/phone/images`。
  **前置**：设备已 Connected；脚本会自动 `reboot updater`。会跳过 userdata。
