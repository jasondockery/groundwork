---
name: ci-workflow-change
description: Designs, changes, and triages hosted CI/CD workflows such as GitHub Actions, including required checks, aggregate gates, fail-fast ordering, deploy mutation barriers, dynamic matrices, caches, runner and action pins, and failure classification. Use when editing workflow files, reusable or composite actions, CI scripts, branch-protection check names, deploy pipelines, or when a hosted run fails. Not for the shell syntax inside a step (use shell-script-change), and not for choosing which proof a change needs (use verification-selection).
---

# CI workflow change

Hosted CI is a shared, finite resource and a deploy safety boundary. Load
`verification-selection` for proof choice, `secure-by-design` for workflow
permissions, credentials, and third-party actions,
`performance-sensitive-change` for speed work, and `shell-script-change` for
scripts run by steps. Keep the workflow contract here.

## 1. Classify the workflow

| Kind | Trigger | Blocking? |
| --- | --- | --- |
| Gate | every change proposal and push to deployable branches | Yes, through required checks |
| Deploy | protected-branch push or authorized dispatch | No, but mutation waits for gates |
| Cleanup | schedule, proposal close, manual | No |
| Release | after a successful deploy | No |
| Smoke | after deploy, schedule, manual | Owned by deploy acceptance |

## 2. Required checks always report

- A required workflow runs on every change proposal. Do not filter its
  trigger by path; decide relevance inside the run and finish green when
  nothing applies, so branch protection always sees the check.
- Expose one terminal aggregate gate job per workflow and require that job,
  not its children. Advisory jobs stay outside the gate's dependencies.
- Keep required check names stable. Renaming one is a branch-protection
  change and needs the owner.
- When hosted enforcement is unavailable, the repository names which local
  receipts stand in for required checks. That substitution is an owner
  decision with a review date, never an agent's inference.

## 3. Order work by failure cost

- Run cheap deterministic checks first: syntax, formatting, input and branch
  guards, change classification, and no-op decisions. Then dependency
  install and affected typecheck, lint, and test. Run slow or mutating work
  last: image builds, browser setup, production builds, infrastructure diff
  and deploy, migrations, and release mutation.
- Cheap-first means early failure and cancellation, not added dependency
  edges. Do not serialize independent jobs behind a static-check job; a gate
  waits for its slowest required job, not the sum of two.
- Give every job a timeout, as `COMPASS.md` "Bound the work" requires.
  Cancel superseded runs of change-proposal gates. Deploy and other mutating
  workflows queue or coalesce and are never cancelled once mutation starts.
- Produce expensive work once per run and hand it off by artifact or receipt.

## 4. Deploy mutation barrier

- Deploy workflows may start non-mutating preparation alongside gates, but
  every mutation (cloud writes, infrastructure deploy, database migration,
  deployment publication) waits until the required gates succeed for the
  exact SHA.
- A manual break-glass dispatch may skip the gate wait only where the workflow
  explicitly supports it. It still enforces stale-SHA, environment,
  approval, credential, lock, and destructive-action boundaries.
- Hold a cross-environment lock only around the bounded job that mutates
  shared state, and coalesce superseded runs.
- Deploy paths never fetch unpinned tools ad hoc at run time (one-off
  package-runner style). They use the pinned, lockfile-installed tool, restore and verify the same-run build
  artifact before mutation, and fail rather than silently rebuilding when it
  is missing or stale.
- Before a new external-CLI command becomes a blocking gate, prove that exact
  read-only command against the real target in a non-blocking step or a
  recorded rehearsal. Stubbed tests prove only the repository side.
- Missing secrets, environment configuration, identity trust, locks, or DNS
  are environment blockers. Stop and tell the owner; do not fix forward by
  editing repository files.

## 5. Inputs, outputs, and matrices

- Pin runners to an explicit image version, never a floating latest label.
- Pin third-party actions and container images to immutable digests and let
  the dependency updater move them; record each image once in the
  repository's image authority.
- A dynamic matrix is a valid JSON array. An empty matrix is `[]` plus a
  separate run-or-skip boolean; downstream jobs gate on that boolean. Never
  emit null, undefined, or empty-string entries.
- Inconclusive change classification fails closed to the full or protected
  path, never to skip. Test the planner on empty, single, multiple, and
  malformed input.
- Write step outputs and summaries multiline-safely and test the serialized
  form, not only the producer's in-memory value.
- A script that embeds another language inside a shell string needs a
  runtime test through the shell; a syntax check does not catch expansion or
  quoting that rewrites the embedded program.
- Before a check asserts a configuration or governance surface, read its
  current live state, including the bypass and exception lists. A check that
  asserts only the obvious half is decorative.

## 6. Caches are proven, not assumed

- Reject an impossible cache plan before building. Keep artifact validation
  and cache integrity checks authoritative.
- Distinguish wired, configured, enabled, and proven caches. A cache that
  never saves or never produces a warm hit has no performance value.
- Keep cache keys low-cardinality. A commit, run ID, or matrix value in a key
  creates a new immutable upload every run. Fix an unbounded write pattern
  instead of raising the storage cap.
- A failed save is a failure outcome in reports, never a skip. Missing
  producer evidence is unknown, never success.

## 7. Triage a failed run

1. Classify: regression, flake, environment drift, configuration mismatch,
   pre-existing failure, or a quota, outage, or billing stop.
2. A job that ends in seconds with no steps and a billing or spending-limit
   annotation is not a code failure. Do not rerun or push to retrigger it;
   tell the owner.
3. Ask whether a cheaper reliable boundary could have caught it. If so, add
   the guard there in the same fix and prove it fails on the current bug.
   Moving a check to required hosted CI is not weakening it.
4. Fix the root cause. Never loosen an assertion, add a skip, or bypass hooks
   to get green.
5. When a rerun passes, record both facts: the SHA is unblocked and the first
   failure is still a reliability signal.
6. Before investigating from scratch, compare the symptom with the
   repository's recorded failure patterns.

## 8. Speed work is measured

Record a baseline before editing: end-to-end and critical-path time,
queue time, lock hold, cache hit rate, and runner cost. After the change,
measure the same values from first-attempt runs, reporting the tail (for
example p90) as well as the median and including the smallest supported
runner; a warmed rerun is not a speed win. For each change, state the cost it removes and any wait,
dependency edge, runner demand, or serialized section it adds. When safety
and the requested speed cannot both hold, stop and ask the owner. Do not mark
optimization done when the result is flat, slower, disabled, or unmeasured.
Best-effort telemetry still leaves a durable delivery receipt and a visible
annotation; a missing receipt is an incident, not green.

## Done when

- Static workflow validation and the repository's CI checks pass locally.
- The handoff names the hosted run that proves the change, or states that the
  hosted exact-SHA run is still owed.
