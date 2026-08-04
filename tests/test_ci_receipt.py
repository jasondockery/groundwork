"""Receipt honesty contracts: a receipt must never claim more than was observed."""

from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))

from ci_receipt import (  # noqa: E402
    ReceiptError,
    common_envelope,
    inline_code,
    validate_receipt,
)


REPO = pathlib.Path(__file__).resolve().parents[1]


def _snapshot(fingerprint: str) -> dict:
    """A structurally valid tree snapshot with a chosen fingerprint."""
    return {
        "baseHead": "0" * 40,
        "treeFingerprint": f"sha256:{fingerprint * 64}"[:71],
        "identityScope": "HEAD, Git index, and Git-visible working-tree content",
        "ignoredArtifactState": {
            "policy": "forbidden",
            "checkedPaths": ["node_modules", ".pnpm-store"],
            "presentPaths": [],
        },
        "fingerprintInput": {
            "pathCount": 1,
            "contentBytes": 1,
            "gitOutputBytes": 1,
            "pathLimit": 10,
            "contentByteLimit": 10,
            "gitOutputByteLimit": 10,
        },
        "workingTree": {
            "staged": False,
            "stagedPathCount": 0,
            "unstaged": False,
            "unstagedPathCount": 0,
            "untrackedPathCount": 0,
        },
    }


def _envelope(source_after, complete):
    return common_envelope(
        repo=REPO,
        receipt_kind="ci-job",
        result="passed",
        started_epoch=1,
        finished_epoch=2,
        platform_os="linux",
        platform_image="ubuntu-24.04",
        platform_arch="X64",
        source_before=_snapshot("a"),
        source_after=source_after,
        tree_observation_complete=complete,
    )["source"]


class TreeObservationHonesty(unittest.TestCase):
    """An unobserved final tree is unknown, never 'unchanged'."""

    def test_complete_flag_with_missing_snapshot_is_unknown(self):
        # The defect: the flag said complete, no final snapshot existed, and the
        # receipt substituted `before` and reported the tree as unchanged.
        source = _envelope(None, True)
        self.assertIsNone(source["treeChangedDuringValidation"])
        self.assertIsNone(source["treeFingerprintAfter"])

    def test_incomplete_flag_with_missing_snapshot_is_unknown(self):
        source = _envelope(None, False)
        self.assertIsNone(source["treeChangedDuringValidation"])
        self.assertIsNone(source["treeFingerprintAfter"])

    def test_equal_real_snapshots_report_unchanged(self):
        source = _envelope(_snapshot("a"), True)
        self.assertIs(source["treeChangedDuringValidation"], False)
        self.assertEqual(source["treeFingerprintAfter"], source["treeFingerprint"])

    def test_differing_real_snapshots_report_changed(self):
        source = _envelope(_snapshot("b"), True)
        self.assertIs(source["treeChangedDuringValidation"], True)
        self.assertNotEqual(source["treeFingerprintAfter"], source["treeFingerprint"])

    def test_unknown_observation_still_validates(self):
        # The schema must accept the honest "unknown" shape, or the fix would
        # only move the failure downstream.
        envelope = common_envelope(
            repo=REPO,
            receipt_kind="ci-job",
            result="passed",
            started_epoch=1,
            finished_epoch=2,
            platform_os="linux",
            platform_image="ubuntu-24.04",
            platform_arch="X64",
            source_before=_snapshot("a"),
            source_after=None,
            tree_observation_complete=True,
        )
        envelope["body"] = {
            "scope": "s",
            "proofType": "p",
            "cacheState": "not-applicable",
            "jobDurationSeconds": 1,
            "jobBudgetSeconds": None,
            "jobBudgetState": "not-set",
            "workflowSafetyTimeoutSeconds": None,
            "phases": [],
            "facts": {},
            "commands": {"inspect": "gh run view"},
        }
        validate_receipt(envelope, expected_kind="ci-job")

    def test_schema_rejects_a_changed_claim_without_a_final_fingerprint(self):
        envelope = _envelope(_snapshot("a"), True)
        envelope["treeFingerprintAfter"] = None
        with self.assertRaises(ReceiptError):
            validate_receipt({"source": envelope}, expected_kind="ci-job")


class InlineCodeRendering(unittest.TestCase):
    """A value must never break out of its Markdown code span."""

    def test_plain_value(self):
        self.assertEqual(inline_code("plain"), "`plain`")

    def test_backticks_widen_the_fence(self):
        # A backslash does not escape a backtick inside a code span; the fence
        # has to be longer than the longest run it contains.
        self.assertEqual(inline_code("has`tick"), "``has`tick``")
        self.assertEqual(inline_code("a``b"), "```a``b```")

    def test_leading_and_trailing_backticks_are_padded(self):
        self.assertEqual(inline_code("`lead"), "`` `lead ``")
        self.assertEqual(inline_code("trail`"), "`` trail` ``")

    def test_surrounding_whitespace_survives(self):
        # CommonMark strips one leading and one trailing space when BOTH are
        # present, so a value that already has them needs its own padding.
        self.assertEqual(inline_code(" x "), "`  x  `")


if __name__ == "__main__":
    unittest.main()
