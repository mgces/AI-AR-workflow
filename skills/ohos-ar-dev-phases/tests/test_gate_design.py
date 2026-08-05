#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for check_design_sections (P1a design gate)."""
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts", "lib"))
import gatelib as gl  # noqa: E402

GOOD = """# AR 设计文档

## 目标组件
base/hiviewdfx/hiview,负责 xxx。

## 详细功能需求
1. 需求一
2. 需求二

## 完整代码框架
### 文件清单
- src/manager.cpp
- include/manager.h
### 每文件功能
manager.cpp 负责调度;manager.h 声明接口。
### 代码框架
```
class Manager { void Run(); };
```

## 完整测试框架
使用 ohos_unittest,test/ 目录下组织。

## 需测试的功能点
- 功能点一
- 功能点二

## 真机测试用例构造
在真机上通过 hdc shell 触发,注入 nonce 到 hilog。

## DFX设计
可观测性:组件成功路径打 hilog marker,marker 来自运行时日志;可测试/可维护:接口分层、日志分级。
"""


class TestDesignSections(unittest.TestCase):
    def test_all_present(self):
        ok, per, missing = gl.check_design_sections(GOOD)
        self.assertTrue(ok, missing)
        self.assertEqual(missing, [])

    def test_missing_section(self):
        text = GOOD.replace("## 真机测试用例构造\n在真机上通过 hdc shell 触发,注入 nonce 到 hilog。", "")
        ok, per, missing = gl.check_design_sections(text)
        self.assertFalse(ok)
        self.assertIn("真机测试用例构造", missing)

    def test_code_framework_missing_anchors(self):
        # code framework heading present but no file-list / per-file / skeleton
        text = GOOD.replace(
            "### 文件清单\n- src/manager.cpp\n- include/manager.h\n### 每文件功能\n"
            "manager.cpp 负责调度;manager.h 声明接口。\n### 代码框架\n```\nclass Manager { void Run(); };\n```",
            "随便写点东西没有子锚点")
        ok, per, missing = gl.check_design_sections(text)
        self.assertFalse(ok)
        self.assertIn("完整代码框架", missing)

    def test_empty_body_section(self):
        text = GOOD.replace("## 目标组件\nbase/hiviewdfx/hiview,负责 xxx。",
                            "## 目标组件\n")
        ok, per, missing = gl.check_design_sections(text)
        self.assertFalse(ok)
        self.assertIn("目标组件", missing)


if __name__ == "__main__":
    unittest.main()
