#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for the P1 DFX design section (可测试/可维护/可观测 left-shift).

A weak model kept reaching P6 only to discover the component emits no hilog and
then questioned the gate. Root cause: observability was never designed. P1 now
REQUIRES a DFX section whose body actually discusses observability(hilog/日志)
AND testability/maintainability — a bare heading is not enough (anchor未命中).
"""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402

BASE = """# AR 设计文档

## 目标组件
base/hiviewdfx/hiview。

## 详细功能需求
需求一。

## 完整代码框架
### 文件清单
- src/manager.cpp
### 每文件功能
manager.cpp 负责调度。
### 代码框架
```
class Manager { void Run(); };
```

## 完整测试框架
ohos_unittest。

## 需测试的功能点
功能点一。

## 真机测试用例构造
真机 hdc 触发,注入 nonce 到 hilog。
"""

DFX_OK = ("\n## DFX设计\n可观测性:组件成功路径打 hilog marker;"
          "可测试性/可维护性:接口分层、日志分级。\n")


class TestDfxSection(unittest.TestCase):
    def test_missing_dfx_section_fails(self):
        ok, per, missing = gl.check_design_sections(BASE)
        self.assertFalse(ok)
        self.assertIn("DFX设计", missing)

    def test_dfx_heading_without_body_anchors_fails(self):
        # Heading present but body says nothing about observability/testability.
        text = BASE + "\n## DFX设计\n待补充。\n"
        ok, per, missing = gl.check_design_sections(text)
        self.assertFalse(ok)
        self.assertIn("DFX设计", missing)

    def test_dfx_body_needs_both_anchors(self):
        # Talks observability but not testability/maintainability -> still fail.
        text = BASE + "\n## DFX设计\n可观测性:打 hilog。\n"
        ok, per, missing = gl.check_design_sections(text)
        self.assertFalse(ok)
        self.assertIn("DFX设计", missing)

    def test_complete_seven_sections_pass(self):
        ok, per, missing = gl.check_design_sections(BASE + DFX_OK)
        self.assertTrue(ok, missing)
        self.assertEqual(missing, [])


if __name__ == "__main__":
    unittest.main()
