#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""Tests for refresh_todo — design-derived, phase-aware todo.md."""
import json
import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "scripts"))
import refresh_todo as rt  # noqa: E402

DESIGN = """# d
## 完整代码框架
### 文件清单
- src/manager.cpp
- include/manager.h
## 需测试的功能点
- 边界条件处理
- 并发释放只一次
## 真机测试用例构造
- hdc 注入 nonce 触发
"""


class TestRefreshTodo(unittest.TestCase):
    def _state(self, current, passed=()):
        return {"run_id": "r1", "current_phase": current,
                "phases": [{"id": i, "name": "p%d" % i,
                            "status": "passed" if i in passed else "pending"}
                           for i in range(7)]}

    def test_with_design_has_items(self):
        out = rt.build_todo(self._state(1), DESIGN, [])
        self.assertIn("实现 `src/manager.cpp`", out)
        self.assertIn("覆盖: 边界条件处理", out)
        self.assertIn("真机验证: hdc 注入 nonce 触发", out)
        self.assertIn("当前阶段: **P1**", out)

    def test_passed_phase_checked(self):
        out = rt.build_todo(self._state(2, passed=(0, 1)), DESIGN, [])
        self.assertIn("- [x] P1 设计固化", out)
        self.assertIn("- [ ] P2 编译验证  ⬅ 当前", out)

    def test_no_design_degrades(self):
        out = rt.build_todo(self._state(0), None, [])
        self.assertIn("legacy run", out)
        self.assertIn("阶段进度", out)
        # must not crash and must still list phases
        self.assertIn("P0 环境初始化", out)

    def test_main_writes_file(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        pdir = tmp.name
        os.makedirs(os.path.join(pdir, "evidence", "phase1"))
        with open(os.path.join(pdir, "pipeline.json"), "w") as f:
            json.dump(self._state(1), f)
        with open(os.path.join(pdir, "evidence/phase1/AR_design.md"), "w") as f:
            f.write(DESIGN)
        sys.argv = ["refresh_todo.py", "--pipeline-dir", pdir]
        rt.main()
        with open(os.path.join(pdir, "todo.md")) as f:
            self.assertIn("实现 `src/manager.cpp`", f.read())


if __name__ == "__main__":
    unittest.main()
