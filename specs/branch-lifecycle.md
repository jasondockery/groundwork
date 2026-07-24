# Branch Lifecycle: groundwork-branches

Status: draft. The immediate relief (recency-sort config + `git branches` /
`git gone` / `git recent` aliases) shipped on `origin/main` (`9fe06b8`); the
`groundwork-branches` command is unimplemented. Implement under
`skills/safe-mutating-cli` (it deletes branches) and extend
`skills/developer-workspace-navigation`.

## Problem

`git branch --all` is a flat ref inventory — no dates, tracking, merged, or gone
state — so a screen full of local branches gives no signal about what is active,
merged, deleted upstream, or carries unpushed work. For AI-native devs whose
agents spawn many branches, that list fills with noise fast.

## Current status (the immediate relief)

Shipped on `origin/main` (commit `9fe06b8`, 2026-07-21) with the git.html /
cheat-sheet / command-catalog docs (`b8fec14`): `branch.sort=-committerdate`,
`rerere.enabled`, and the `git branches` / `git gone` / `git recent` aliases
(`fetch.prune` and `push.autoSetupRemote` predate it). Landed on `main` in
`9fe06b8`; release inclusion is recorded in GitHub Releases (not restated here so
this line does not go stale at the next tag). Installations whose Groundwork
source checkout tracks `main` receive it through `chezmoi update`. Deliberately
NOT enabling `fetch.pruneTags` (Git warns it can delete local tags absent from
the remote).

## The command

A repo-scoped `groundwork-branches`, companion to `groundwork-repos`. Read-only,
offline status by default: a table of every local branch with last-commit date,
ahead/behind the default branch, upstream state, and PR state. `--refresh` is the
ONLY networked action (`git fetch --prune` + GitHub PR metadata); plain status
never mutates or hits the network.

## Classification: independent facts, then one disposition

Do NOT model overlapping conditions as a single state enum — a branch can be
upstream-gone AND worktree-active AND have unique commits AND a merged PR at once.
Model independent dimensions, then derive a disposition:

| Dimension | Values |
| --- | --- |
| Tracking | local-only, upstream-present, upstream-gone |
| Graph | reachable, ahead, behind, diverged, unique-commits |
| Worktree | inactive, current-worktree, other-worktree |
| PR evidence | none, open, merged, closed-unmerged, stale, unknown |
| Tip↔PR-head | matches-PR-head, advanced-since-PR, unknown |
| Disposition | protected, delete-safe, force-delete-confirmed, needs-review |

Avoid the ambiguous word "orphan" (Git uses it for parentless history). A
remote-only branch is not a state of a LOCAL branch: keep remote-only refs in a
separate section, or under `--all` with explicit `LOCAL` / `REMOTE-ONLY` rows.

### Merge detection

Do NOT rely on `git branch --merged` alone — a squash merge creates a new commit
on the default branch, so the feature tip still reads "not merged" though its PR
merged. Combine the local graph, worktree membership, and GitHub PR metadata (via
`gh`: state, merge time, head SHA, base). Do NOT claim `squash-merged` without
proof: a merged PR whose feature tip is not an ancestor could have been
squash-merged, rebased, or otherwise rewritten — label it `merged-pr-non-ancestor`
unless merge-method metadata proves the exact method. Treat anything ambiguous
conservatively.

### PR-state cache contract

Offline status still shows PR state, so: `--refresh` writes cached PR metadata
with a retrieved-at timestamp; plain status reads that cache; the table
distinguishes `open` / `merged` / `closed-unmerged` / `stale` / `unknown`; and
stale or unknown PR data can NEVER by itself establish deletion eligibility.

### Default-branch resolution

A fallback chain — never guess `main`, never assume `origin`: explicit validated
`--default`; else an explicit validated `--remote`'s symbolic HEAD; else
`refs/remotes/<remote>/HEAD` when present and symbolic; else cached GitHub
default-branch metadata from a previous `--refresh`; else `default-branch-unknown`
and fail closed for any cleanup. Do NOT infer the default from the current feature
branch's upstream — tracking `origin/my-feature` identifies a remote, not the
repo's default branch. Plain offline status fails closed rather than guessing.

## Cleanup

`plan-clean` produces an exact deletion plan and deletes nothing: each branch, its
classification, tip SHA, PR, and why it is or is not eligible.

`clean` never deletes the current or default branch, a branch checked out in any
worktree, a branch with an open PR, or one with unpushed/unexplained unique
commits — and NEVER deletes on age alone. `-d` (safe) for genuinely reachable
branches; `-D` only for verified squash-merges behind a separate confirmation.

### Plan-to-clean race protection

Between `plan-clean` and `clean`, another terminal or agent can add a commit.
Before each deletion: re-read the branch tip; re-check worktree membership;
re-check the planned evidence; abort if the SHA changed; and delete the ref
conditionally on its expected old object ID —
`git update-ref -d refs/heads/<name> <expected-old-oid>` (compare-and-swap) — so a
name-based `git branch -D` can never remove work added after the plan was
reviewed.

### Recovery receipt

Written atomically BEFORE each deletion, and it survives a plan that fails partway
through. It lives OUTSIDE the repository under the XDG state directory (never in a
branch the cleanup could itself affect), with cache/receipt paths derived from a
hash or safe repository identity, never raw untrusted branch text. Mode `0600`. It
records: the repo's Git common directory and remote URL (credentials redacted),
the full 40-character tip SHA, the default branch and the evidence used, the
cached-PR retrieval time, and the recovery command — as a structured argv
representation alongside display text, with commit subjects and PR titles
sanitized of terminal control characters.

## Guardrails

Never auto-clean: no shell-startup hook, never inside `update-all`. Deletion is an
explicit owner action with a plan — same rule as docker-tidy and shell-adopt.
Reflog is emergency recovery, not backup (Git's DEFAULT expiry is 90 days for
reachable entries, 30 for unreachable, and a machine can override both): important
agent work is committed and pushed, often as a draft PR.

## Integration

- `groundwork-repos`: surface "N branches need review" per repo, include branch
  health in the fzf preview, open the selected repo in lazygit.
- Extend `skills/developer-workspace-navigation` (it already governs discovery,
  worktrees, tmux, lazygit, fzf). The posture: one concurrent, independently
  reviewable implementation workstream gets one named branch and one worktree —
  read-only investigation needs no branch, and several tightly related edits for a
  single review can share one workstream — moving committed → pushed → draft/open
  PR → merged or abandoned → worktree removed → branch classified and removed.
  Enable GitHub's auto-delete-on-merge, but still classify and clean LOCAL
  branches here.
