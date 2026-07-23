#!/usr/bin/env bash
# Install the repository skills into an Agent's skills directory.
# The skills/ tree is the single source of truth; installed files are real
# copies because some Agent runtimes do not scan symlinked skill directories.
set -euo pipefail

PROJ_SKILLS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/skills"

usage() {
  cat <<'EOF'
Usage: sync-skills.sh [--agent NAME | --target DIR] [--dry-run]

Install every skill under ./skills into an Agent skill directory.

Options:
  --agent NAME  Use a conventional Agent directory (claude, codex, gemini,
                agents, or any custom name). Defaults to claude for backwards
                compatibility.
  --target DIR  Install into this exact skills directory. This is the portable
                option for Agents whose directory layout is not known.
  --dry-run     Show the destination without changing files.
  -h, --help    Show this help.

Environment:
  AGENT_SKILLS_DIR  Default target directory when --target is omitted.
  AGENT_HOME        Base directory for --agent NAME.

Examples:
  bash sync-skills.sh                         # Claude-compatible default
  bash sync-skills.sh --agent codex
  bash sync-skills.sh --target "$HOME/.my-agent/skills"
  AGENT_SKILLS_DIR=/opt/agent/skills bash sync-skills.sh
EOF
}

agent_name="claude"
target_dir="${AGENT_SKILLS_DIR:-}"
dry_run=false

while [ "$#" -gt 0 ]; do
  case "$1" in
    --agent)
      [ "$#" -ge 2 ] || { echo "ERROR: --agent requires a name" >&2; exit 2; }
      agent_name="$2"
      shift 2
      ;;
    --target)
      [ "$#" -ge 2 ] || { echo "ERROR: --target requires a directory" >&2; exit 2; }
      target_dir="$2"
      shift 2
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      [ "$#" -eq 0 ] || { echo "ERROR: unexpected argument: $1" >&2; exit 2; }
      ;;
    -* )
      echo "ERROR: unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [ -n "$target_dir" ]; then
        echo "ERROR: target specified more than once" >&2
        exit 2
      fi
      target_dir="$1"
      shift
      ;;
  esac
done

if [ -z "$target_dir" ]; then
  case "$agent_name" in
    claude)
      agent_home="${AGENT_HOME:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}"
      ;;
    codex|openai|openai-codex)
      agent_home="${AGENT_HOME:-${CODEX_CONFIG_DIR:-${CODEX_HOME:-$HOME/.codex}}}"
      ;;
    gemini)
      agent_home="${AGENT_HOME:-${GEMINI_CONFIG_DIR:-$HOME/.gemini}}"
      ;;
    agents|generic)
      agent_home="${AGENT_HOME:-$HOME/.agents}"
      ;;
    *)
      # Unknown Agent layouts are still supported through ~/.<name>/skills;
      # --target is preferred when that convention does not apply.
      case "$agent_name" in
        *[!a-zA-Z0-9_.-]*|"")
          echo "ERROR: invalid Agent name '$agent_name'; use --target for a custom layout" >&2
          exit 2
          ;;
      esac
      agent_home="${AGENT_HOME:-$HOME/.$agent_name}"
      ;;
  esac
  target_dir="$agent_home/skills"
fi

# Expand the common quoted ~/ form and normalize without creating a directory.
case "$target_dir" in
  "~") target_dir="$HOME" ;;
  "~/"*) target_dir="$HOME/${target_dir#~/}" ;;
esac
target_dir="$(readlink -m "$target_dir")"

case "$target_dir" in
  "$PROJ_SKILLS"|"$PROJ_SKILLS"/*)
    echo "ERROR: target must not be the repository's skills directory: $target_dir" >&2
    exit 2
    ;;
esac

skill_count="$(find "$PROJ_SKILLS" -mindepth 1 -maxdepth 1 -type d -print | wc -l)"
echo "Target: $target_dir"
echo "Skills: $skill_count"

if [ "$dry_run" = true ]; then
  echo "Dry run: no files changed."
  exit 0
fi

mkdir -p "$target_dir"

for src in "$PROJ_SKILLS"/*/; do
  name="$(basename "$src")"
  dst="$target_dir/$name"
  # Remove only the same package-owned skill directory; unrelated skills stay.
  [ -L "$dst" ] && rm -f "$dst"
  rm -rf "$dst"
  # -L follows source symlinks and leaves a real installed directory.
  cp -aL "$src" "$dst"
  find "$dst" -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true
  echo "-> synced $name"
done

echo "Installed $skill_count skills into $target_dir."
echo "Restart the Agent session if it caches discovered skills."
