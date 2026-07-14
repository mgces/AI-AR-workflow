#!/usr/bin/env bash
# 收集本次流水线产物到 product 目录 + git add/commit/push
set -uo pipefail
PROD=/home/maplestory/OpenHarmony/AI-AR-workflow/products/20260715-appfreeze-recovery-barrier
OHDOC=/home/maplestory/OpenHarmony/OHReleatedDocs
PIPEBASE=/home/maplestory/OpenHarmony/specs/pipeline/20260714-appfreeze-recovery-ar
WF=/home/maplestory/OpenHarmony/AI-AR-workflow

echo "=== 1. 复制归档文档 ==="
cp "$OHDOC/worklog_2026-07-15_appfreeze-ar-workflow-pipeline.md" "$PROD/"
cp "$OHDOC/docs/openharmony/anr/appfreeze_recovery_barrier_pipeline_execution_analysis.md" "$PROD/"

echo "=== 2. 复制 pipeline 状态 ==="
mkdir -p "$PROD/pipeline-state"
cp "$PIPEBASE/ability_runtime/pipeline.json" "$PROD/pipeline-state/ability_runtime.json"
cp "$PIPEBASE/hiview/pipeline.json" "$PROD/pipeline-state/hiview.json"
# manifest 证据账本
cp "$PIPEBASE/ability_runtime/evidence/manifest.jsonl" "$PROD/pipeline-state/ability_runtime_manifest.jsonl" 2>/dev/null
cp "$PIPEBASE/hiview/evidence/manifest.jsonl" "$PROD/pipeline-state/hiview_manifest.jsonl" 2>/dev/null

echo "=== 3. 复制 P1 证据(diff/style/strict) ==="
mkdir -p "$PROD/p1-evidence"
cp "$PIPEBASE/ability_runtime/evidence/phase1/changed_files.txt" "$PROD/p1-evidence/ar_changed_files.txt" 2>/dev/null
cp "$PIPEBASE/ability_runtime/evidence/phase1/strict_cpp_report.txt" "$PROD/p1-evidence/ar_strict_report.txt" 2>/dev/null
cp "$PIPEBASE/hiview/evidence/phase1/strict_cpp_report.txt" "$PROD/p1-evidence/hv_strict_report.txt" 2>/dev/null

echo "=== 4. 复制关键编译日志 ==="
mkdir -p "$PROD/p2-build-logs"
cp /tmp/p2_build_final2.log "$PROD/p2-build-logs/ninja_build.log" 2>/dev/null
cp "$PIPEBASE/ability_runtime/evidence/phase2/build_banner.txt" "$PROD/p2-build-logs/ar_build_banner.txt" 2>/dev/null
cp "$PIPEBASE/ability_runtime/evidence/phase2/compiled_artifacts.txt" "$PROD/p2-build-logs/ar_artifacts.txt" 2>/dev/null

echo "=== 5. 复制 P3 测试用例代码 ==="
mkdir -p "$PROD/p3-tests"
cp "$WF/gen_p3_tests.py" "$PROD/p3-tests/" 2>/dev/null
cp /tmp/p3_tests.cpp "$PROD/p3-tests/p3_verification_cases.cpp" 2>/dev/null

echo "=== 6. 列出 product 内容 ==="
find "$PROD" -type f | sort

echo
echo "=== 7. 清理工作目录里的临时脚本(不提交) ==="
cd "$WF"
# 临时脚本不纳入 git(已在 .gitignore 或 untracked)
echo "untracked 脚本数: $(git status --short | grep '^??' | wc -l)"

echo
echo "=== 8. git add product 目录 ==="
git add products/20260715-appfreeze-recovery-barrier/

echo "=== 9. git status ==="
git status --short | head -20

echo
echo "=== 10. git commit ==="
git commit -m "products: archive AppFreeze recovery barrier pipeline (P0-P2 passed, 8 test cases)

- ar.md: AR summary with patch hash-chain and 3 new IPCs
- worklog + analysis: full session documentation
- pipeline-state: pipeline.json + manifest.jsonl (HMAC signed evidence)
- p1-evidence: changed_files + strict_cpp reports
- p2-build-logs: ninja build log + compiled artifacts sha256
- p3-tests: 8 AR section 15 verification test cases" 2>&1

echo
echo "=== 11. git push ==="
git push origin main 2>&1

echo
echo "=== 12. 验证 ==="
git log --oneline -3 2>&1
