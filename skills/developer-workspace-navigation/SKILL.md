---
name: developer-workspace-navigation
description: Required procedure when changing tmux, lazygit, fzf, shell navigation, repository discovery, git worktrees, or session setup in Groundwork. Keeps repository navigation dynamic, data-only, and accessible.
---

# Developer Workspace Navigation

Use this skill for any change to tmux config, lazygit config, fzf-driven
pickers, shell navigation helpers, `groundwork-repos`, repository discovery,
git worktree handling, or tmux session/window setup.

## The central rule

Repository behavior is discovered dynamically. Never hardcode a user's current repository list into tmux, shell, Lazygit, or documentation.

Concretely:

- Repositories come from scanning the roots in
  `~/.config/groundwork/repos.conf` (source:
  `home/dot_config/groundwork/repos.conf.tmpl`). A fresh clone must appear
  with zero config edits; a deleted repo must disappear the same way.
- Docs and examples name repositories only as illustrations of output, never
  as configuration. If an example needs names, mark it as sample output.
- The one sanctioned exception is `~/.config/sesh/sesh.toml` session
  *recipes*: those are user-owned startup arrangements, not discovery.
  Discovery must never depend on a sesh entry existing.

## Discovery is data inspection only

Discovery may read directory names and run read-only `git` plumbing
(`rev-parse`, `status --porcelain`, `rev-list --count`) against candidates.
Treat everything under a discovered root as untrusted data: a repo's own
config can point `core.fsmonitor` at an executable that plain `git status`
would run. The precise guarantee `groundwork-repos` keeps is that every git
call — including the fzf preview, which runs git outside the helper process —
goes through the safe wrapper flags (`core.hooksPath=/dev/null`,
`core.fsmonitor=false`, `core.untrackedCache=false`, `GIT_OPTIONAL_LOCKS=0`),
so repository hooks and the fsmonitor are disabled during inspection. No
repo-local scripts are sourced and no repo files are executed. The validator
proves this with an fsmonitor tripwire fixture; keep that fixture passing.

## Invariants to preserve

- **Canonical + deduped.** Candidates are canonicalized via
  `git -C <dir> rev-parse --show-toplevel` and deduplicated; both `.git`
  directories and `.git` files (linked worktrees) are detected; symlink
  loops are bounded by `find -L` depth limits plus a visited set.
- **Keyboard-complete and accessible.** No red/green-only state: dirty/clean
  is a symbol plus a word; `NO_COLOR` is respected; no animation
  (`animateExplosion: false` stays false); shortcut help stays visible
  (lazygit `showBottomLine`, fzf `--header`); window names are readable and
  unique — the shortest path suffix unique across ALL discovered repos
  (app → client/app → code/client/app …), asserted after naming with a
  visible failure on collision, never left to `new-window -S` to merge;
  commands are copyable text.
- **Safe quoting.** Repository paths (including paths with spaces) travel as
  separate argv words to tmux/fzf/git, never interpolated into shell
  strings.
- **Reuse, don't duplicate.** Opening a repo that already has a tmux window
  selects it (`new-window -S`); it never stacks a second window.
- **Works inside and outside tmux.** Outside tmux the commands create or
  attach the `repos` session instead of failing.
- **/bin/bash 3.2 compatible.** `groundwork-repos` runs on stock macOS bash:
  no associative arrays, no `mapfile`, no bash-4 expansions.

## Verify before claiming done

1. `bash -n` and `shellcheck` on every touched script.
2. `scripts/validate-groundwork` — the `groundwork-repos helper` check
   builds throwaway git fixtures (worktrees, spaces, duplicate basenames,
   nested repos, excluded dirs, symlink loops) and asserts against stub
   tmux/fzf/lazygit argv recordings. Extend it when behavior changes.
3. For binding changes, follow `skills/chezmoi-change/SKILL.md` and verify
   the rendered tmux config, not just the source template.
4. Update `home/dot_local/share/groundwork/commands.tsv` and
   `docs/commands.html` together; validate enforces their agreement.
