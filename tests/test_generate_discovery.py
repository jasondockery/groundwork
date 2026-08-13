#!/usr/bin/env python3
"""Behavior tests for scripts/generate-discovery's fingerprint registry.

The contract under test is that sitemap freshness is a function of page bytes
and nothing else. Two properties carry that, and both are proven here against a
real generator process rather than by importing internals:

  - Determinism: identical pages produce identical artifacts no matter what git
    says. Rewriting every commit date, or having no git repository at all, must
    not move a single lastmod. That is what makes `--check` on a branch predict
    `--check` on main after a squash merge.
  - Fail closed: a registry that cannot be trusted stops the run. Recomputing
    dates from an unreadable registry would silently republish every page.
"""

import hashlib
import html
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET

REPO = pathlib.Path(__file__).resolve().parent.parent
GENERATOR = REPO / "scripts" / "generate-discovery"
SITEMAP_NS = {"sitemap": "http://www.sitemaps.org/schemas/sitemap/0.9"}
BASE = "https://jasondockery.github.io/groundwork"
MAX_DESC = 158

PAGE = (
    '<html><head><meta name="description" content="{lead}">'
    '<meta property="og:description" content="{lead}">'
    '<meta name="twitter:description" content="{lead}">'
    '<meta property="og:site_name" content="Groundwork">'
    "<title>{title}</title></head><body><div class=\"content\">"
    '<p class="lead">{lead}</p></div></body></html>'
)


def page_html(title: str, lead: str) -> str:
    return PAGE.format(title=title, lead=lead)


class Site:
    """A throwaway checkout holding the generator, docs pages, and registry."""

    def __init__(self, root: pathlib.Path) -> None:
        self.root = root
        (root / "docs").mkdir(parents=True)
        (root / "data").mkdir(parents=True)
        (root / "scripts").mkdir(parents=True)
        shutil.copy(GENERATOR, root / "scripts" / "generate-discovery")

    def write_page(self, name: str, lead: str = "A lead sentence.") -> None:
        (self.root / "docs" / name).write_text(page_html(name, lead))

    def remove_page(self, name: str) -> None:
        (self.root / "docs" / name).unlink()

    def seed_registry(self) -> None:
        """Bootstrap the registry the way the migration did: every page on disk
        recorded at its current bytes."""
        pages = {}
        for page in sorted((self.root / "docs").glob("*.html")):
            pages[page.name] = {
                "sha256": hashlib.sha256(page.read_bytes()).hexdigest(),
                "lastmod": "2020-01-01",
            }
        self.write_registry({"version": 1, "pages": pages})

    def write_registry(self, payload: object) -> None:
        path = self.root / "data" / "docs-fingerprints.json"
        if isinstance(payload, str):
            path.write_text(payload)
        else:
            path.write_text(json.dumps(payload, indent=2) + "\n")

    def registry(self) -> dict:
        return json.loads((self.root / "data" / "docs-fingerprints.json").read_text())

    def run(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run(
            [sys.executable, "scripts/generate-discovery", *args],
            cwd=self.root, capture_output=True, text=True,
        )

    def lastmods(self) -> dict[str, str]:
        root = ET.parse(self.root / "docs" / "sitemap.xml").getroot()
        return {
            url.findtext("sitemap:loc", namespaces=SITEMAP_NS): url.findtext(
                "sitemap:lastmod", namespaces=SITEMAP_NS
            )
            for url in root.findall("sitemap:url", SITEMAP_NS)
        }

    def artifacts(self) -> dict[str, str]:
        return {
            name: (self.root / name).read_text()
            for name in (
                "docs/sitemap.xml",
                "docs/llms.txt",
                "data/docs-fingerprints.json",
            )
        }

    def git(self, *args: str, **env: str) -> None:
        subprocess.run(
            ["git", *args], cwd=self.root, check=True,
            capture_output=True, text=True,
            env={**__import__("os").environ, **env},
        )

    def commit_all(self, message: str, date: str) -> None:
        self.git("add", "-A")
        self.git(
            "commit", "-qm", message,
            GIT_AUTHOR_DATE=date, GIT_COMMITTER_DATE=date,
        )

    def init_git(self) -> None:
        self.git("init", "-q")
        self.git("config", "user.email", "t@example.com")
        self.git("config", "user.name", "tester")


class DiscoveryTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.site = Site(pathlib.Path(self._tmp.name) / "repo")

    def generate(self, *args: str) -> subprocess.CompletedProcess:
        result = self.site.run(*args)
        self.assertEqual(
            result.returncode, 0,
            f"generator failed: {result.stdout}\n{result.stderr}",
        )
        return result


class TestPageLifecycle(DiscoveryTestCase):
    """Unchanged, changed, new, and deleted pages."""

    def setUp(self) -> None:
        super().setUp()
        self.site.write_page("index.html")
        self.site.write_page("guide.html")
        self.site.seed_registry()
        self.generate()

    def test_unchanged_pages_keep_their_recorded_date(self):
        before = self.site.artifacts()
        result = self.generate("--check")
        self.assertIn("already current", result.stdout)
        self.assertEqual(self.site.artifacts(), before)
        self.assertEqual(
            self.site.lastmods()[f"{BASE}/guide.html"], "2020-01-01",
            "an untouched page must keep the date its content earned",
        )

    def test_changed_content_moves_only_that_page(self):
        self.site.write_page("guide.html", lead="A different lead sentence.")
        stale = self.site.run("--check")
        self.assertEqual(stale.returncode, 1)
        self.assertIn("guide.html: content changed", stale.stdout)
        self.assertNotIn("index.html", stale.stdout.split("lastmod changes")[-1])

        self.generate()
        today = __import__("datetime").date.today().isoformat()
        self.assertEqual(self.site.lastmods()[f"{BASE}/guide.html"], today)
        self.assertEqual(
            self.site.lastmods()[f"{BASE}/"], "2020-01-01",
            "one page's edit must not restamp its neighbours",
        )

    def test_a_new_page_is_added_and_dated_today(self):
        self.site.write_page("herdr.html")
        stale = self.site.run("--check")
        self.assertEqual(stale.returncode, 1)
        self.assertIn("herdr.html: new page", stale.stdout)

        self.generate()
        today = __import__("datetime").date.today().isoformat()
        self.assertEqual(self.site.lastmods()[f"{BASE}/herdr.html"], today)
        self.assertIn("herdr.html", self.site.registry()["pages"])
        self.assertIn("herdr.html", (self.site.root / "docs" / "llms.txt").read_text())

    def test_a_deleted_page_leaves_every_artifact(self):
        self.site.remove_page("guide.html")
        stale = self.site.run("--check")
        self.assertEqual(stale.returncode, 1)
        self.assertIn("guide.html: page removed", stale.stdout)

        self.generate()
        self.assertNotIn(f"{BASE}/guide.html", self.site.lastmods())
        self.assertNotIn("guide.html", self.site.registry()["pages"])
        self.assertNotIn(
            "guide.html", (self.site.root / "docs" / "llms.txt").read_text()
        )


class TestMetadataBoundaries(DiscoveryTestCase):
    """User-authored leads stay literal and within the published size limit."""

    def test_backslashes_are_literal_across_generated_artifacts(self):
        lead = r"Open C:\Users\dev and keep \1 literal & safe."
        self.site.write_page("index.html", lead=lead)
        self.site.write_registry({"version": 1, "pages": {}})

        self.generate()
        page_path = self.site.root / "docs" / "index.html"
        page = page_path.read_text()
        escaped = html.escape(lead, quote=True)
        self.assertEqual(
            page.count(f'content="{escaped}"'),
            3,
            "all description mirrors must preserve escaped literal content",
        )
        self.assertIn(r"C:\Users\dev", page)
        self.assertIn(r"\1", page)
        self.assertIn(f": {lead}", (self.site.root / "docs" / "llms.txt").read_text())
        self.assertEqual(
            self.site.registry()["pages"]["index.html"]["sha256"],
            hashlib.sha256(page_path.read_bytes()).hexdigest(),
            "the registry digest must cover the rewritten metadata bytes",
        )
        self.assertIn(f"{BASE}/", self.site.lastmods())

        expected_page = page
        expected_artifacts = self.site.artifacts()
        self.generate("--check")
        self.generate()
        self.assertEqual(page_path.read_text(), expected_page)
        self.assertEqual(self.site.artifacts(), expected_artifacts)

    def test_unbroken_lead_reserves_space_for_the_ellipsis(self):
        lead = "x" * (MAX_DESC + 1)
        expected = "x" * (MAX_DESC - 1) + "…"
        self.site.write_page("index.html", lead=lead)
        self.site.write_registry({"version": 1, "pages": {}})

        self.generate()
        page = (self.site.root / "docs" / "index.html").read_text()
        self.assertEqual(len(expected), MAX_DESC)
        self.assertEqual(page.count(f'content="{expected}"'), 3)
        self.assertIn(f": {expected}", (self.site.root / "docs" / "llms.txt").read_text())


class TestRegistryFailsClosed(DiscoveryTestCase):
    """A registry that cannot be trusted must stop the run, in both modes."""

    def setUp(self) -> None:
        super().setUp()
        self.site.write_page("index.html")
        self.site.seed_registry()
        self.generate()
        self.good = self.site.artifacts()

    def assert_refused(self, needle: str) -> None:
        for mode in ([], ["--check"]):
            result = self.site.run(*mode)
            self.assertEqual(
                result.returncode, 1,
                f"mode {mode or ['write']} accepted a broken registry",
            )
            self.assertIn(needle, result.stderr)
        self.assertEqual(
            {k: v for k, v in self.site.artifacts().items() if k != "data/docs-fingerprints.json"},
            {k: v for k, v in self.good.items() if k != "data/docs-fingerprints.json"},
            "a refused run must not rewrite the published artifacts",
        )

    def test_unparseable_json(self):
        self.site.write_registry("{not json")
        self.assert_refused("not valid JSON")

    def test_wrong_top_level_type(self):
        self.site.write_registry(["index.html"])
        self.assert_refused("must be a JSON object")

    def test_unknown_version(self):
        self.site.write_registry({"version": 99, "pages": {}})
        self.assert_refused("Migrate the file deliberately")

    def test_missing_pages_object(self):
        self.site.write_registry({"version": 1})
        self.assert_refused("no 'pages' object")

    def test_malformed_digest(self):
        self.site.write_registry(
            {"version": 1, "pages": {"index.html": {"sha256": "XYZ", "lastmod": "2020-01-01"}}}
        )
        self.assert_refused("valid lowercase sha256")

    def test_malformed_date(self):
        digest = hashlib.sha256(b"anything").hexdigest()
        self.site.write_registry(
            {"version": 1, "pages": {"index.html": {"sha256": digest, "lastmod": "last tuesday"}}}
        )
        self.assert_refused("valid YYYY-MM-DD lastmod")

    def test_missing_registry_file(self):
        (self.site.root / "data" / "docs-fingerprints.json").unlink()
        for mode in ([], ["--check"]):
            result = self.site.run(*mode)
            self.assertEqual(result.returncode, 1)
            self.assertIn("is missing", result.stderr)


class TestIndependentOfGitHistory(DiscoveryTestCase):
    """The defect this design replaces: dates that moved when history moved."""

    def setUp(self) -> None:
        super().setUp()
        self.site.write_page("index.html")
        self.site.write_page("guide.html")
        self.site.seed_registry()
        self.generate()
        self.expected = self.site.artifacts()

    def test_no_git_repository_at_all(self):
        self.assertFalse((self.site.root / ".git").exists())
        result = self.generate("--check")
        self.assertIn("already current", result.stdout)

    def test_a_squash_style_rewrite_moves_no_date(self):
        """Commit the pages one day, then replace that history with a single
        commit dated later — exactly what squash-merging a PR does. Under the
        old commit-date design every page's lastmod moved; here nothing does."""
        self.site.init_git()
        self.site.commit_all("branch work", "2020-06-01T12:00:00 +0000")
        self.site.git("checkout", "-q", "--orphan", "squashed")
        self.site.commit_all("squashed onto a later day", "2026-08-13T00:38:00 +0700")

        result = self.site.run("--check")
        self.assertEqual(
            result.returncode, 0,
            f"a squash-style rewrite made the artifacts stale: {result.stdout}",
        )
        self.assertEqual(self.site.artifacts(), self.expected)

    def test_a_depth_one_clone_agrees_with_a_full_one(self):
        self.site.init_git()
        self.site.commit_all("first", "2020-06-01T12:00:00 +0000")
        self.site.write_page("guide.html", lead="An edited lead sentence.")
        self.generate()
        self.site.commit_all("second", "2020-06-02T12:00:00 +0000")
        full = self.site.artifacts()

        shallow = pathlib.Path(self._tmp.name) / "shallow"
        subprocess.run(
            ["git", "clone", "--quiet", "--depth", "1",
             f"file://{self.site.root}", str(shallow)],
            check=True, capture_output=True, text=True,
        )
        clone = Site.__new__(Site)
        clone.root = shallow
        self.assertEqual(
            subprocess.run(
                ["git", "rev-parse", "--is-shallow-repository"],
                cwd=shallow, capture_output=True, text=True,
            ).stdout.strip(),
            "true",
            "the fixture clone must actually be shallow for this to prove anything",
        )
        result = clone.run("--check")
        self.assertEqual(
            result.returncode, 0,
            f"depth-1 clone disagreed with the full checkout: {result.stdout}",
        )
        self.assertEqual(clone.artifacts(), full)


if __name__ == "__main__":
    unittest.main(verbosity=0)
