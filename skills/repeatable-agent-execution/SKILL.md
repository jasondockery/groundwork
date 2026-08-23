---
name: repeatable-agent-execution
description: Establish repository readiness once, mutate coherently, then prove each claim once while every identity it requires is unchanged, so no agent re-derives its runtime, discovers bootstrap prerequisites late, weakens an invariant to pass, or repeats a heavy proof for an identity that never changed. Use before the first edit in a checkout or worktree, before final proof, and whenever setup, a check suite, or a skip control is costing repeated rework.
---

# Repeatable agent execution

A repository teaches its execution contract once, mechanically. An agent that
rediscovers the runtime, the bootstrap prerequisites, or the correct order each
session is paying for a repository defect, not an agent defect.

Load `reviewable-agent-workspaces` for workspace identity, ownership, and
cleanup. Load `concurrent-agent-runtimes` before starting or inspecting
concurrent processes and resources. Load `verification-selection` and the
projected `proof-evidence-policy.json` to select proof and reuse evidence.
Apply those contracts without copying them here.

## Establish readiness once

Run the repository's single readiness entrypoint before the first edit in a
checkout or worktree. That entrypoint must not require the package manager,
dependency graph, or generated tooling it exists to establish.

Readiness covers bootstrap prerequisites only: the canonical command launcher,
runtime and toolchain identity, baseline dependency state, workspace identity,
and the environment required to execute repository commands. Lockfiles,
generated source, schemas, build metadata, and formatting are task-produced
outputs, not readiness state.

Readiness reports the repository, worktree, branch, base and current commit and
tree, working-tree and index cleanliness, bound version-control environment,
required and actually executing runtime and launcher identity, baseline
dependency state, and prepared bootstrap prerequisites.

1. Prove the runtime that actually executes the work, not a declared,
   configured, or shimmed version. Bind the complete executable chain the
   repository's own launcher resolves, including the package manager or command
   runner and the interpreter it starts, and compare that chain to the required
   identity.
2. Keep the repository the version authority. Version managers are
   interchangeable ways to satisfy a requirement and are never the contract.
3. Bind every version-control environment setting capable of redirecting
   repository, worktree, index, object, or configuration identity to the
   resolved workspace identity, or reject it fail-closed. Reporting an
   inherited setting is not binding it.
4. Fail with one actionable remediation when the required runtime, launcher,
   baseline dependency state, or environment cannot be resolved. Never continue
   under an ambient runtime.
5. Prepare declared bootstrap prerequisites during readiness, including
   repository-local packages and fixtures that canonical verification needs
   before the task changes anything. Discovering a missing bootstrap
   prerequisite during proof is a readiness defect.
6. Bring a new worktree to that same ready state through the same entrypoint
   instead of inventing per-session setup.
7. Record a starting workspace baseline outside the repository when the task
   needs to distinguish pre-existing dirty paths from ones this task produces.
   A dirty path present at that baseline is pre-existing, not task-attributable;
   a baseline that exists but cannot be parsed fails closed rather than being
   treated as absent, which would erase the distinction it exists to prove.
8. Prove branch identity before a write-intending session proceeds: reject
   detached HEAD, reject a repository-declared protected branch, and reject a
   declared expected branch that does not match the actual branch. A read-only
   or proof-only session is exempt from the detached-HEAD and protected-branch
   checks, since a detached, disposable, or shared-checkout session on a
   protected branch is the normal case there; an expected-branch mismatch is
   checked regardless of session intent. This check runs first, before every
   other readiness action and before any action with a side effect, because a
   session that cannot prove which branch it is on must not reach anything
   that assumes it knows. A dedicated worktree remains the preferred way to
   avoid this failure entirely; it is not a substitute for the check, and its
   absence is not itself a failure.

Readiness invalidation is selective. When a task intentionally changes the
runtime, package manager, dependency graph, or command contract, refresh only
the readiness facts that changed and their dependents; do not repeat an
indiscriminate setup pass.

Never hand-edit the executable search path, export runtime variables, or invent
setup commands to work around the entrypoint. Repair the entrypoint and report
it.

## Mutate coherently, then normalize

Work in one coherent mutation phase per task. Inside it, iterate freely:
edit, run the narrowest relevant check, edit again. Narrow feedback loops are
the cheap boundary and are encouraged.

What the mutation phase must not do is repeat a heavy aggregate proof for
feedback. Reach for the narrowest command that answers the immediate question.

Complete normalization, formatting, and every task-produced output before any
proof whose evidence you intend to retain. A formatting, generation, or
lockfile change made after that proof invalidates the content evidence and
forces a rerun the correct order never needed.

Assert structure, not layout. A test of configuration, workflow, or generated
semantics parses its input and compares parsed values; an assertion a formatter
can break is a defect in the test.

## Target the invariant under repair

An aggregate verification suite exposes each invariant under a stable name and
runs a named invariant or declared scope directly. A failure names the exact
violated invariant and its remediation; filtering suite output for pass and
fail text is a diagnostic gap, not a workflow.

While repairing a known invariant, run that invariant. At convergence, inspect
the completed diff and run the one final proof `verification-selection` selects
— affected checks for scoped work, the canonical full gate for cross-cutting
work — exactly once. Do not stack a full gate on top of sufficient affected
proof.

## Prove once per identity, not once per session

Freshness is defined by the identity dimensions a claim requires, not by
session order.

Freeze content identity once the mutation phase is complete: the complete tree,
toolchain, command contract, relevant environment, and declared inputs. Run each
required heavy proof at most once while every identity dimension its claim
requires is unchanged.

Distinct claims are not duplicate proof. The same frozen content may legitimately
require hosted proof on each claimed platform, artifact generation, and
deployment acceptance, because those claims require different identity tuples.
Waste is repeating one claim's proof, not establishing another claim.

Committing that frozen tree changes provenance identity, not content identity.
Prove the new commit or reference with the cheap provenance check the claim
requires and reuse the existing content evidence. Add hosted, platform,
artifact, or deployment proof only when it establishes a claim the existing
evidence cannot.

Keep two facts separate. A receipt is stale when it no longer describes the
current tree, and a stale receipt is never presented as current evidence.
Evidence is invalidated only when an identity dimension its claim requires
actually changed. A formatting or generated-byte change after proof invalidates
content evidence; a commit over an unchanged tree does not.

Emit each receipt bound to the claim, the required identity dimensions and
their exact values, runtime and launcher identity, commands, results, and time.
A prior green run is never evidence for changed content, and a summary of an
earlier run is never a receipt.

Proof does not authorize commit, and commit does not authorize publication.

## Never weaken an invariant to pass

Never add a flag, environment variable, repository variable, skip input,
fallback, or relaxed assertion so that a check passes. Repair the cause or
report the blocker.

A break-glass control is owner-only, named as break-glass, fails closed toward
the unsafe interpretation, and binds an audit receipt to each use. A control
that can make a destructive plan appear safe is a defect regardless of intent.

## Measure the waste

Record environment repair attempts, manual runtime or path correction,
bootstrap prerequisites discovered during proof, normalization or generation
performed after a retained proof, and heavy proof repeated for a claim whose
required identities never changed. The steady state is zero of all five. Report
a recurring cost through
`shift-to-authority`; urgent local repair does not wait for promotion.

Repositories own the entrypoint name, command surface, language, runtime and
launcher resolution mechanism, formatter, check inventory, and receipt storage.
