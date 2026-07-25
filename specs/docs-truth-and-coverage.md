# Documentation Truth and Coverage

Status: audit machinery implemented; human truth review in progress
(2026-07-25). This is the acceptance contract that turns ROADMAP execution-order
step 1 ("the wider repository-truth audit") from an open-ended prompt into a
checkable finish line. `scripts/audit-docs-coverage` and its generated inventory
now provide the mechanical floor; the judgment checks below still decide when
the wider audit is complete.

Implement under `skills/docs-alignment`.

## Why this exists

"Run the wider documentation audit" without a definition is another broad AI
prompt with no stable stopping point: an agent can always find one more page to
touch, or declare victory early. This spec names WHAT must be true for the docs
to be considered current, and pairs the prose contract with a generated
inventory so "is the audit done?" has a mechanical answer, not a judgment call.

A green `scripts/validate-groundwork` proves the config renders and the shipped
behavior suites pass. It does NOT prove the docs describe that behavior. This
spec covers the second gap.

## Coverage contract

Every item below is either satisfied, or listed as an explicitly deferred
enrichment with a reason (see "Blockers vs deferred"). Silence is not coverage.

1. **Implementation → command catalog.** Every user-facing command, alias, and
   helper that ships (bin scripts under `home/dot_local/bin/`, shell aliases,
   tmux/Ghostty bindings) has a row in
   `home/dot_local/share/groundwork/commands.tsv`. A shipped command with no
   catalog row is a defect; a catalog row with no shipped command is a defect.
2. **Shortcut inventory.** Shell, Git, and tmux keybindings and aliases are
   inventoried against their source of truth (the rendered dotfiles), not
   hand-listed. A binding that exists but appears in no teaching surface, or a
   documented binding that no longer exists, both fail.
3. **Canonical teaching page per surface.** Each surface (shell, Git, tmux,
   Ghostty, editor, multiplexer, dependency updates, profiles, …) has exactly one
   canonical teaching page in `docs/`. Other pages may reference it; they must not
   fork a second competing explanation.
4. **Cheat-sheet inclusion rules.** The cheat sheet includes every command a
   learner is expected to reach for in normal use, and excludes internal or
   one-time-setup commands. The rule for inclusion is stated, so additions are
   decidable rather than taste-based.
5. **Troubleshooting inclusion rules.** Every failure mode a user can hit on the
   supported install path (bootstrap, `chezmoi update`, `update-all`, the copy
   model, profiles) has a troubleshooting entry or an explicit "not documented
   because …" note.
6. **Practice / Groundwork-Twelve competency coverage.** Every competency a
   practice drill or the Groundwork Twelve claims to build maps to a teaching
   surface that actually teaches it, and vice versa — no orphaned competency, no
   drill that assumes an untaught skill.
7. **Platform / profile qualifiers.** Any instruction that is macOS-only,
   Linux-only, headless-only, or posture/role-specific carries that qualifier.
   An unqualified instruction is assumed to hold everywhere and must.
8. **Internal links and heading anchors.** No broken internal link, no anchor
   pointing at a heading that has moved or been renamed.
9. **Orphan-page detection.** No page in `docs/` is unreachable from the site's
   navigation and unreferenced by any other page (unless deliberately standalone,
   and then noted).
10. **Discovery artifacts regenerated.** `scripts/generate-discovery` has been
    run so `docs/sitemap.xml`, `docs/llms.txt`, and per-page meta descriptions
    reflect the current pages. `validate-groundwork` already fails on staleness;
    the audit must not land with these stale.

## Machine-readable inventory

- `data/docs-coverage.tsv` — one row per (surface, command/binding/competency)
  with its canonical page, cheat-sheet presence, troubleshooting presence, and
  validated platform/profile availability. Generated from rendered
  macOS/Linux dotfiles, the command catalog, practice drills, and Groundwork
  Twelve gates; never hand-edited.
- `data/docs-command-surfaces.tsv` — the reviewed metadata for every catalog
  identity: exact kind, implementation origin, supported platforms, profile
  scope, required capability, and canonical teaching page. Origins distinguish
  repo-rendered shell/Git/tmux surfaces from tmux built-ins, plugin bindings,
  executables, and external commands, so rendered-owned surfaces are checked in
  both directions. Availability is product data here, never inferred from a
  display category.
- `data/render-profiles.tsv` — the canonical representative profile matrix used
  by both `scripts/validate-groundwork` and the docs audit. It covers Apple
  Silicon and Intel macOS plus Linux, desktop/headless, role/posture, Xcode, and
  game-development differences. Every profile renders shell, Git, and tmux
  configuration; their union and per-profile receipts are compared with the
  catalog, declared origin, and availability.
- `scripts/audit-docs-coverage` — regenerates the inventory and fails on any
  contract violation above that can be checked mechanically: a public installed
  executable, rendered shell alias/function, Git alias, or explicit tmux binding
  missing from the catalog; an unmapped practice drill or Groundwork Twelve
  gate; a dangling internal link or heading fragment; a duplicate anchor; a
  public page unreachable from `index.html`; page-set drift against sitemap or
  AI discovery; stale discovery artifacts; or a stale inventory. Command and
  alias coverage requires a contiguous explicit `<code>` surface; key coverage
  requires a narrowly accepted `<kbd>` rendering. Judgment items (the
  cheat-sheet/troubleshooting inclusion calls and "teaches it well") stay human
  review, but availability and canonical-page existence are enforced.
- `tests/test_audit_docs_coverage.py` — mutation fixtures for false substrings,
  scattered tokens, profile-only surfaces, marker loss, unreachable islands,
  single-quoted links, duplicate identities/anchors/drills/gates/tmux labels,
  qualifier conflicts, missing competency pages, and stale generated output.

Groundwork Twelve has eleven numbered gates followed by a Stage 12 capstone.
The capstone is a separate competency row, not a missing Gate 12.

## Blockers vs deferred

The audit distinguishes two outcomes so "green" stays honest:

- **Release blocker** — a falsehood or a broken path: a documented command that
  does not exist, a broken install instruction, a missing platform qualifier that
  makes an instruction wrong somewhere. These block a release.
- **Deferred enrichment** — a real but non-blocking gap: a thin page that is
  accurate but could teach more, a drill that could be added. These are listed
  explicitly (with a reason) and do NOT block a release.

An audit that cannot tell these apart will either over-block (nothing ships) or
under-block (falsehoods ship). Every finding is classified as one or the other.
