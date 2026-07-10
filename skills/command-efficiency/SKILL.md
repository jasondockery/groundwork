---
name: command-efficiency
description: Pick the cheapest command that preserves correctness, and know which git/shell/CI operations are expensive and how to make them cheap. Use before running or scripting git operations, repo-wide searches, CI checkouts, container builds, or any command over a large tree.
---

# Command Efficiency

The rule: **cheap by default, expensive only where correctness requires it, and never guess which is which.** A command's cost is an input you reason about, not ambient luck. The shallow-clone sitemap bug is the canonical failure: `git log` was correct locally and silently wrong under CI's cheap shallow checkout. Know the cost, declare what you need, use the cheapest option that satisfies it, and fail early when the environment cannot.

Groundwork already installs the efficient tools (`rg`, `fd`, `bat`, `dust`, `duf`, `eza`, `hyperfine`); the point is to reach for them and to configure the expensive tools correctly.

## Git history is an input, not ambient state

Any command whose answer depends on **history, tags, ancestry, merge bases, per-file dates, or previous SHAs** must declare that need and prove the checkout provides it. See the `cut-release` skill's green-main precondition and `scripts/generate-discovery` (it calls `assert_full_history()` and fails loudly in a shallow clone).

Checkout policy — cheapest that satisfies the contract:

| Need | Use |
| --- | --- |
| No history (build, lint, format) | shallow default (`fetch-depth: 1`) — do nothing |
| Commit history / per-file dates / merge-base / `git describe` | `fetch-depth: 0` |
| History but not old file contents | `fetch-depth: 0` + `filter: blob:none` (blobless) |
| Tags (version derivation) | `fetch-depth: 0` + `fetch-tags: true`, or an explicit tag fetch |
| Whole-history secret scan | `fetch-depth: 0` |

Never blanket `fetch-depth: 0` on every job — that is wasteful. Never leave a history-sensitive job shallow — that is silently wrong.

## Expensive git operations and cheaper forms

| Expensive | Why | Cheaper |
| --- | --- | --- |
| `git clone <big>` | full blobs + history | `--filter=blob:none` (blobless), `--filter=tree:0` (treeless), `--depth 1` (shallow, but breaks history ops), `--single-branch --no-tags` |
| `git log -p`, `git log --follow` | diffs every commit / rename detection | drop `-p`; add a pathspec `-- path`, `-n`, `--oneline`, `--since` |
| `git blame -C -C -C` | aggressive copy detection | plain `git blame`, or `-L start,end` to scope lines |
| `git status` in a huge tree | scans the whole worktree | `core.fsmonitor=true`, `core.untrackedCache=true`, `feature.manyFiles=true`; or `-uno` when untracked don't matter |
| `git branch/tag --contains`, `git rev-list --count` | walk lots of history | write a commit-graph: `git commit-graph write --reachable` (or `git maintenance start` to automate) |
| `git fetch` (all refs/tags) | pulls everything | `--no-tags`, `--depth`, `--filter=blob:none`, a single refspec |
| `git grep` across history | reads many blobs | `rg` for the working tree; scope `git grep` to a rev/pathspec |

## Beyond git: expensive commands and their efficient forms

| Instead of | Use | Why |
| --- | --- | --- |
| `grep -r pattern .` | `rg pattern` | parallel, skips `.git` and gitignored, far faster |
| `find . -name '*.ts'` | `fd -e ts` | parallel, ignores junk dirs by default |
| `cat file \| grep x` | `rg x file` | no useless `cat`, no extra process |
| `du -sh *` on a big tree | `dust` / `duf` | sorted, quick, readable |
| `ls -R` | `eza --tree` / `fd` | respects ignores, no wall of output |
| `xargs cmd` | `xargs -0 -P"$(nproc)"` (with `-print0`/`rg -0`) | parallelism + safe null-delimited paths |
| `curl url` | `curl -fsSL --compressed`, and cache the result | fail on error, follow redirects, don't re-download |
| `npm install` | `pnpm install --frozen-lockfile` + a warm cache | faster, deterministic |
| full test suite every run | affected/incremental (e.g. `turbo run --affected`) | scopes work to what changed — note this itself needs a merge-base, so full history |
| `eslint .` cold, whole tree | `--cache --cache-location .eslintcache`; set flat-config `ignores` for `node_modules`/`dist`; lint affected packages; cache the task in Turbo/CI | re-lints only what changed; type-aware linting is the slow part (see below) |
| `docker build` | BuildKit + order layers deps-before-source + `.dockerignore` + `--cache-from`/cache mounts | reuses layers instead of rebuilding |
| `kubectl get --all-namespaces` / cloud `list` everything | server-side filters, selectors, pagination | don't pull the world to filter locally |
| reading a whole file for one line | `head`/`tail`/`rg -m1` | stop early |
| a subprocess per item in a loop | one batched invocation | process startup dominates at scale |

Type-aware linting is the usual ESLint cost: rules that need type information (`typescript-eslint` with `parserOptions.project`) run the type-checker, so linting scales with project size. Prefer `projectService` over an explicit `project` glob, keep type-aware rules to the files that need them, and cache the lint task. In a monorepo, a shared ESLint config consumed by each package (the same extract-and-share model as the shared Renovate preset) keeps rules consistent and cacheable rather than re-derived per repo.

## Practice

1. **Measure, don't guess.** `hyperfine 'old' 'new'` compares two commands; `time`, `GIT_TRACE=1`, and `TIMEFORMAT` expose real cost. A "slow" command is a hypothesis until measured.
2. **Fail early when a cheap environment can't satisfy the contract.** If a script's correctness needs history/tags/network, preflight it (`git rev-parse --is-shallow-repository`) and exit with an actionable message rather than emitting silently-wrong output.
3. **Don't trade correctness for speed.** Shallow clones, sampled scans, `--depth 1`, and skipped verification are cheap *and wrong* when the task needs the full picture. Cheapest-that-is-correct, not cheapest.
4. **Don't assume local == CI.** A full local clone hides costs and contracts that a shallow CI checkout exposes. Run the same command in the environment that will run it.
