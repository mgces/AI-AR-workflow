#!/usr/bin/env bash
set -euo pipefail

# POSIX convenience wrapper. Use requirement_metrics.py directly on Windows.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/requirement_metrics.py" "$@"
