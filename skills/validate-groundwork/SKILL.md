---
name: validate-groundwork
description: Validate Groundwork before commit, release, public repo publication, or after broad changes. Use when checking chezmoi layout, rendered templates, docs links, secret patterns, and public-repo readiness.
---

# Validate Groundwork

List the canonical suites and their check families instead of guessing check
combinations. Parameterized families remain symbolic here; the run receipt
records each concrete check name that actually executed:

```bash
scripts/validate-groundwork --list-suites
```

If the owner has explicitly paused verification, stop before every test, lint,
format, hook, validator, build, or proof command. Source and diff inspection may
continue. Before resuming, present the proposed commands, duration estimates,
overlap or duplication, whether each command is diagnostic or final proof, and
the exact tree each command will prove; wait for owner approval.

Finish the accepted implementation and inspect the complete diff before paying
for final proof. During implementation, run only the smallest focused check
needed to answer an immediate question. Run local suites serially. Update and
Docker policy matrices use validator-owned fixture clocks and direct runners;
only the named runtime-contract groups keep real clocks, signals, process
groups, deadlines, descendant drain, and locks. Do not add a production
test-speed flag.

```bash
scripts/validate-groundwork --suite static
scripts/validate-groundwork --suite update
scripts/validate-groundwork --suite docker
scripts/validate-groundwork --suite platform-macos
```

Final proof chooses one path. For an ordinary scoped change, run `static` plus
the affected suites once after the final relevant edit. For validator,
shared-runner, bootstrap, cross-platform, CI-routing, release, or another
cross-cutting change, run only this seconds-long syntax preflight and then
`full` once; do not run receipt tests separately because `static` already owns
them, and do not run every focused suite first:

```bash
bash -n \
  scripts/validate-groundwork \
  scripts/run-validation-job \
  scripts/test-validation-deadline

PYTHONPYCACHEPREFIX=/private/tmp/groundwork-pycache \
  python3 -m py_compile \
  scripts/aggregate-ci-receipts \
  scripts/check-workflow-receipt-policy \
  scripts/ci_receipt.py \
  scripts/test-aggregate-ci-receipts \
  scripts/test-ci-receipts \
  scripts/tree-fingerprint \
  scripts/run-validation-deadline \
  scripts/write-ci-receipt
```

If `full` exposes one lane defect, fix it, run that focused lane for diagnosis,
then rerun `full` once on the unchanged final tree. Use `--report <path>`
outside the repository for the typed,
schema-versioned receipt. It records the exact content fingerprint of staged,
unstaged, and untracked inputs before and after the run; platform; suite budget;
pass, skip, and fail counters; typed skip codes and reasons; and every check
timing.
`full` launches each public focused suite in a fresh subprocess and imports
their receipts, so shell globals and fixtures cannot make the composition a
different test. It is the boundary proof for validator, shared-runner,
bootstrap, cross-platform, CI-routing, release, and broad cross-cutting changes:

```bash
scripts/validate-groundwork --suite full --report /tmp/groundwork-validation.json
```

For an owner-authorized push, reconcile the index and create the intended local
commit before this final proof. The receipt must describe that exact clean
commit, and no source, index, or history mutation may occur between proof and
push. A modified-tree receipt remains useful diagnostic or handoff evidence,
but a later commit invalidates it as publish proof.

Every suite has a whole-suite deadline plus a five-second TERM/KILL cleanup
grace: 540 seconds for `static` and `docker`, 840 seconds for `update` and
`platform-macos`, and 300 seconds for routine `full`. Nightly or forensic proof
that deliberately needs a larger ceiling passes `--deadline-seconds <seconds>`
explicitly; a performance-budget miss remains advisory, while the hard deadline
exits 124. The inherited PID marker is only an internal recursion guard, not a
public bypass or a hostile-input security boundary. Full composition hands each
focused child an exact immediate-parent marker so every child remains in the
outer 300-second process group. The deadline supervisor also owns a private
control pipe; outer-owner death closes the pipe and triggers bounded TERM/KILL
cleanup of the complete owned group.

The advisory suite targets are `static` 55s, `update` 90s, `docker` 75s,
`platform-macos` 15s, and `full` 270s. Use the first five representative
final-tree receipts to establish the baseline. After that, a regression creates
a productivity warning and backlog item; it never weakens the checks.

The no-argument command remains an exact alias for `--suite full`. Any relevant
edit after a receipt makes it stale. A local modified-tree receipt has no
`testedSha`; its content fingerprint and command bind it to the observed local
tree, but it is not reusable proof because the current schema does not yet bind
every toolchain and configuration input. Do not describe a prior receipt as
final-tree proof after any relevant input changes, and do not reuse it in a
hook.

Validation mirrors CI **on the platform it runs on**. A green macOS run proves
nothing about code paths only Linux can reach (GNU vs BSD tool semantics,
platform branches in shell or tests). Before pushing any change with
platform-branching shell — `stat`, `sed -i`, `date`, coreutils flags, or
per-OS test assertions — run the affected checks on Linux locally as well
(a stock container with the repo mounted is enough; `groundwork-docker-build-scratch`
for full-image concerns). The GNU/BSD `stat` incident of 2026-07-26 shipped a
red Linux CI run exactly because the macOS pass was mistaken for a full pass.

The script checks:
- bootstrap shell syntax
- ShellCheck linting for checked-in and rendered shell scripts
- `.chezmoiroot` and `home/` layout
- `AI_THESIS.md` and rendered AI adapter wiring
- rendered `home/run_*.sh.tmpl` scripts
- rendered templated helper executables
- rendered Claude/Codex adapter templates
- static-docs publishing wiring, including required page metadata
- rendered zsh config
- local documentation links
- common secret patterns
- optional local public denylist patterns
- whitespace errors

## Extra Checks For Public Release

Before publishing or flattening history:

1. Inspect status and staged files:
   ```bash
   git status --short --branch
   git diff --stat
   ```
2. Search for generic private terms, credentials, machine-local paths, or unfinished notes:
   ```bash
   rg -n "TODO|FIXME|private|secret|token|password|gmail|icloud|/Users/" .
   ```
3. If you have personal terms that should never be published, put them in a local gitignored file named `.groundwork-public-denylist`, one ripgrep pattern per line, or set `GROUNDWORK_PUBLIC_DENYLIST_PATTERN` before running validation. Do not commit the personal term list.
4. Confirm generated config points at the visible checkout:
   ```bash
   chezmoi source-path
   ```
5. If changing bootstrap, test from a clean temp clone or read the path carefully enough to explain restart behavior.

At handoff name the affected surfaces, the selected commands and coverage
rationale, and any repository-wide contract the scoped proof did not exercise.
Report best-effort implementation time, measured validation and hook time, every
command and duration, slowest check, reruns, duplicate proof time, invalidated
validation time, skipped checks, and whether the final tree passed. When
implementation was continuous enough to make the comparison meaningful, include
the verification-to-implementation ratio. Flag a command over 5 minutes, a hook
over 1 minute, or a final sequence over 10 minutes as an advisory economics
issue. Do not omit necessary proof to meet a timing target.
