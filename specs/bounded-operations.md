# Bounded and observable operations

Groundwork runs long external work — Homebrew, mise, chezmoi, git, downloads,
macOS configuration — where a hang looks exactly like slow progress. Every finite
operation declares four things: a completion deadline, how progress is observed,
how it cancels, and what is true after it stops.

`AGENTS.md` carries the one-line rule. This spec holds the model.

## The four bounds are not interchangeable

Collapsing them causes both false kills and silent hangs.

| Bound | Meaning | On expiry |
| --- | --- | --- |
| **Hard deadline** | The operation's real completion limit | Abort and fail |
| **Stall threshold** | Progress has gone quiet | Report and run diagnostics — never kill on its own, because a slow download is quiet but healthy |
| **Performance budget** | The operation finished but missed its target | Report; this is not a failure |
| **Workflow `timeout-minutes`** | Last-resort protection | Never the operation's real deadline |

A retry count without a cumulative deadline is still unbounded.

## A timeout is a failure, never a slow success

Exit nonzero, cancel the child tree, preserve evidence, and print the exact
recovery command. A failed or timed-out bootstrap never reports that the machine
is ready.

## Long-lived things bound their phases, not their lifetime

Intentionally long-lived processes — login shells, tmux sessions, watchers, dev
servers — bound startup, readiness, individual requests, and shutdown rather than
total lifetime.

## Do not assume GNU `timeout`

Bootstrap runs before Homebrew exists, and this repo has already been bitten by
GNU/BSD `stat` differences. A bounded runner must use what is guaranteed at the
point in bootstrap where it runs, and must be tested on macOS.

The shared implementation is
`home/dot_local/share/groundwork/lib/maintenance-runner.sh`; the validator's
outer supervisor is `scripts/run-validation-deadline`.
