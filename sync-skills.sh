#!/usr/bin/env bash
# 把项目 skills/ 同步到 Claude Code 全局技能目录 ~/.claude/skills/
# 原生二进制版 Claude Code 不扫描"软链接目录"，故用真实拷贝。
# 项目 skills/ 为唯一真源；改完技能后跑一次本脚本即可。
set -euo pipefail

PROJ_SKILLS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/skills"
GLOBAL_SKILLS="${HOME}/.claude/skills"
mkdir -p "$GLOBAL_SKILLS"

for src in "$PROJ_SKILLS"/*/; do
  name="$(basename "$src")"
  dst="$GLOBAL_SKILLS/$name"
  # 若旧的是软链，先删除
  [ -L "$dst" ] && rm -f "$dst"
  rm -rf "$dst"
  # -L 跟随软链拷贝真实内容；排除运行态缓存
  cp -aL "$src" "$dst"
  find "$dst" -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
  echo "→ synced $name"
done

echo "✅ 已同步 $(ls -d "$PROJ_SKILLS"/*/ | wc -l) 个技能到 $GLOBAL_SKILLS（真实目录）"
echo "   重启 Claude Code 窗口后生效。"
