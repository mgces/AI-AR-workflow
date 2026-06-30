#!/usr/bin/env bash
# ohos-build-flash: 一键整刷 rk3568 系统侧镜像 (updater 模式 file send + dd)。
#
# 用法: bash flash_all.sh [images_dir]
#   images_dir 优先级: $1 > $OHOS_ROOT/out/rk3568/packages/phone/images > 当前目录推断
#   (源码根目录不固定; 通过参数或 OHOS_ROOT 环境变量指定, 勿写死)
#
# 前置: 设备已正常启动且 hdc 可达 (经用户预置的 hdcw / Windows 侧 hdc server)。
# 行为: reboot updater → 挂载 userdata(p15) 暂存 → 逐分区 file send + dd → 重启。
#       **跳过 userdata 分区** 以保留用户数据。
# 经 WSL2→Windows-hdc 链路验证可用; 不依赖 hdc flash / RK loader。
set -uo pipefail

# images_dir: 参数1 > $OHOS_ROOT/... > 报错要求显式指定
if [ "${1:-}" != "" ]; then
  IMG_DIR="$1"
elif [ "${OHOS_ROOT:-}" != "" ]; then
  IMG_DIR="$OHOS_ROOT/out/rk3568/packages/phone/images"
else
  echo "[FATAL] 未指定 images 目录。用法: bash flash_all.sh <images_dir>" >&2
  echo "        或先 export OHOS_ROOT=<你的源码根目录>" >&2
  exit 2
fi
HDC="${HDC_HOME:-$HOME/.local/hdc}/hdc"
WIN_PORT="${HDC_WIN_PORT:-10086}"
WIN_IP="$(ip route show default | awk '{print $3; exit}')"
H=("$HDC" -s "${WIN_IP}:${WIN_PORT}")

# 分区映射: "镜像文件:by-name分区"  (顺序: 小→大; 跳过 userdata)
MAP=(
  "uboot.img:uboot"
  "boot_linux.img:boot_linux"
  "ramdisk.img:ramdisk"
  "resource.img:resource"
  "updater.img:updater"
  "chip_ckm.img:chip_ckm"
  "chip_prod.img:chip-prod"
  "sys_prod.img:sys-prod"
  "eng_system.img:eng_system"
  "vendor.img:vendor"
  "system.img:system"
)

die() { echo "[FATAL] $*" >&2; exit 1; }

[ -d "$IMG_DIR" ] || die "images dir 不存在: $IMG_DIR"
[ -x "$HDC" ]     || die "hdc 不存在: $HDC"

CK="$("${H[@]}" list targets -v 2>/dev/null | awk 'NR==1{print $1}')"
[ -n "$CK" ] && [ "$CK" != "[Empty]" ] || die "未发现设备, 先确认 hdcw list targets -v 为 Connected"
echo "[*] device connect-key = $CK"
T=("${H[@]}" -t "$CK")

echo "[*] 进入 updater 模式 ..."
"${T[@]}" shell "reboot updater" >/dev/null 2>&1
for i in $(seq 1 30); do
  sleep 3
  mode="$("${T[@]}" shell "ls /bin/updater >/dev/null 2>&1 && echo IN-UPDATER || echo no" 2>/dev/null | tr -d '\r')"
  [ "$mode" = "IN-UPDATER" ] && break
done
[ "${mode:-}" = "IN-UPDATER" ] || die "未进入 updater 模式 (当前: ${mode:-unknown})"
echo "[*] IN-UPDATER ✓"

echo "[*] 挂载 userdata(mmcblk0p15) 暂存 ..."
"${T[@]}" shell "mkdir -p /mnt/ud; mount /dev/block/mmcblk0p15 /mnt/ud 2>/dev/null; touch /mnt/ud/_w 2>/dev/null && echo OK && rm -f /mnt/ud/_w" \
  | grep -q OK || die "userdata 挂载/写入失败"
echo "[*] /mnt/ud 就绪 ✓"

for entry in "${MAP[@]}"; do
  img="${entry%%:*}"; part="${entry##*:}"
  src="$IMG_DIR/$img"
  if [ ! -f "$src" ]; then echo "[skip] 缺镜像 $img"; continue; fi
  sz=$(stat -c%s "$src" 2>/dev/null || echo 0)
  echo "===== $img ($((sz/1024/1024)) MB) -> $part ====="
  "${T[@]}" file send "$src" /mnt/ud/_f.img 2>&1 | grep -iE 'finish|fail|error' | tail -1
  out="$("${T[@]}" shell "dd if=/mnt/ud/_f.img of=/dev/block/by-name/$part bs=4M 2>&1 | tail -1; sync; rm -f /mnt/ud/_f.img; echo ${part}-DONE" 2>&1)"
  echo "$out" | tail -2
  echo "$out" | grep -q "${part}-DONE" || die "$part 刷写失败"
done

echo "[*] 收尾: 卸载 + 重启 ..."
"${T[@]}" shell "sync; umount /mnt/ud 2>/dev/null; reboot" >/dev/null 2>&1
echo "[*] 已重启, 等待回到系统 (约 90s) ..."
sleep 90
"${H[@]}" list targets -v 2>/dev/null | tail -3
echo "[DONE] 整刷完成。建议执行 SKILL.md §4 端到端验证。"
