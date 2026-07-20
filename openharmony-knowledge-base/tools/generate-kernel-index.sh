#!/usr/bin/env bash
# generate-kernel-index.sh — 扫描 OHOS 内核 common_modules,产出 kernel-modules.tsv。
#
# 与其它生成器一致:必须在 OHOS 源码仓根附近运行(ROOT_DIR = tools/../../..),因为要读
# kernel/linux/common_modules 与 rk3568 defconfig。产物默认写到源码仓的
# specs/knowledge-base/generated/(历史生成位置);知识库真源已迁到 AI-AR-workflow 的
# openharmony-knowledge-base/,生成后请把 kernel-modules.tsv 同步回本目录 generated/。
#
# 每行 = 一个 common_module:
#   module  kconfig_names  rk3568_enabled  source_file_count  path
#
# 局限:rk3568_enabled 只按“模块自身 Kconfig 声明的 config 名”在 defconfig 查命中。
# 少数模块的开关不在模块 Kconfig 里(如 qos_auth 的 QOS_CTRL/QOS_AUTHORITY 定义在内核
# 调度核心),会显示 no——以 rk3568-kernel-config.md 的画像为准。
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/../../.." && pwd)
OUT_DIR="${KB_OUT_DIR:-$ROOT_DIR/specs/knowledge-base/generated}"
CM_DIR="$ROOT_DIR/kernel/linux/common_modules"
DEFCONFIG="$ROOT_DIR/kernel/linux/config/linux-6.6/rk3568/arch/arm64_defconfig"

mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/kernel-modules.tsv"

printf 'module\tkconfig_names\trk3568_enabled\tsource_file_count\tpath\n' > "$OUT"

if [ ! -d "$CM_DIR" ]; then
  echo "WARN: $CM_DIR not found — not an OHOS source root? wrote header only." >&2
  exit 0
fi

for mdir in "$CM_DIR"/*/; do
  [ -d "$mdir" ] || continue
  module=$(basename "$mdir")

  # Kconfig config 名(逗号分隔),可能为空
  kconfigs=$(grep -rh '^[[:space:]]*config ' "$mdir"Kconfig 2>/dev/null \
    | awk '{print $2}' | paste -sd ',' - || true)

  # 该模块任一 config 在 rk3568 defconfig 命中 =y/=m -> yes
  enabled="no"
  if [ -f "$DEFCONFIG" ] && [ -n "$kconfigs" ]; then
    IFS=',' read -ra names <<< "$kconfigs"
    for c in "${names[@]}"; do
      if grep -q "^CONFIG_${c}=[ym]" "$DEFCONFIG" 2>/dev/null; then
        enabled="yes"; break
      fi
    done
  fi

  # 源文件数(.c/.h)
  count=$(find "$mdir" \( -name '*.c' -o -name '*.h' \) 2>/dev/null | wc -l | tr -d ' ')

  rel="kernel/linux/common_modules/$module"
  printf '%s\t%s\t%s\t%s\t%s\n' \
    "$module" "${kconfigs:-}" "$enabled" "$count" "$rel" >> "$OUT"
done

echo "generated $OUT ($(($(wc -l < "$OUT") - 1)) modules)"
echo "NOTE: 知识库真源在 AI-AR-workflow/openharmony-knowledge-base/ — 请把此 TSV 同步过去。"
