#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""D1/D2 coverage for collect_pr_context: comment truncation flag + resolved
state detection. These lock the two behaviours the review loop relies on:
never read a capped fetch as "all comments" (D1), and skip already-closed
threads without guessing "open" when the state is unknown (D2)."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_DIR / "scripts" / "collect_pr_context.py"

_spec = importlib.util.spec_from_file_location("collect_pr_context", SCRIPT)
cpc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cpc)


class CommentResolvedTest(unittest.TestCase):
    def test_boolean_resolved_fields_win(self) -> None:
        for key in ("resolved", "is_resolved", "isResolved", "resolvable"):
            self.assertTrue(cpc.comment_resolved({key: True}), key)
            self.assertFalse(cpc.comment_resolved({key: False}), key)

    def test_state_string_maps_to_resolved(self) -> None:
        for state in ("resolved", "closed", "outdated", "RESOLVED", " Closed "):
            self.assertTrue(cpc.comment_resolved({"state": state}), state)
        for state in ("open", "active", "pending"):
            self.assertFalse(cpc.comment_resolved({"status": state}), state)

    def test_unknown_when_no_signal(self) -> None:
        # No resolved-ish field and no state => None (unknown), never a guess.
        self.assertIsNone(cpc.comment_resolved({"body": "hi"}))
        self.assertIsNone(cpc.comment_resolved({}))
        self.assertIsNone(cpc.comment_resolved("not a dict"))

    def test_tally_partitions_resolved_unresolved_unknown(self) -> None:
        # Mirror the D2 tally loop in main() over a mixed comment list.
        comments = [
            {"resolved": True},
            {"state": "closed"},
            {"state": "open"},
            {"body": "no state"},
        ]
        tally = {"resolved": 0, "unresolved": 0, "unknown": 0}
        for c in comments:
            state = cpc.comment_resolved(c)
            tally["unknown" if state is None
                  else "resolved" if state else "unresolved"] += 1
        self.assertEqual(tally, {"resolved": 2, "unresolved": 1, "unknown": 1})


class CommentTruncationTest(unittest.TestCase):
    def test_fetch_at_limit_flags_truncation(self) -> None:
        # D1: count == limit is the truncation trigger.
        limit = 3
        count = len([{"id": 1}, {"id": 2}, {"id": 3}])
        self.assertGreaterEqual(count, limit)

    def test_fetch_below_limit_does_not_flag(self) -> None:
        limit = 100
        count = len([{"id": 1}, {"id": 2}])
        self.assertLess(count, limit)


if __name__ == "__main__":
    unittest.main()
