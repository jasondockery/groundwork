---
name: acceptance-evidence
description: Prepares acceptance test steps and acceptance evidence for a work item so a verifier who does not read code can run them and record a result, covering where to test at an exact revision, account and records, numbered steps with expected results, coverage annotations, a result template, evidence captions, blocked and failed handling, and honest attribution. Use when writing or revising QA or acceptance steps, preparing an acceptance handoff, recording or summarizing an acceptance result, or deciding whether work is accepted. Not for choosing automated proof (use verification-selection), and not for the issue and pull request sequence (use github-delivery-workflow).
---

# Acceptance evidence

A handoff gives a verifier working links, the right records, clear steps, and
a short way to report results. The verifier records acceptance. Preparing
steps, passing tests, or merging is not acceptance.

Load `verification-selection` for automated proof and its boundaries, and
`inclusive-product-foundation` for user-facing surfaces. Load
`repo-contribution-etiquette` before posting anything to the forge.

## Where it lives

Keep acceptance steps and their current per-step results on the delivery
issue itself, not in a separate acceptance issue. Comments hold dated,
attributed test sessions and retest history. Keep live status, verifier, and
outcome in the repository's project fields, not as headings in the body. Give
the section a stable anchor and link to it directly; verify the rendered
target exists before publishing the link.

Draft steps may appear during refinement. Finalize them from the final
implementation before the item is marked ready for acceptance, and refresh the
affected steps whenever tested behavior changes.

## Prepare from the actual change

Read the acceptance criteria, the final diff, and the surrounding user flows.
Verify visible labels against source.

Put these at the top, before any steps:

- **Prepared by:** a person, or `agent-prepared on behalf of @user`. An
  account name or issue assignee alone does not establish who prepared it.
- **Target and revision:** the successful deployment record, its URL, and the
  exact commit, resolved from deployment records, never guessed.
- **Account and role:** the role and which test login to use; never a
  credential.
- **Required records:** direct links or precise selectors. A homepage is not
  enough when a journey needs a particular record.
- **Prerequisites:** the blocking issues and their state, and anything still
  needed with its next action and owner.
- **Where to test:** one row per page, with a deep link for each environment
  the repository uses. Write `Pending deployment` with its prerequisite rather
  than a stale link, and re-resolve when the target revision changes.

Take environment values such as folders, tool versions, and setup commands
from the repository's canonical setup docs by link. Never copy or invent them.

## Write the steps

Give each journey a short list of stable step IDs such as `A1`, `A2`. Each
step is one action followed by its observable result: **open `<deep link>` →
do X → expect Y**, quoting the exact on-screen text or resulting URL. Keep the
link inside the step. Preserve step IDs when wording changes so earlier
findings stay readable. Never silently weaken an expected result; propose a
change to the acceptance criteria before editing them.

Annotate each journey with its coverage:

- `Coverage: Automated — <test file> — <exact test title>`, after reading the
  test and confirming it asserts this behavior; a similar filename or an
  opinion is not coverage.
- `Coverage: Manual only — <reason>`.

Local tests do not prove deployed behavior.

In shared environments, steps never permanently change shared reference data.
Use edits that are reverted in the same session (note the value, change it,
check, restore it exactly), or test in a disposable environment.

## Result template before the steps

Place a short result template above the steps so verifiers do not hunt for
it:

```markdown
## Acceptance result

- Tester and date:
- Tested revision and environment:
- Overall: PASS | CONCERN | FAIL | NOT RUN
- Checks completed: <IDs or ranges>
- Checks not run: <IDs and reasons, or none>
- Findings: <step ID, expected and actual, evidence or linked issue>
- Retest: <earlier finding link and affected steps>
```

Then the steps table:

| Step / criterion | Do this → expect this | Result | Finding / evidence |
| --- | --- | --- | --- |
| A1 / AC1 | Open [page](<deep link>) → save a draft → the draft appears in the list | Not assessed | — |

The verifier edits the Result and Finding cells as they test and posts the
short result as a dated comment linked from the affected rows. Never require a
duplicate table in comments, and never overwrite a simultaneous human edit.

## Evidence

Put screenshots, recordings, and command output in an **Evidence** section
below the steps, captioned with step IDs, page and state, environment, tested
revision, and capture time. Use uploads or links the verifier can open; a
local file path is not shared evidence. Capture each meaningfully different
state once; reuse matching evidence from implementation instead of rerunning a
build to produce another image. Label illustrative examples separately from
observed results. Nonvisual work supplies linked commands, output, or records.

A screenshot cannot prove a screen-reader announcement and never replaces the
recorded acceptance result. When only visual confirmation remains, report it as
`verification-selection` requires.

If an environment, record, or capture capability is unavailable, name the
missing prerequisite and its owner. Never invent an image, link, deployment,
or PASS.

## Results and outcomes

- **PASS:** the expected behavior was observed.
- **CONCERN:** something needs a disposition; it is not automatically a
  failure.
- **FAIL:** an acceptance criterion was not met.
- **NOT RUN:** a prerequisite stopped the session. Missing data or a missing
  environment is never a product failure.

When any step is blocked by another issue, the whole item is blocked: add the
native blocked-by relationship, name the cause in the blocked rows, test
nothing until it clears, then run every step in one pass. A change to tested
behavior invalidates the affected earlier pass until retested; keep earlier
evidence and unaffected results. An existing failure stays failed until an
accepted retest covers the affected behavior and revision. Unrelated defects
and new scope become linked issues, not expansions of acceptance.

## Acceptance routes and authority

The repository names its acceptance routes, such as team, developer, and
automated acceptance. Mixed work takes the strictest applicable route.
Automated acceptance needs named evidence at the tested revision and a person
accountable for its scope. Decision records and similar deliverables that ship
no behavior may be exempt where the repository says so.

Agents prepare instructions and summarize attributed evidence. An agent never
claims human acceptance it did not observe, never sets an acceptance outcome
or verifier by its own judgment, and never sets a failure. After an authorized
field write, read back the exact item and report a mismatch instead of writing
again. A board position or a write acknowledgement is not the stored result.
Do not post reminder comments or unsolicited mentions.

## Done when

- The handoff names an exact revision, working links, the account role, and
  required records, with no credentials.
- Every step has an ID, one action, and an observable expected result, and
  every journey has a coverage annotation.
- The result template sits above the steps.
- Evidence is captioned and reachable by the verifier.
- Nothing claims acceptance that a verifier did not record.
