# Documentation Truth and Coverage

Status: proposed (2026-07-24). Not yet implemented — this is the acceptance
contract that turns ROADMAP execution-order step 1 ("the wider repository-truth
audit") from an open-ended prompt into a checkable finish line. Nothing here
ships until the audit and its machine-readable inventory land.

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

## Machine-readable inventory (planned)

- `data/docs-coverage.tsv` — one row per (surface, command/binding/competency)
  with its canonical page, cheat-sheet presence, troubleshooting presence, and
  platform/profile qualifier. Generated from the rendered dotfiles and the
  command catalog, not hand-maintained.
- `scripts/audit-docs-coverage` — regenerates the inventory and fails on any
  contract violation above that can be checked mechanically (missing catalog
  rows, dangling links, orphan pages, stale discovery artifacts, a command with
  no canonical page). Judgment items (inclusion-rule calls, "teaches it well")
  stay human review, but the mechanical floor is enforced in CI.

Until `scripts/audit-docs-coverage` exists, the audit is done by hand against
this contract and its completion is asserted, not proven — so building the script
is part of closing step 1, not a later nicety.

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
