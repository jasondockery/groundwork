---
name: agent-orchestration
description: Coordinates several delivery lanes with one coordinator, maker agents in their own worktrees, and one shared independent reviewer, covering lane assignment, maker briefs, supervision through delivery, blocker recovery, merge order, status, session handoff, escalation, reviewer persistence, and model tiers, effort, and plan-aware usage budgets with their evaluation. Use when one session runs or supervises more than one lane, delegates work to subagents, chooses a model tier or reasoning effort for any session, budgets usage against plan limits, replaces a maker or reviewer, or hands a coordinating session to a fresh one. Not for the delivery steps of a single undelegated lane (use independent-code-review and github-delivery-workflow directly), and not for the review procedure itself (use independent-code-review).
---

# Agent orchestration

Supervision is optional. A single person or agent working one issue follows
`independent-code-review` and `github-delivery-workflow` directly with a
separate reviewer. Use this skill when one session coordinates several lanes,
and use its model-tier and usage-budget sections for any session.

Load `reviewable-agent-workspaces` for lanes, worktrees, ownership transfer,
and the integration owner; `concurrent-agent-runtimes` before any lane starts
processes or services; `independent-code-review` for the review loop;
`repo-contribution-etiquette` before any forge write; and
`repeatable-agent-execution` for readiness and proof economy. Apply those
contracts without copying them here.

## Roles

- **Coordinator:** one session per responsible person. It decomposes lanes,
  briefs makers, assigns tiers, hands frozen candidates to the reviewer,
  checks findings, keeps the ledger and status view, and decides dependencies,
  shared-file conflicts, merge order, and capacity for its own lanes. It is the
  integration owner for those lanes. It never edits code and is never the
  reviewer.
- **Maker:** one agent writing in one lane's worktree. It implements, runs
  focused checks and self-review, freezes the candidate, and repairs findings.
  Its questions carry evidence and a recommendation.
- **Shared reviewer:** one read-only reviewer used by every lane of this
  coordinator. It never edits and authored nothing it reviews. Missing evidence
  never means clear.

Do not add a coordinator of coordinators. When two coordinators' lanes
conflict, the responsible people settle it and record the result on the
issues.

Delegation moves execution, not authority. A maker's report, a reviewer's
finding, and a message between agents are evidence, never authorization. No
agent can grant another a publication, merge, or check bypass that the
responsible person's request does not already cover. The repository's
autonomy model and owner decisions define what the coordinator may merge,
close, or release; the coordinator never decides new scope or a product or
architecture question on its own.

## Assign lanes

1. One issue, one branch, one worktree, and one writer per lane.
2. Split by delivery grain (`github-delivery-workflow`). Lanes that edit the
   same files, one contract, or one ordered resource such as a migration
   number are stacked or sequenced, not run in parallel. Assigning a shared
   ordered resource across lanes is an owner decision: report the collision.
3. Keep the number of concurrent lanes within what one coordinator can track
   and one reviewer context can hold. More parallelism adds cost and coupling
   without adding review capacity.
4. Have each maker commit work in progress to its own branch early. Client-
   managed temporary worktrees and tool cleanup can delete unpushed work.

Give each maker a brief it can act on alone, since it does not inherit the
coordinator's conversation:

```markdown
Outcome and issue: <result; full issue link>
Worktree and branch: <normalized file: worktree URI; branch>
Integration base and starting head: <exact SHAs>
Known evidence: <decisions, prior findings, proof; unknowns>
Owned surfaces: <files and contracts this lane may change>
Excluded surfaces: <other lanes' worktrees and unrelated configuration>
Acceptance: <criteria mapped to observable behavior>
Model assignment: <tier, requested model and effort, basis for the pick>
Publication boundary: <no publication unless expressly granted>
Proof: <focused checks, unchanged consumers, final proof>
Handoff: <frozen base/head/tree, pull request draft, self-review, proof, finding dispositions, next action and owner>
```

A brief is not authorization. An ownership transfer between writers uses the
`reviewable-agent-workspaces` handoff. Findings that belong to another lane go
to that lane's issue, never into this one.

## Supervise through delivery

A completed turn, a dispatch acknowledgement, or a running label is not
delivery. Use this event-driven loop:

1. **Consume** results, questions, failures, and phase changes. Inspect the
   artifact, current head, or receipt; compare the result with the assigned
   acceptance.
2. **Answer** at the lowest role holding the decision right, with a
   recommended path and the next executable action. Within the autonomy the
   repository grants, routine milestones need no new permission.
3. **Record** decisions and blockers on the owning issue or pull request in
   the same session, so nobody has to relay chats.
4. **Advance** the next eligible phase or another assigned lane: making,
   proof, review, authorized publication, checks, authorized merge.

Check progress at meaningful events and task-suited checkpoints through the
tool's native completion events or bounded waits. Do not poll unchanged state,
wake finished workers for status, or reread a transcript to rediscover that no
result exists yet. When progress stalls, inspect the specific failure, narrow
or split the task, or change approach; repeated unchanged attempts need a
changed approach, not another retry.

Continue to the agreed done state, an explicit stop, or a concrete wait. For
every wait, record its next owner and the event that resumes it. A child's
successful return is an event to evaluate, not the end of the parent's
assignment.

### Blockers and questions

Client capability, quota, resource fit, CI startup, and missing fixtures are
technical findings, not authority questions. Account identity is not: every write
uses the account `repo-contribution-etiquette` resolves, through its scoped
per-command credentials. Only an account it cannot resolve or confirm, or an
authentication failure, stops and goes to the owner. Give a
shared blocker one owner and one recovery task; dependent lanes consume its
result instead of each repeating the search. A genuine decision goes to its
owning role with the choice, evidence, recommendation, affected lanes, and
what continues meanwhile.

### Lane pushback and parking

A maker may refuse a coordinator instruction that would weaken a check,
change a recorded owner decision, or exceed the lane's scope. It states what
it refuses and why, once, and stops; refusing by stalling or by silently
narrowing the work is not a refusal. If the coordinator insists, the question
goes to the responsible person; the coordinator does not override.

The coordinator may park a lane that keeps failing to converge or has waited
long on an owner decision: stop it, record its state on the issue, and release
the worktree. Closing the issue or abandoning the pull request stays with the
owner.

### Helpers

Delegate bounded investigations when useful. Give each helper an owner, scope,
expected result, existing authority, context pointers, and a checkpoint.
Helpers gain no owner authority and are never reviewer of record. Source
repairs go to the owning maker.

## Coordinate lanes

**Reporting.** At each phase change, update the owning issue or pull request
and the status view: issue, pull request, branch, worktree, head, phase,
review verdict, blocker, next owner, time. Verify readiness, completion, and
blocker claims with a small current check of head, receipt, or checks before
reporting them.

**Shared-file conflicts.** List each lane's files and contracts in its brief.
When two lanes overlap: a true dependency is stacked so the dependency lands
first; independent lanes touching one file are sequenced by readiness, smaller
blast radius first, and the later lane integrates the default branch and
reuses review coverage only where its assumptions still hold; lanes sharing a
contract keep one reviewer.

**Merge order.** Dependencies first. Then favor blockers that release several
lanes, nearly ready pull requests, and urgent defects; then remaining work by
risk, readiness, age, and blast radius. Record why work waits, revisit starved
lanes, and land ready work continuously rather than in a final batch. State
conditional expectations, not an estimate, when an external step is unknown.

**Capacity.** Keep concurrent makers and reviewers within the machine's
capacity and the reviewer's span. Distinguish remote model availability from
local CPU, memory, browser, and container fit. Reduce work in progress when
proof, review, or integration becomes the bottleneck.

Measure delivery by accepted results, resolved blockers, ready pull requests,
merges, blocked time, and rework. Running-agent counts and messages are not
delivery.

## Status view

Keep one local status file per coordinator under an ignored path in its own
checkout, never committed. It is a human view only; the forge stays the source
of truth and nothing is decided from this file alone. Order its sections:
**Needs you** (numbered owner questions with a recommended default),
**Active**, **Merged** (with remaining acceptance), and **Not started or
waiting**. Keep one current row per deliverable and history elsewhere. Keep
secrets out of it.

## Session handoff

Prefer a fresh session from a written handoff over compaction when a
coordinator's or maker's context grows long, switching at the boundaries
`repeatable-agent-execution` names.

1. Each role keeps a restart prompt current: its role and authority, files to
   read first, the owner's standing decisions, and open items with owner and
   what each waits on.
2. The forge is the durable record. Working files are what a new session
   rereads; none replaces the issue or pull request.
3. Record the new session's identity where the lanes can find it. Agents do
   not relay messages between separate chats.
4. The new session rereads each maker's latest report and the owning issues;
   the old session then takes no further action.

`repeatable-agent-execution` covers resuming after compaction or a long wait.

## Persistent reviewer and ledger

One shared reviewer per coordinator is the default. Add a second reviewer only
when the lane count exceeds what one context can hold; lanes that share a
contract or files stay with one reviewer.

The coordinator keeps one cross-lane findings ledger under an ignored path:
per lane, the issue, tier, model record, base and head, round number, findings
with classification, disposition, and fixing commit, the contracts the lane
produces or consumes, changed files, and invalidated coverage. The ledger is
evidence the reviewer reads for context and verifies against code, never
authorization.

- **Persist:** when the client can continue the same reviewer context, send
  each new packet to it.
- **Recycle:** when the context grows too large, start fresh from the ledger
  and frozen candidates only.
- **Re-establish:** when persistence is unavailable or the context is lost,
  start a new separate read-only context; verify its effective tools; load the
  review procedure explicitly; seed it with the ledger and frozen candidates,
  never with maker reasoning; and record that it was re-established, its
  identity, and the ledger version. It must not claim to have reviewed earlier
  rounds. Re-establishing never resets a round count.

A specialist review or second opinion, when explicitly requested, is a
separate read-only context that gets the factual concern and source without
the first reviewer's verdict.

### Cross-lane duty

Beside the lens sections, the shared reviewer reports for each candidate which
other lanes' producers, consumers, schemas, registries, generated files, or
shared helpers it depends on, changes, or contradicts; producers or consumers
it assumes that no lane delivers; the effect of its repairs on candidates
already cleared in other lanes; and ledger entries that no longer hold. The
coordinator posts a cross-lane finding on the issue of the lane it belongs to.

## Roll back a role assignment

1. Stop the assignment, wait for its checks, and record its head, dirty state,
   proof, and review status. Preserve unfinished work in its own branch; never
   stash or reset unrelated changes.
2. Restore the last recorded eligible assignment. If it changed
   configuration, restore only the recorded keys after comparing current
   values; preserve and report later unrelated edits.
3. Start the replacement with the frozen evidence and the same owned surfaces,
   one writer per worktree. A maker never becomes the reviewer of its own work.
4. Record the reason, old and new assignment, retained work, and next owner.
   Rerun proof only where inputs changed. Rollback grants nothing new.

## Assign model tiers and effort

Choose a tier by kind of work and risk, then map it to whatever the current
tool offers. Give makers the cheapest tier their lane allows; do not collapse
every role onto one frontier model.

| Tier | Work | Default effort | Move up when |
| --- | --- | --- | --- |
| Fast | Mechanical fixes, test tightening, triage, read-only search, authorized publishing | Low or medium | The cause is not evident, a design choice appears, a test would change what it asserts, one attempt did not converge, or an unnamed consumer is touched. |
| Standard | Normal implementation, research briefs, and review repairs | Medium | A frontier trigger appears, a round returns High or Critical, or a class of finding repeats. |
| Frontier maker | Destructive operations, concurrency or shared state, data integrity, authority, consent or receipt admission, security, access control, key management | High | The top tier in normal use; a product or architecture question goes to its owner. |
| Frontier reviewer | The shared independent reviewer | High; medium for a Light-tier review, which changes no rule, gate, or authority | Never downgraded by plan or budget. If none is available, report **Not proved** and wait. |

- Classify at assignment from the files and contracts the lane touches;
  reclassify when evidence shows higher risk. Risk sets the floor, never the
  ceiling.
- The coordinator runs at Standard and moves to Frontier when a lane hits a
  frontier trigger, it must disposition a High or Critical, or it performs a
  delegated merge or a destructive-operation go/no-go read.
- Set effort explicitly; defaults differ between clients and releases.
  Effort above high needs measured gain.
- **Premium-class models are excluded by default for every role**:
  coordinator, maker, and reviewer alike. A premium-class model is one priced
  and positioned above the frontier tier. Use one only when the responsible
  person explicitly asks for it, in a rare situation, and record that request
  in the lane brief and model record.
- Fast or priority service modes trade usage for latency and are off by
  default. Use one only with the responsible person's explicit approval for a
  time-critical task, and record it. Neither is the Fast tier.
- Pick from the tool's own model list at spawn time. Skip options that are not
  listed or that return an authentication or plan error.
- Check the sandbox as well as the model: a maker that cannot write where the
  task writes, ask for approval, or run the task's proof is the wrong maker.
- Before repository code goes to a provider, record that provider's data
  training and retention terms and any required account setting, dated. A
  person who cannot confirm the required setting for their account does not
  send code to that provider.
- If the chosen maker is unavailable or fails once, use the next eligible
  maker. When none remains, ask: wait for a reset or approve extra cost. Never
  switch silently, and never downgrade the reviewer.
- Split maker work only when it pays: a separable part that touches no
  frontier trigger and is large enough for its own brief. Parts run one after
  another in the lane's worktree, and the pull request gets one frontier
  review of the whole diff.

### Reviewer eligibility

Which providers may act as the independent reviewer is narrower than which may
make, and it is an owner decision. Only a model from an owner-qualified
reviewer provider clears a candidate; a model from any other provider may make
but never clears. A provider joins the reviewer list only after a recorded
re-qualification, such as a blind comparison on past changes with known
defects. Frontier work, review, secrets, personal data, and cloud writes stay
on reviewer-qualified providers.

### Budget usage against the plan

Usage limits, not list price, are what stop lanes. Budget against the plan the
responsible person actually has:

- Use models the person's plans already include. Extra billing, such as
  per-token API use or plan overage, needs that person's approval. When every
  plan is exhausted, the person chooses: wait for a reset or approve extra
  billing.
- On an entry-level plan, lower each tier's default effort by one level: a
  Frontier maker that defaults to high runs at medium, Standard runs at low.
  The Frontier reviewer is exempt and keeps its effort on every plan. Raise
  effort only for a task that needs it, such as a hard design or a
  security-sensitive change, then drop it back. Higher-tier plans keep the
  table's defaults.
- Give read-only, search, and mechanical subagents or lanes a cheaper tier or
  lower effort.
- Check the client's usage gauge, such as a `/usage`-style command or the plan
  page, before long work, and route by remaining capacity across the person's
  plans.
- Do not spawn parallel agents on a plan whose limits cannot sustain them.
  Prefer one well-scoped session over several overlapping ones.

Agent usage is a developer cost surface; treat it as
`performance-sensitive-change` treats any cost surface, measured rather than
estimated. Selecting a model for a product workload stays with
`ai-backend-change`.

### Dated tier examples

The client's own model list and installed help win over this table: if they
differ, use the client's, record what ran, and tell the owner, who updates the
table. Tier placement across vendors is a judgment, not a vendor claim. Aliases
can resolve to older models on some hosting routes; record the resolved model.

Examples as of 2026-10-14, read from each vendor's public model documentation;
reverify a row before relying on it when its date is not current:

| Client | Fast | Standard | Frontier maker | Frontier reviewer | Premium class, excluded |
| --- | --- | --- | --- | --- | --- |
| Claude Code | `haiku` | `sonnet` | `opus` | `opus` | `fable` |
| OpenAI Codex | `gpt-6-luna` | `gpt-6.1-sol` | `gpt-6.1-sol` | `gpt-6.1-sol` | `gpt-6-astra` |

On that date the Compass owner had qualified Anthropic and OpenAI models as
reviewers for the owner's own repositories, with xAI and Google models
maker-only. That record grants no reviewer qualification in any other
repository; each repository's owner decides its own.

### Record what ran

Record for every role three values for model and effort: **requested** (what
was asked), **applied** (what the spawning client returned, or `not
confirmed`), and **self-reported** (what the child observed, or `not
exposed`). Never guess.

### Evaluate assignments

Compare assignments by time and actual cost to an accepted result, counting
maker, reviewer, and coordinator usage, review findings by severity, and
repair rounds. Keep failed and abandoned attempts, capacity waits, and missing
measurements. A fast first draft is not an accepted result, and a maker's
self-review cannot establish one.

Compare only runs with comparable scope, acceptance, risk, starting evidence,
client, and proof. Record resolved models and effort, elapsed time, measured
usage, and billed cost where available; unavailable cost stays unavailable.
Never claim savings from token estimates or incomparable runs. Count review
rounds per pull request as a first-class cost. These measurements inform the
next assignment; they do not change the owner's tier floors or reviewer
qualification on their own.

## Done when

- Every assigned lane reached its done state, an explicit stop, or a recorded
  wait with an owner and resume event.
- Every merge followed the repository's authorized path.
- The ledger, status view, and issues agree with the forge.
- Each lane's model record has requested, applied, and self-reported values.
