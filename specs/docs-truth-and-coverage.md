# Documentation Truth and Coverage

Status: audit machinery implemented; human truth review complete (2026-07-26).
Release blockers found by the review are fixed in the same tranche that
records this section (pending v1.8.0); the remaining gaps are recorded under
"Human truth review — findings" below as deferred enrichments with reasons. This is the acceptance contract that turns ROADMAP execution-order
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
    run so `docs/sitemap.xml`, `docs/llms.txt`, `data/docs-fingerprints.json`,
    and per-page meta descriptions reflect the current pages.
    `validate-groundwork` already fails on staleness; the audit must not land
    with these stale.

    Sitemap `lastmod` is a function of page content, never of git. Each page's
    SHA-256 and the date its content last changed are recorded in the versioned
    registry `data/docs-fingerprints.json`; a date moves only when that digest
    moves. Two consequences are contractual, not incidental. Rewriting history
    — a squash merge, a rebase, an amend — cannot change a single date, so
    `--check` on a branch gives the verdict main will give after the merge.
    And git history is not read, so a depth-1 clone is exactly as correct as a
    full one. A registry that is missing, unparseable, of an unknown version,
    or carrying a malformed digest or date stops the run; recomputing dates
    from an untrusted registry would silently republish every page.

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

## Human truth review — findings (2026-07-25/26)

The judgment half of the contract (cheat-sheet inclusion, troubleshooting
completeness, competency teaching quality) was reviewed against the rendered
pages, the generated inventory, and the shipped implementations, then the
resulting diff went through a second external review pass. Every finding is
classified per "Blockers vs deferred". Zero blockers remain open in this
tranche.

### Release blockers — fixed

- Platform-neutral cheat-sheet sections carried macOS-only commands with no
  qualifier (`open .`, `obsidian-plugins`, `browser-extensions`,
  `raycast-extensions`, `defaultbrowser`). Fixed: `(macOS)` markers added.
- The cheat sheet taught `Ctrl+A` as "line start" with no tmux caveat, while
  the adjacent callout implied shell keys are unaffected inside tmux — wrong in
  the default posture, where `Ctrl+A` is the prefix. Fixed: callout now states
  the exception and the `Ctrl+A Ctrl+A` escape.
- Gate 9 tests explaining HTTP request/response and status codes, but no page
  taught them (`web-dev.html` covered `fetch`/JSON only; Stage 9 was the only
  stage with no Reading line). Fixed: "The web underneath" section added to
  `web-dev.html` (request/response, status codes, localhost/ports, `curl`,
  minimal local serve, with a try-it) and Stage 9 now points at it.
- Gate 4 tests explaining HEAD and undoing a bad commit; Session 19 names
  `git revert` and "when reset is safe" as New material — none were taught.
  Fixed: `git.html` now defines HEAD, teaches `revert` and `reset --soft`
  (with what each does and does not touch), and drill 5 recovers a bad commit.
- The Twelve's session template claimed all New material is "a section of a
  Groundwork page"; false for stages whose material is a named external
  resource. Fixed: reworded to "or the session's named resource".
- `dependencies.html` said an old mise makes Groundwork "skip the runtime
  stage"; the runner actually fails closed and stops the whole run. Fixed:
  wording now matches the fail-closed behavior.
- (Second pass) The new teaching server example ran `python3 -m http.server`
  unbound, which listens on every interface — on shared Wi-Fi that exposes
  the folder to other machines. Fixed: `--bind 127.0.0.1` in the command and
  drill, with the exposure named in prose.
- (Second pass) Truth-wording corrections: HEAD is defined as the checked-out
  commit ("normally the tip of your current branch", with the detached state
  named) rather than flatly "the tip of the branch"; `revert` is described as
  never rewriting existing commits rather than leaving "history untouched";
  the drill uses `git revert --no-edit HEAD` so beginners aren't dropped into
  an editor; prefix-twice is described as sending the literal key through to
  the shell; status codes are taught as `2xx`/`3xx`/`4xx`/`5xx` families, and
  Session 42's "not 200" became "not a success".
- (Second pass, promoted from deferred) The cheat-sheet rule now states the
  setup-helpers carve-out; the "Open Ghostty and read the prompt" drill maps
  to `getting-started.html`, which teaches it; the troubleshooting page
  carries the "command's own message is the fix" note for the self-contained
  refusals; `git add -p` is taught hunk-by-hunk (with `git diff --cached`)
  and drilled on `git.html`; and the five inventory misses were closed in the
  contract's own terms — the `--open` rows now render the full invocation,
  the copy-mode row names copy mode, and the pane-split `| -` cluster joined
  the audit's accepted-cluster whitelist (with a pinning test) alongside the
  existing `h/j/k/l` and `< >` forms. The conservative matcher itself was
  deliberately not loosened: `test_literal_optional_flag_is_not_stripped`
  pins that a bracketed optional flag never matches a bare command.

Reviewed and refuted (recorded so it is not re-flagged): the lazygit
`z / Z — undo / redo` rows on `cheatsheet.html`, `lazygit.html`, and
`git.html` are correct — verified against the shipped lazygit default config
(`undo: z`, `redo: Z`), which Groundwork's managed config does not override.

### Deferred enrichments — real gaps, no falsehoods, non-blocking

Cheat sheet (accurate entries, absence or taste — not falsehood):

- Daily-recall commands inside the stated rule but absent as sheet rows:
  `git diff`, `git add -p` (now taught and drilled on `git.html`, but the
  sheet still shows only `git add .`), `tmux new -s` / `tmux attach -t`, and
  the repo-navigation keys (prefix `Shift+R` / `Shift+G`).

Troubleshooting (every runtime message involved is self-contained — the user
is confused at worst, never stranded):

- A quick-triage row for chezmoi's `[y,n,a,q,d]` overwrite prompt, which the
  page's own universal remedy (`chezmoi apply` / `chezmoi update`) can raise
  on a hand-edited managed file.
- Rows for the remaining cases outside the "command's own message" note: a
  source repo on an untracked branch/detached HEAD under bare
  `chezmoi update`, and the copy-model cases (`prefix+Y` with no marks, the
  tmux 3.6 floor) — the latter belong to the ROADMAP copy-model teaching set.

Competency coverage (taught somewhere or accurately delegated — mapping
quality, not falsehood):

- Gate 7's Python teaching is deliberately delegated to the external ladder on
  `development.html`; record that delegation in coverage notes or add a small
  first-Python / read-a-traceback section.
- Gate 10 is taught across `workflow.html`, `editors-ai.html`, `specs.html`,
  and `ai-budget.html`; cross-link at the gate-relevant points or note
  multi-page coverage in the inventory.
- Gate 1 is composite (command-line, getting-started, shell, tmux, git); note
  composite coverage or split the row.
- Audit machinery strictness (2026-07-27 external review): the shell/tmux/git
  exhaustiveness parsers accept one syntax per surface (`bind` but not
  `bind-key`, one alias form, the exact `[alias]` header), so a
  plausible-but-unrecognized future form escapes the audit silently — consider
  failing on unrecognized-but-plausible forms; separately, any `name`
  attribute counts as an anchor identity, which would false-positive a valid
  radio group sharing a name. Green today; neither is a falsehood.
- Catalog-description parity: the audit requires a contiguous `<code>` surface
  for each catalog item but never compares the page's prose description with
  the catalog's, so a corrected catalog claim can coexist with the stale
  wording on a page (caught once by review on `gh auth setup-git`).
- The terminal copy-model set is already tracked at ROADMAP → "Terminal copy
  model": competency rows for spec Gates A/B, copy-model teaching on
  `keyboard.html` / `command-line.html` / `troubleshooting.html` /
  `setup.html` / game-dev-learn Module 5, copy-mode paging keys on
  `tmux.html`, and `groundwork-doctor --terminal`.
