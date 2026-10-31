---
name: github-delivery-workflow
description: Carries one work item through GitHub from issue to release, covering issue shape and grain, branch and pull request linkage, project status, decision requests, acceptance handoff, merge follow-through, release, efficient GitHub API use, and handoff contents. Use when shaping or decomposing an issue, starting a lane, opening or updating a pull request, moving project status, asking an owner to decide, closing work, or writing a status or handoff. Not for whether a write is permitted or who must approve it (use repo-contribution-etiquette first), not for the review loop (use independent-code-review), and not for writing QA steps (use acceptance-evidence).
---

# GitHub delivery workflow

`repo-contribution-etiquette` decides whether a write may happen and whose
approval it needs; load it before any issue, branch, pull request, comment,
project, or review write. This skill is the sequence and shape of the work
once a write is allowed. The repository's own branch names, templates, labels,
project fields, and commands win over the generic defaults here.

Load `reviewable-agent-workspaces` before any branch or commit,
`independent-code-review` before a pull request is marked ready,
`acceptance-evidence` for the acceptance handoff, and `verification-selection`
for proof.

## 1. Shape the issue

Write delivery work in this order, omitting empty optional sections:
**Outcome**, **Why now**, **Done when** (numbered checkboxes, checked when
their evidence is accepted, not when code exists), **Evidence** (how each
criterion will be proven and where), **Not included**, acceptance steps when
needed, **References**. Keep the first screen scannable. Never emit `N/A`,
placeholders, prompts, transcripts, or confidence percentages. Distinguish
facts from assumptions and name a human owner for any blocking decision.

Use native relationships (parent and sub-issue, blocked by, linked pull
request) instead of prose dependency lists. A person approves an issue as
ready when product behavior or commitments are involved; an agent may
recommend.

### Decide the grain

Start with one issue and a task checklist. A child issue is justified only
when it has an independent delivery lifecycle, meaning at least one of:

- a different accountable owner;
- a different repository or independently reviewable pull request;
- a different schedule;
- it can be deferred without blocking the parent outcome;
- it needs its own deployment, approval, or activation;
- its acceptance result is independently useful; or
- it can complete while siblings remain open.

Discovery-then-implementation, many files or technologies, a long checklist,
or a large estimate are not reasons to split. Group connected changes that
share consumers, proof, and rollback in one pull request; split independently
useful outcomes and different risk or ownership boundaries. Before creating
several related issues, show the proposed hierarchy and each child's
independent-lifecycle reason, and create it only after approval.

## 2. Start the lane

1. Confirm the actual branch, worktree, base, and dirty state. Do not infer a
   stale checkout or a naming rule from neighboring folders.
2. Establish the owning issue before the first implementation edit. Reuse an
   existing issue; create one when authorized, otherwise ask while continuing
   read-only work.
3. Start the lane on its own task issue, never on a parent or umbrella. A
   branch linked to an issue can close that issue on merge regardless of the
   pull request body.
4. Create the branch through the repository's tooling or forge linkage, from
   the freshly fetched default branch. One issue, one branch, one worktree.
5. Within delegated authority, add the issue to the project and set its status
   to in progress when work starts now. Never reassign an issue away from a
   person, move it between schedules, or set fields a human owns, such as an
   acceptance verifier or outcome.
6. Use one recognizable lane name, scope first, in the issue and session. A
   session title is a label, not identity.

Keep routine progress in the task checklist and one maintained brief comment:
current decisions with dates and deciders, work state (published head, local
head, clean or dirty, where unpublished work lives), current writer and next
owner, next action, blockers, and out of scope. The brief preserves decisions;
it does not confer authority. Hand over the brief link and work-state identity,
not a transcript. A new comment notifies every subscriber and an edit does not,
so update the maintained comment instead of posting status repeatedly.

## 3. Ask for decisions without stalling

Within the autonomy the repository grants, proceed without asking. Bring in
the owner only for an owner-reserved item, a
material scope change, or one of these triggers: a large candidate whose split
is undecided, a design or architecture choice the issue does not settle, an
authority-area change (trust roots, merge rules, access control, production,
data deletion), or a trade-off two reasonable reviewers would split on. Ask
only what the repository, issue, recorded decisions, and prior pull requests
cannot settle. Record the question, keep building unless redirected, and never
idle.

Put the decision at the top of the pull request in a short block: the
question and its owner, what was checked, **Approve** (the recommendation and
why), **Change** (each concrete alternative), **Reject** (what that means),
the risk, and links pinned to exact lines at a commit. An answer counts only
when the owning role posts or confirms it on the pull request or issue; no
agent infers it or takes it from another agent's message. The pull request
stays a draft until answered.

## 4. Open the pull request

A draft may open early as the declared review surface or recovery checkpoint;
it establishes no review. Mark the pull request ready for review only after
self-review and the review loop have converged (`independent-code-review`),
and the review is clean where `repo-contribution-etiquette`'s standing workflow
applies.
Pushes after that go through the same loop as delta rounds.

- **Title:** the repository's convention, naming one work item.
- **Body:** any decision block first; then intent, the linked issue, related
  work, a release note or an explicit skip, an evidence section listing what
  ran, what passed, and what could not be checked, and explicit non-goals.
- **Linkage:** branch, forge link, and pull request body name the same issue.
  When the repository separates merge from acceptance, use a non-closing
  reference; issues close from their own acceptance evidence.
- **Verification changes:** a change to tests, checks, or gates gets its own
  heading naming the controls touched and the red and green evidence.

Copy the issue's milestone and labels when the repository derives release
notes from them. Keep proof in the pull request's evidence section; the
project reports state and is not the evidence archive. Never link a local
filesystem path from a forge comment.

## 5. Review, acceptance, merge

1. Resolve review feedback through `independent-code-review`, including
   automated-reviewer findings where the repository uses hosted review. Where
   it is declared not used, hosted output is neither awaited nor a merge gate.
2. Finalize acceptance steps from the final implementation with
   `acceptance-evidence`. Review and acceptance can overlap.
3. A merge needs, for one exact head: the repository's required proof,
   converged review, the owner's designated final review with all of its
   findings fixed, zero unresolved threads, no hold, and the merger's
   authority under `repo-contribution-etiquette`. The merger re-reads labels
   and threads immediately before merging, because a head match binds only the
   head. A pull request that needed more rounds than the expected budget is
   flagged in the merge record, never silently accepted.
4. After merge, read the issue state back. If the merge closed an issue whose
   acceptance is not complete, reopen it and record why; merge is not
   acceptance. Record the merge on the issue.

## 6. Release and close

Integration and release are separate acts. Merging integrates; a release is a
deliberate selection of an exact verified commit under the repository's
release model and authority. Deployment identity is the exact commit and its
receipt, not a branch head. Build release notes from native records (pull
requests, issues, tags) and have a person review them before publishing.

Close an issue explicitly from its acceptance evidence, with a comment first:
what was done, where the evidence is, and anything moved to a new issue. Where
the repository allows it, technical, research, docs, and configuration work can
close without manual acceptance when its own criteria are met; product work
keeps its release evidence. Confirm parent and child state rather than assuming
closure cascades. Leave durable truth in code, specs, and decisions, not only in
closed issues or project fields.

## Use the GitHub API efficiently

1. Prefer REST endpoints (for example through the `gh` command line) for issues,
   comments, labels, assignees, relationships, releases, and workflow
   inspection. Use GraphQL only where no suitable REST operation exists, mainly
   project fields.
2. Read narrowly. Resolve a known issue's project item through that issue; never
   list a whole project to update a few items. Request only the fields the
   decision needs.
3. Cache stable schema: resolve project, field, and option IDs once per session
   and refresh once on a stale-ID error. Add or rename a single-select option
   only through the project interface; replacing the option list through the API
   recreates every option with new IDs and clears the field on every item.
4. Use mutation results as immediate verification, then read back only the
   touched items. Batch compatible writes and pace them for secondary rate
   limits. Skip broad post-mutation audits.
5. Watch the budget. Include the rate-limit cost and remaining points in planned
   GraphQL reads, keep a reserve, and refuse broad scans when the reserve is
   low. On exhaustion, stop and report the reset time and the unfinished work.
   On secondary limiting, honor `Retry-After` with bounded backoff. Never switch
   accounts to get more quota.
6. Paginate completely. A failed or truncated read is unverified, never empty.
7. Prefer events and native project workflows over polling or full scans. Which
   identity unattended bulk automation uses is an owner decision; absent one,
   every write uses the account `repo-contribution-etiquette` requires.

Efficiency never grants authority; every write still follows
`repo-contribution-etiquette`.

## Handoff contents

Lead every status or handoff with a short first screen: **Next:** owner and
action. **Changed:** the useful outcome. **Proof:** scope, result, link.
**Blocked:** cause and next owner or event. Omit empty fields and put detail in
a collapsed section.

Then give the lane, exact files, checks run with results on the exact tree or
commit and their scope, pending hosted checks, review status and blockers, and
any shared-control changes, with evidence reported as `verification-selection`
requires. An ownership transfer between writers uses the
`reviewable-agent-workspaces` handoff instead. Read "merged", "approved",
"closed", or "running" back from the forge or a receipt before reporting it, and
never repeat another agent's summary as fact. Link receipts instead of copying
them.

## Done when

- The issue states its outcome, criteria, and evidence, at the right grain.
- Branch, forge link, and pull request name one issue.
- Review converged, and was clean where the standing workflow applies, before
  the pull request was marked ready; acceptance steps match the final
  implementation.
- The merge followed the authorized path and the issue state was read back.
- The issue closed from evidence, or remains open with its next owner.
