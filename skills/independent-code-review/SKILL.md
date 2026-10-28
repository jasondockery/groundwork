---
name: independent-code-review
description: Runs the maker/checker review loop on a frozen candidate with a separate read-only reviewer, covering author self-review, review lenses, invariant checklist, severity, dispositions, delta rounds, convergence, escalation, and reconciliation of automated-reviewer feedback. Use before marking a pull request ready for review, when reviewing a candidate, repairing review findings, deciding whether review has converged, or handling bot or hosted-review comments. Not for choosing which checks to run (use verification-selection), not for who may post a review or merge (use repo-contribution-etiquette), and not for supervising several lanes (use agent-orchestration).
---

# Independent code review

A candidate is reviewed by someone who did not write it, from a frozen state,
with evidence for every claim. A review with no findings is not proof of
correctness, and missing evidence never counts as clear.

Load `reviewable-agent-workspaces` for the workspace and its review surface,
`verification-selection` for proof, and `shift-to-authority` for its required
field on a substantial review. Load `repo-contribution-etiquette` before any
review comment, reply, or thread resolution goes out. Apply those contracts
without copying them here.

## Roles

- **Maker:** the author. Edits, self-reviews, freezes, repairs. Never clears
  their own candidate.
- **Reviewer:** a separate context that authored none of the candidate and
  never edits. It reads; it does not stage, switch, commit, or run mutating
  commands in the maker's checkout. A same-conversation pass, a different
  model in the same context, or a text-only report with no source reads is not
  independent review.
- **Checker:** deduplicates and classifies findings and returns them to the
  maker. In a single lane the responsible person or the maker's supervisor
  checks; with several lanes the coordinator does (`agent-orchestration`).

Verify the reviewer's effective tools, not its configuration: no file writes,
no shell mutation, no repository-tool network. Web lookups are allowed only as
reads that send no code, secrets, or personal data. If a read-only reviewer
cannot be established, report **Not proved** and the next supported action.
Never substitute a same-context pass or broaden tools to obtain clearance.

## 1. Self-review before freezing

Once, before the candidate is first frozen for review, the maker records
`file:line` or `n/a — reason` for each item:

1. **Acceptance:** every acceptance criterion and owner decision maps to code
   or the delivered artifact, with exact names, labels, counts, and persistence.
   Anything not delivered is stated in the pull request body.
2. **References:** every removed or renamed route, label, export, flag,
   environment variable, or identifier is searched across tests, configuration,
   docs, skills, fixtures, and comments; stale hits are updated or justified.
3. **Consumers:** callers of changed shared code, including unchanged readers,
   are traced and summarized by behavior.
4. **Tests:** a committed, runnable test fails when the behavior is reverted
   and asserts the observable effect against the real producer.
5. **Docs and comments:** adjacent docs, comments, specs, and the pull request
   body agree with the code.
6. **User-facing surfaces:** shared components and the repository's interface
   rules are used. Load `inclusive-product-foundation` for any user-facing
   change.
7. **Repository rules:** the repository's own guarded conventions hold.
8. **Guards run:** affected checks, including unchanged consumers', ran with
   recorded commands and results.

Group equivalent matches by scope and rationale without dropping a distinct
behavior. Disclose discovery limits; a material requirement without evidence
stays **Not proved**.

After a finding, repairs get a **delta self-check**, not the full list again:
check the changed lines against the findings they address and sweep the same
failure class through sibling entrypoints, helpers, consumers, tests, and docs.
Record the searched scope, remaining instances, and evidenced exceptions.

## 2. Size and depth

Split a candidate that is too large to review well, or that spans unrelated
risk areas, into stacked slices that each keep their producer, consumers,
docs, and tests together. For a refactor, plan the whole system first and get
that plan accepted, then deliver slices that cite it, so splitting never hides
a dedupe across slices. The repository sets the size thresholds.

Depth scales with risk class, never down within a lane:

- **Full:** trust roots; authority, merge, delegation, or review rules;
  consent or receipt admission; credentials and access control; production;
  destructive operations; migrations; security; concurrency or shared state;
  proof selection.
- **Standard (default):** user-visible behavior, shared packages, a gate,
  guard, or required check.
- **Light:** docs that change no rule, tests that change no assertion of a
  gate, comments, tooling with no gate, authority, or destructive effect.

The maker proposes the tier; the reviewer confirms or raises it. Doubt or
disagreement takes the deeper tier. A mixed candidate takes its deepest class.

## 3. Freeze the candidate

Record the integration merge base, head, tree, and an identity for staged,
unstaged, and intended untracked files. The packet contains the complete
diff against the merge base, the intended pull request body, the full
acceptance criteria and owner decisions copied locally, the self-review, proof
receipts, and every earlier finding with its fix or rebuttal.

Never review a moving tree. If the candidate changes during review, mark the
round invalidated, keep the inspected identity, and refreeze. An advance of the
default branch that leaves the merge base and reviewed assumptions unchanged
does not invalidate a round.

## 4. Review

Round 1 inspects the complete candidate and its affected consumers. Report
under these headings, in order: **Verdict; Reviewed head; Spec; Standards;
Findings; Loaded inputs; Not proved.**

- **Spec:** does the candidate do what the acceptance criteria and pull request
  body ask? Report missing or partial requirements, unrequested behavior or
  removals, and requirements that look implemented but are wrong, quoting the
  source line. With no spec, say so under **Not proved**.
- **Standards:** does it follow the repository's documented rules and the
  checklist below? Cite the rule for each finding.

Keep the two axes side by side; one must not mask the other. Inside one report,
cover three lenses as sections:

- **Impact and consumers:** follow changed producers through unchanged
  importers, re-exports, loaders, tests, configuration, and docs; search
  removed names independently of any scanner.
- **Correctness and security:** trace entrypoints, helpers, callers, failure
  handlers, cleanup, and publication, including retries, interruption,
  concurrency, and combined failures. Never read secrets or protected records
  to prove a hypothesis; use source reasoning and synthetic fixtures.
- **Spec and acceptance:** map each criterion item by item to code.

The correctness lens records four risk traces in every round, including repair
rounds, each with the owning contract, enforcing `file:line`, and a reachable
counterexample, or `n/a — reason`:

| Risk | Trace |
| --- | --- |
| Check-then-act and lock order | Checks through effects, revalidation, and acquire/release order, including retry and cleanup paths. |
| Fail-open inputs | Malformed, empty, missing, unreadable, and partial inputs through admission; a valid empty set differs from unavailable evidence. |
| Reruns and partial failure | Interruption and repetition before and after effects: idempotency, retained state, sole-copy recovery, unknown outcomes. |
| Sibling sweep | The same failure pattern through equivalent entrypoints, wrappers, and unchanged consumers. |

### Invariant checklist

Round 1 Standards records evidence or `n/a — reason` for every row.

Core, every review:

- Stale references after removal or rename.
- Consumers of changed shared code, including unchanged readers.
- Acceptance criteria item by item; an unrequested removal is a finding.
- Tests prove the behavior: reverting it fails a committed test, and each
  rejected input has a negative control.
- Docs, comments, and the pull request body match the code.
- User-facing behavior and accessibility in every affected state.
- Repository rules enforced by the repository's own guards.
- Bounded lists: a loop that handles only the first N entries pages through
  the rest across runs, proved by a test.
- Severity: every finding carries one, and every High or Critical stays
  visible through merge with its fix or rebuttal.

Risk, assess each:

- Trust roots and self-certification: an evaluator cannot authorize itself.
- Fail-closed admission of unreadable, missing, or mistyped input.
- Repository-, stage-, or account-scoped identifiers that could be swapped.
- Check-then-act and concurrent-write races.
- Registry pins or fingerprints that must change when guarded files change.
- Tests weakened or assertions rewritten; a negative assertion names the
  expected error, and its fixture proves the precondition first.
- Destructive or write paths without authority, ownership, or safety checks.
- Missing detection: a deliberate break makes the retained test fail on its
  claimed platform.
- Consumer, export, build, and deployment wiring through the real entrypoint.
- Bounded resources under admitted population, concurrency, and deadlines.
- Retry, failure, and outcome contracts, including unknown write outcomes.
- Diagnostic accuracy: reports never manufacture healthy or missing evidence.
- Data integrity and lifecycle under round-trips and failure between phases.
- Confidentiality: forbidden content never reaches reports or logs.
- Clarity that changes no behavior.

### Findings

Each finding names its ID, severity, `file:line`, the violated contract, a
reachable trigger, expected and actual behavior, consequence, and affected
scope, backed by reproduction or a concrete source path. Label an unconfirmed
concern as such. Style preferences, unreachable cases, and existing tool
diagnostics are not defects. A defect is never relabeled optional to obtain
clearance.

| Severity | Meaning |
| --- | --- |
| Critical | Data loss, security exposure, or authority bypass reachable now. |
| High | A reachable correctness or contract failure in the stated scope. |
| Medium | A real defect with limited reach, or a missing required proof. |
| Low | A minor defect or gap that does not change the claimed behavior. |
| Nit | Wording or clarity only. |

Report every finding seen in the round at once. No finding quota exists.

## 5. Check and repair

The checker classifies each finding **valid**, **false positive**, **already
fixed**, or **needs human**, with evidence. Valid findings return to the maker
in one batch. A false positive needs an evidenced rebuttal; an already-fixed
claim needs the fix and its consumers read. A needs-human item names the
deciding role and stays open until that role decides.

The maker fixes each valid finding in a named commit or rebuts it with
`file:line` evidence, records the delta self-check, and refreezes. One batched
repair per round, never one push per finding. A claimed fix is unproven until
the committed implementation, test, and consumers are read; an uncommitted
probe proves nothing.

## 6. Later rounds and convergence

Later rounds go to the same reviewer context when it can persist, with the
prior findings. They verify each prior disposition, review the repair delta and
its consumers, apply the four risk traces to the delta, and re-inspect
unchanged code only where a caller, contract, dependency, or configuration
assumption changed. Unchanged coverage may be inherited in one justified line.

A candidate **converges** when a round raises no new Medium-or-higher finding
and every prior Medium-or-higher finding is fixed with a named commit or
rebutted with evidence. Repeat rounds without per-round approval until it
converges. Ticketing or deferring a Medium-or-higher finding does not resolve it
and is never a clean round. A Low or Nit raised after round 1 is fixed when
trivial, otherwise ticketed and listed; it neither forces another round nor
blocks convergence. Where `repo-contribution-etiquette`'s standing workflow
applies, a review is clean only when every finding, Low and Nit included, is
fixed or rebutted, so fix them rather than ticketing them. A fix that touches
only Low or Nit findings after convergence gets the narrow-delta self-check
below, not another round, unless it weakens a check.

The repository sets an expected round budget and a hard ceiling. Count every
completed round, including failed ones; never reset the count on a new head,
reviewer, or publication. An attempt that ended without a report is not a
round but stays in the record. When the repository sets no ceiling, ask the
owner to set one before the second repair round and escalate after every
round until one exists; review never runs unbounded.

Escalate to the owner, with the specific choice, only when:

- the reviewer rejects the same rebuttal in two consecutive rounds;
- a fix needs a product or architecture decision;
- the same High or Critical survives two repair attempts;
- a finding shows exposure in a live system;
- the reviewer changes, or new scope enters the candidate; or
- the loop reaches the hard ceiling.

Only the owner may direct that remaining Medium or Low findings be ticketed at
the ceiling. A High or Critical stays with the owner. Reaching the ceiling is
not a lane failure, and a ticket is never reported as fixed.

Narrow deltas that only add a fail-safe, only change tests or docs without
weakening an assertion, or only make a tool report more need no extra
round: self-review the delta and record its scope and checks. A change
that weakens a check or expands authority always gets a round.

Reuse coverage for unchanged reviewed bytes only while callers, contracts,
dependencies, configuration, and integration assumptions still hold; record
the evidence and the head mapping. Under those conditions, a clean merge of
the default branch that shares no files with the candidate needs no new round.

## 7. Automated-reviewer feedback

Automated or hosted review is optional input unless the repository requires
it. When its feedback exists, reconcile it through this same loop:

1. The checker or maker, not the reviewer, retrieves the complete inventory and
   gives it to the reviewer as a frozen input: review bodies, inline comments,
   replies, resolved and unresolved threads, and summary-only or collapsed
   findings that have no thread. Paginate fully (`github-delivery-workflow`).
   Failed or truncated retrieval is **unverified**, never absent.
2. Match each review to the exact head it reviewed. A review of an older head is
   not coverage of the current one.
3. Give every actionable finding a disposition in the right place: a reply in
   its own thread for inline findings, a source-linked ledger for summary-only
   ones. Fixed names the commit; not-applicable gives evidence; deferred names a
   ticket and stays listed. A resolved thread or a later review that omits a
   finding does not dispose it.
4. Preserve each finding's own severity; missing severity is unverified, not
   Low.
5. Batch valid fixes into the next round. The automated reviewer keeps its own
   round budget, separate from the local one; neither resets the other.
6. Never present local review as the automated reviewer's output, and never fill
   in a missing automated result.
7. Hosted review is asynchronous. Continue other work or return control; do not
   poll during editing, proof, or commit.

## 8. Record the result

The review record for the final head states the reviewed base, head, and tree;
the review tier; each round with its head, completion time, and reviewer
session; the reviewer's requested, applied, and self-reported model and effort
where exposed, marking `not confirmed` or `not exposed` honestly; the inputs
actually loaded; every High and Critical finding with its fix or rebuttal; the
round count when it exceeded the expected budget; ticketed findings; and
**Not proved**. Keep inspection, reproduced defects, executed proof, and
deployed evidence separate, reported as `verification-selection` requires.

When a valid finding escaped review, record its checklist class. When the same
class escapes repeatedly, sharpen the checklist or add a guard through
`field-failure-backpressure` and `shift-to-authority`.

## Done when

- The reviewer was separate, read-only, and not the author.
- Every round's report has every required section and checklist row.
- No Medium-or-higher finding is unfixed, unrebutted, or only ticketed, unless
  the owner directed that disposition at the ceiling. Where the standing
  contribution workflow applies, no finding of any severity is.
- Automated-reviewer findings, when present, all have dispositions.
- The record lists what was not proved.
