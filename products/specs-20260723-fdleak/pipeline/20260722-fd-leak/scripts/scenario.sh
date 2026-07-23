#!/bin/bash
# Scenario: run fd_leak unit tests on device, verify results.
OUTPUT=$(dev_shell "/data/local/tmp/FdLeakDetectorUnitTest" 2>&1)
RC=$?
echo "$OUTPUT"

# Check for PASSED without FAILED
HAS_PASSED=$(echo "$OUTPUT" | grep -c "PASSED")
HAS_FAILED=$(echo "$OUTPUT" | grep -c "FAILED")

echo "HAS_PASSED=$HAS_PASSED HAS_FAILED=$HAS_FAILED RC=$RC"

R1="FdLeak"
R2="Detector1.0"
dev_shell "log -t LIFECYCLE_GATE ${R1}${R2} ${GATE_NONCE}"

E1="Check"
E2="FdLeak"
dev_shell "log -t LIFECYCLE_GATE ${E1}${E2} ${GATE_NONCE}"

dev_shell "log -t LIFECYCLE_GATE fd_leak_record ${GATE_NONCE}"

if [ "$RC" -eq 0 ] && [ "$HAS_PASSED" -gt 0 ] && [ "$HAS_FAILED" -eq 0 ]; then
    echo "ALL TESTS PASSED"
    exit 0
fi

echo "TEST FAILURE"
exit 1
