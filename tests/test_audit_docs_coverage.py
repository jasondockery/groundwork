#!/usr/bin/env python3
"""Adversarial tests for scripts/audit-docs-coverage."""

from __future__ import annotations

import importlib.machinery
import importlib.util
import pathlib
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
_audit_path = str(ROOT / "scripts/audit-docs-coverage")
_spec = importlib.util.spec_from_file_location(
    "audit_docs_coverage",
    _audit_path,
    loader=importlib.machinery.SourceFileLoader("audit_docs_coverage", _audit_path),
)
audit = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(audit)

MARKER = '<meta property="og:site_name" content="Groundwork">'


def page(body: str, marker: str = MARKER) -> str:
    return f"<!doctype html><html><head>{marker}</head><body>{body}</body></html>"


class ExplicitSurfaceTests(unittest.TestCase):
    def test_short_alias_does_not_match_inside_longer_word(self) -> None:
        document = audit.parse_html("<p>tools catalog</p><code>tools</code><code>catalog</code>")
        self.assertFalse(audit.item_is_mentioned("ls", "alias", document))
        self.assertFalse(audit.item_is_mentioned("cat", "alias", document))
        self.assertFalse(audit.item_is_mentioned("y", "function", document))

    def test_alias_matches_contiguous_code_surface(self) -> None:
        document = audit.parse_html("<p>List it:</p><code>ls -lah</code>")
        self.assertTrue(audit.item_is_mentioned("ls", "alias", document))

    def test_scattered_command_tokens_do_not_count(self) -> None:
        document = audit.parse_html(
            "<p><code>git</code> is useful.</p>"
            "<p>You can <code>commit</code> work.</p>"
            "<p>Write a <code>message</code>.</p>"
        )
        self.assertFalse(
            audit.item_is_mentioned("git commit -m <message>", "command", document)
        )

    def test_literal_optional_flag_is_not_stripped(self) -> None:
        base_only = audit.parse_html("<p><code>groundwork-distro</code></p>")
        with_flag = audit.parse_html(
            "<p><code>groundwork-distro --family</code></p>"
        )
        self.assertFalse(
            audit.item_is_mentioned(
                "groundwork-distro [--family]", "command", base_only
            )
        )
        self.assertTrue(
            audit.item_is_mentioned(
                "groundwork-distro [--family]", "command", with_flag
            )
        )

    def test_tmux_uppercase_and_lowercase_bindings_are_distinct(self) -> None:
        lower = audit.parse_html(
            "<p><span class='keys'><kbd>prefix</kbd>"
            "<kbd>h</kbd>/<kbd>j</kbd>/<kbd>k</kbd>/<kbd>l</kbd></span></p>"
        )
        upper = audit.parse_html(
            "<p><span class='keys'><kbd>prefix</kbd>"
            "<kbd>H</kbd><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd></span></p>"
        )
        self.assertTrue(audit.item_is_mentioned("Ctrl+a then h", "key", lower))
        self.assertFalse(audit.item_is_mentioned("Ctrl+a then H", "key", lower))
        self.assertTrue(audit.item_is_mentioned("Ctrl+a then H", "key", upper))
        self.assertFalse(audit.item_is_mentioned("Ctrl+a then h", "key", upper))

    def test_pane_split_cluster_covers_both_keys(self) -> None:
        cluster = audit.parse_html(
            "<p><span class='keys'><kbd>prefix</kbd> <kbd>|</kbd> / <kbd>-</kbd></span></p>"
        )
        self.assertTrue(audit.item_is_mentioned("Ctrl+a then |", "key", cluster))
        self.assertTrue(audit.item_is_mentioned("Ctrl+a then -", "key", cluster))
        bare_dash = audit.parse_html("<p>Use a dash (-) to split down.</p>")
        self.assertFalse(audit.item_is_mentioned("Ctrl+a then -", "key", bare_dash))

    def test_prefix_punctuation_requires_the_exact_key(self) -> None:
        question = audit.parse_html(
            "<p><kbd>Ctrl</kbd><kbd>a</kbd> <kbd>?</kbd></p>"
        )
        copy_mode = audit.parse_html(
            "<p><kbd>Ctrl</kbd><kbd>a</kbd> <kbd>[</kbd></p>"
        )
        prefix_only = audit.parse_html(
            "<p><kbd>Ctrl</kbd><kbd>a</kbd> is the prefix.</p>"
            "<p>What can it do? Read the [guide].</p>"
        )
        self.assertTrue(audit.item_is_mentioned("Ctrl+a then ?", "key", question))
        self.assertTrue(audit.item_is_mentioned("Ctrl+a then [", "key", copy_mode))
        self.assertFalse(audit.item_is_mentioned("Ctrl+a then ?", "key", prefix_only))
        self.assertFalse(audit.item_is_mentioned("Ctrl+a then [", "key", prefix_only))

    def test_short_copy_key_requires_kbd_in_copy_mode_context(self) -> None:
        prose_only = audit.parse_html("<p>In copy mode, y copies the selection.</p>")
        explicit = audit.parse_html(
            "<p>In copy mode, <kbd>y</kbd> copies the selection.</p>"
        )
        self.assertFalse(
            audit.item_is_mentioned("tmux copy-mode-vi: y", "key", prose_only)
        )
        self.assertTrue(
            audit.item_is_mentioned("tmux copy-mode-vi: y", "key", explicit)
        )


class CatalogAndReceiptTests(unittest.TestCase):
    def test_internal_karabiner_postflight_stays_out_of_learner_catalog(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            bin_dir = root / "home/dot_local/bin"
            bin_dir.mkdir(parents=True)
            (bin_dir / "executable_groundwork-karabiner-postflight").touch()
            profiles = [{"name": "darwin", "os": "darwin", "headless": False}]
            audit.validate_source_catalog_parity([], {}, profiles, {}, root)

    def test_duplicate_catalog_item_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            path = pathlib.Path(temp) / "commands.tsv"
            path.write_text(
                "shell\tls\talias\tList files.\n"
                "shell\tls\talias\tList files again.\n"
            )
            with self.assertRaisesRegex(audit.AuditError, "duplicate catalog item"):
                audit.read_catalog(path)

    def test_profile_only_alias_missing_from_catalog_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            (root / "home/dot_local/bin").mkdir(parents=True)
            profiles = [{"name": "darwin", "os": "darwin", "headless": False}]
            with self.assertRaisesRegex(audit.AuditError, "alias profile-only"):
                audit.validate_source_catalog_parity(
                    [],
                    {},
                    profiles,
                    {("alias", "profile-only"): {"darwin"}},
                    root,
                )

    def test_declared_availability_must_match_render_receipts(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            (root / "home/dot_local/bin").mkdir(parents=True)
            rows = [
                {
                    "category": "shell",
                    "item": "foo",
                    "kind": "alias",
                    "description": "Fixture alias.",
                }
            ]
            metadata = {
                ("alias", "foo"): {
                    "origin": "shell-alias",
                    "platforms": "all",
                    "profiles": "all",
                    "requires": "-",
                    "canonical_page": "shell.html",
                }
            }
            profiles = [
                {"name": "darwin", "os": "darwin", "headless": False},
                {"name": "linux", "os": "linux", "headless": False},
            ]
            with self.assertRaisesRegex(audit.AuditError, "declared availability"):
                audit.validate_source_catalog_parity(
                    rows,
                    metadata,
                    profiles,
                    {("alias", "foo"): {"darwin"}},
                    root,
                )

    def test_removed_git_alias_or_tmux_binding_is_stale(self) -> None:
        fixtures = [
            (
                {
                    "category": "git",
                    "item": "git recent",
                    "kind": "command",
                    "description": "Recent branches.",
                },
                "git-alias",
                "stale git-alias git recent",
            ),
            (
                {
                    "category": "tmux",
                    "item": "Ctrl+a then X",
                    "kind": "key",
                    "description": "Fixture binding.",
                },
                "tmux-binding",
                "stale key Ctrl\\+a then X",
            ),
        ]
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            (root / "home/dot_local/bin").mkdir(parents=True)
            profiles = [{"name": "darwin", "os": "darwin", "headless": False}]
            for row, origin, message in fixtures:
                with self.subTest(origin=origin):
                    identity = (row["kind"], row["item"])
                    metadata = {
                        identity: {
                            "origin": origin,
                            "platforms": "all",
                            "profiles": "all",
                            "requires": "-",
                            "canonical_page": "fixture.html",
                        }
                    }
                    with self.assertRaisesRegex(audit.AuditError, message):
                        audit.validate_source_catalog_parity(
                            [row], metadata, profiles, {}, root
                        )

    def test_duplicate_normalized_tmux_binding_fails(self) -> None:
        with self.assertRaisesRegex(audit.AuditError, "duplicate normalized"):
            audit.parse_tmux_bindings(
                "bind R display-message first\nbind R display-message second\n"
            )


class SiteGraphTests(unittest.TestCase):
    def test_page_without_site_marker_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            docs = pathlib.Path(temp)
            (docs / "index.html").write_text(page("<main></main>", marker=""))
            with self.assertRaisesRegex(audit.AuditError, "missing Groundwork site marker"):
                audit.validate_site_graph(docs, set(), check_discovery=False)

    def test_unreachable_linked_island_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            docs = pathlib.Path(temp)
            (docs / "index.html").write_text(page("<a href='index.html'>Home</a>"))
            (docs / "hidden-a.html").write_text(
                page("<a href='hidden-b.html'>Hidden B</a>")
            )
            (docs / "hidden-b.html").write_text(
                page("<a href='hidden-a.html'>Hidden A</a>")
            )
            with self.assertRaisesRegex(audit.AuditError, "unreachable from index"):
                audit.validate_site_graph(docs, set(), check_discovery=False)

    def test_single_quotes_query_fragment_and_asset_are_parsed(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            docs = pathlib.Path(temp)
            (docs / "asset.svg").write_text("<svg></svg>")
            (docs / "index.html").write_text(
                page("<a href='./other.html?view=1#there'>Other</a>")
            )
            (docs / "other.html").write_text(
                page("<h2 id='there'>There</h2><img src='asset.svg'>")
            )
            documents = audit.validate_site_graph(docs, set(), check_discovery=False)
            self.assertEqual(set(documents), {"index.html", "other.html"})

    def test_missing_asset_fails_including_link_hrefs(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            docs = pathlib.Path(temp)
            (docs / "index.html").write_text(
                page("<img src='gone.svg'><a href='index.html'>Home</a>")
            )
            with self.assertRaisesRegex(audit.AuditError, "missing asset gone.svg"):
                audit.validate_site_graph(docs, set(), check_discovery=False)
        with tempfile.TemporaryDirectory() as temp:
            docs = pathlib.Path(temp)
            (docs / "index.html").write_text(
                "<!doctype html><html><head>"
                + MARKER
                + "<link rel='stylesheet' href='assets/style.css'>"
                + "</head><body><a href='index.html'>Home</a></body></html>"
            )
            with self.assertRaisesRegex(audit.AuditError, "missing asset assets/style.css"):
                audit.validate_site_graph(docs, set(), check_discovery=False)

    def test_duplicate_ids_fail(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            docs = pathlib.Path(temp)
            (docs / "index.html").write_text(
                page("<h2 id='same'>One</h2><h3 id='same'>Two</h3>")
            )
            with self.assertRaisesRegex(audit.AuditError, "duplicate id"):
                audit.validate_site_graph(docs, set(), check_discovery=False)


class CompetencyAndInventoryTests(unittest.TestCase):
    def test_duplicate_practice_title_fails(self) -> None:
        fixture = (
            '<div class="drill"><h3>Shell drill</h3></div>'
            '<div class="drill"><h3>Shell drill</h3></div>'
        )
        with self.assertRaisesRegex(audit.AuditError, "duplicate values"):
            audit.parse_practice_drills(fixture)

    def test_duplicate_gate_number_fails(self) -> None:
        fixture = (
            "<p><strong>Gate check 1</strong> First.</p>"
            "<p><strong>Gate check 1:</strong> Second.</p>"
        )
        with self.assertRaisesRegex(audit.AuditError, "duplicate values"):
            audit.parse_twelve_gates(fixture)

    def test_missing_competency_page_fails(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(audit.AuditError, "does not exist"):
                audit.validate_competency_page(
                    pathlib.Path(temp),
                    {},
                    "missing.html",
                    "shell",
                    "Practice drill: missing",
                )

    def test_stale_inventory_fails(self) -> None:
        with self.assertRaisesRegex(audit.AuditError, "is stale"):
            audit.check_inventory("old\n", "new\n")


if __name__ == "__main__":
    unittest.main()
