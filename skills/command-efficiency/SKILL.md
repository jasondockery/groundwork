---
name: command-efficiency
description: Reason about what a command costs and pick the cheapest one that preserves correctness. Use before running or scripting git operations, repo-wide searches, CI checkouts, container builds, linters, or any command over a large tree, account, or dataset.
---

# Command Efficiency

The rule: **cheap by default, expensive only where correctness requires it, and never guess which is which.** A command's cost is an input you reason about, not ambient luck. Two failures anchor this skill: a `git log` that was correct locally but silently wrong under CI's shallow checkout, and a `find ~` that scanned an entire home directory when the target was known to be under `~/code`. The first is a wrong correctness contract; the second is a scope that was never narrowed.

Groundwork already installs the cheap tools (`rg`, `fd`, `bat`, `dust`, `duf`, `eza`, `hyperfine`); the skill is knowing *when* each is actually cheaper and configuring the expensive tools correctly.

## The cost model: five questions before an expensive command

Answer these instead of memorizing "command X good, Y bad" — the answer depends on scope and intent, not the command name.

1. **Scope** — what is the narrowest directory, package, branch, namespace, account, or dataset the task needs? Establish the narrowest *known* scope, cap it (`--max-depth`, a path, a limit), and widen only after the scoped run fails. `find ~` failed this; `find ~/code -maxdepth 4` or a known path passes it.
2. **Cardinality** — does this run once, or once per file / package / commit / row? Prefer one batched pass over a subprocess per item; process startup dominates at scale.
3. **Data movement** — does it transfer blobs, all refs, all rows, all objects, or recursive remote data? Fetch only what is used.
4. **Reuse** — can a cache, index, or single-pass aggregation avoid repeated work?
5. **Correctness dependency** — what history, generated output, type information, remote state, or environment does correctness *actually* require? Declare it and prove the environment provides it; do not assume a full local clone reflects a shallow CI one.

## Git history is a declared input, not ambient state

Anything whose answer depends on history, tags, ancestry, merge bases, per-file dates, or previous SHAs must declare that need and prove the checkout satisfies it. `scripts/generate-discovery` does this: it `assert`s full history and fails closed if the state cannot be established.

Declare the history you need, then use the narrowest checkout that provides it:

| Need | Checkout |
| --- | --- |
| Snapshot only — verified the whole invoked toolchain consults no history, tags, or ancestry (not just labeled "build"/"lint") | shallow default (`fetch-depth: 1`) |
| This branch's history (per-file dates, its own `git log`) | `fetch-depth: 0` + `filter: blob:none` (history without old blobs) |
| Compare against a PR base (`merge-base`, `git diff base...`) | enough history to reach the base; `fetch-depth: 0` is the simple guarantee |
| Tags (version derivation, `git describe`) | full history (`fetch-depth: 0`) already fetches tags; only with a shallow/partial fetch do you add `fetch-tags: true` or an explicit tag fetch |

`fetch-depth: 0` fetches **all** branches and tags — a safe universal answer, not automatically the cheapest (a per-path lastmod needs only the checked-out branch's history). Use the narrowest that satisfies the need; reach for `fetch-depth: 0` when narrowing isn't worth the complexity. Never leave a history-sensitive job shallow — that is silently wrong, not merely slow.

## Expensive git operations and cheaper forms

| Expensive | Why | Cheaper |
| --- | --- | --- |
| `git clone <big>` | full blobs + history | `--filter=blob:none` (blobless), `--filter=tree:0` (treeless), `--depth 1` (breaks history ops), `--single-branch --no-tags` |
| `git log -p`, `git log --follow` | diffs every commit / rename detection | drop `-p`; add a pathspec `-- path`, `-n`, `--oneline`, `--since` |
| a `git log` per file | one process + one history query each | one traversal building a `path → date` map (`git log --name-only`, first hit per path) |
| `git blame -C -C -C` | aggressive copy detection | plain `git blame`, or `-L start,end` |
| `git status` in a huge tree | scans the worktree | `core.fsmonitor=true`, `core.untrackedCache=true`, `feature.manyFiles=true`; `-uno` when untracked don't matter |
| `git branch/tag --contains`, `git rev-list --count` | walk lots of history | write a commit-graph: `git commit-graph write --reachable` (or `git maintenance start`) |
| `git fetch` (all refs/tags) | pulls everything | `--no-tags`, `--depth`, `--filter=blob:none`, a single refspec |

## Beyond git

Cheaper *usually*, with the caveat that matters — scope and pruning decide cost more than the binary does.

| Instead of | Consider | Why / caveat |
| --- | --- | --- |
| `grep -r pattern .` | `rg pattern` | parallel, skips `.git`/ignored — but scope the root; `rg ~` is still expensive |
| `find . -name '*.ts'` | `fd -e ts`, or `find` with `-prune`/`-maxdepth` | `fd` has friendlier defaults and ignores; neither is cheap rooted too wide or unpruned |
| `du -sh *` on a big tree | `dust` | sorted disk usage (note: `duf` replaces `df`, not `du` — different job) |
| `ls -R` on a big tree | `eza --tree --level=N` / `fd` | readable and ignore-aware, but bound the depth — an unbounded tree walk costs the same |
| serial `xargs cmd` | bounded parallel `xargs -0 -P<N>` (with `-print0`/`rg -0`), only when items are independent and order-free | measure first; consuming every core hurts I/O-bound work and responsiveness, so don't default to all cores (and `nproc` isn't reliable on macOS) |
| `curl url` | `curl -fsSL --compressed` | fail on error, follow redirects, compress transfer — this does **not** cache; add `--etag-save/--etag-compare` or a local cache separately |
| swapping in a package manager | the repo's **declared** manager + frozen lockfile in CI (e.g. `pnpm install --frozen-lockfile`) | deterministic; don't switch managers a repo didn't choose |
| full test/lint every run | affected/incremental (e.g. `turbo run --affected`) | needs a merge-base (full history) **and** a build graph that models shared config, toolchain, and generated inputs — affected is only as safe as that graph |
| `docker build` | BuildKit + deps-before-source layers + `.dockerignore` + `--cache-from`/cache mounts | reuse layers |
| list everything then filter (`kubectl`/cloud `list`) | server-side filters, selectors, pagination | don't pull the world to filter locally |
| read a whole file for one line | `head`/`tail`/`rg -m1` | stop early |
| a subprocess per item in a loop | one batched invocation | startup dominates at scale |

## ESLint and typed linting

- **Cache when reuse exists.** `--cache` only helps if the cache is restored across runs (local, a CI cache, or a Turbo task); in a fully ephemeral job with no restoration it just adds write cost. When you do cache, use `--cache-strategy content` in CI or any restored worktree — git does not preserve mtimes, so the default metadata strategy misses — and include lockfile, ESLint version, config, Node version, and relevant `tsconfig` in the cache key.
- **Ignore build output.** Flat-config `ignores` for `node_modules`, `dist`, generated code — don't lint what you don't own.
- **Typed linting is the cost,** not "ESLint": rules needing type info build TypeScript programs, so cost scales with project size. Prefer `projectService` over a broad `project` glob, keep `tsconfig` includes narrow, and avoid recursive `**/tsconfig.json` when explicit package paths work. Profile before disabling a correctness rule.
- **Concurrency is situational.** `--concurrency auto` can help on an idle machine but hurts when Turbo already runs package tasks in parallel or a runner is CPU-constrained. Measure per topology; don't mandate it.
- **Don't lint intentionally-invalid files** (tokenized templates) to force coverage — that is a validation hole. Render representative fixtures and lint those instead.

## What to hard-fail, warn, or only teach

- **Hard-fail** (objectively wrong or dangerous): a history-dependent generator in a shallow clone; a missing merge-base for an affected calculation; a tag-dependent release without tags; unrendered templates in a normal lint scope; a cache key missing a correctness-critical input; over-broad workflow permissions.
- **Warn** (context-dependent): a repeatedly-run lint/test path with real reuse but no effective cache; `fetch-depth: 0` on a job proven snapshot-only; a git subprocess per file; `find`/`rg` rooted at `$HOME`; the full suite in an inner loop; `docker --no-cache`; broad cloud/k8s listing.
- **Teach only** (not CI-enforceable — skills and habits): an agent typing `find ~`, reading a whole large file for one fact, reopening the same files, or searching before checking the working directory.

## Practice

1. **Measure, don't guess.** `hyperfine 'old' 'new'`, `time`, `GIT_TRACE=1` expose real cost. "Slow" is a hypothesis until measured.
2. **Declare and check the contract.** If correctness needs history/tags/network, preflight it (`git rev-parse --is-shallow-repository`) and fail closed with an actionable message rather than emitting silently-wrong output.
3. **Cheapest that is correct, never cheapest.** Shallow clones, sampled scans, `--depth 1`, skipped verification are cheap *and wrong* when the task needs the full picture.
4. **Local is not CI.** A full local clone hides contracts a shallow CI checkout exposes. Run the command in the environment that will run it.
