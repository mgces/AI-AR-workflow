#!/bin/bash
# Deploy: push FdLeakDetectorUnitTest to device
dev_send out/rk3568/tests/unittest/hiview/fd_leak_detector/FdLeakDetectorUnitTest /data/local/tmp/FdLeakDetectorUnitTest
dev_shell "chmod 755 /data/local/tmp/FdLeakDetectorUnitTest"
echo "deployed FdLeakDetectorUnitTest to /data/local/tmp/"
