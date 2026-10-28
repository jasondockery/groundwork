---
name: testing-strategy
description: Decides which layer owns a test, when a new test earns its place, how tests are deleted or repaired without losing detection, and how browser, end-to-end, integration, and unit tests stay honest. Use when adding, changing, deleting, generating, or repairing tests, choosing between unit, integration, real-browser component, and end-to-end tests, or placing a test in a CI tier. Not for choosing the final proof for a ready claim (use verification-selection).
---

# Testing strategy

Tests resemble usage, and each behavior has one owning proof layer. Load
`verification-selection` for the final proof of a claim. Tool names below
(Vitest, Playwright) are examples; keep the boundary when the stack differs.

## 1. Choose the owning layer

Use the boundary table in `COMPASS.md` ("Verification is part of
efficiency") and `verification-selection`. This skill adds:

- User outcomes such as sign-in, routing, reload from URL, and multi-page
  flows belong to end-to-end journeys; focus, keyboard, ARIA state, and
  popovers belong to real-browser component tests.
- Server behavior (handlers, queries, persistence, jobs, sessions) is
  integration against the real database and modules; mock only the network
  edge.
- Pure logic a journey cannot enumerate (permissions, parsers, schedulers,
  money and dates) is unit-tested, with property tests for large input
  spaces.
- Lifecycle edges of wrappers around external CLIs are unit-tested with
  recorded command results (section 6).

Runner and filename do not set the layer. A handler, query helper, or hook
with mocked boundaries is not pure logic; prove its contract where that
boundary lives.

## 2. Admission and deletion

- A new test enters only when no existing layer proves the behavior. If one
  does, extend that test. Record **Protects** (the regression it catches)
  and **Distinct value** (why no existing proof covers it).
- Before adding a parallel mocked suite for a user outcome, consider
  extending an existing journey, but compare each layer's runtime, setup
  cost, and flake rate first; no layer is universally faster. Fewer lines or
  more tests are not evidence of better detection.
- Delete a test only with the code it exercises, or with the replacing proof
  named and "Lost detection: none". Map each removed behavior, negative case,
  and boundary to replacement proof, run old and new on the same candidate,
  and show the replacement fails for the regression it claims. Any real loss
  of detection needs owner approval.

## 3. Test integrity

Before changing a test, name the behavior it proves. Fix in this order:
product, then test, then fixtures, then strengthen the test, and only then
narrow it when it is truly in the wrong layer.

- Never delete, skip, or weaken an assertion, broaden a type, or add a cast
  to get green.
- Generated or self-healed tests are proposals. Reject any patch that weakens
  an assertion, adds a fixed sleep, marks a test skipped or pending, or widens
  a semantic locator to a structural selector. A product regression stays
  red. Never auto-commit generated or repaired tests, and never run a
  self-healer on the blocking smoke path.
- An end-to-end journey derives from acceptance steps a person approved, not
  from the agent's own code, and must fail first against the broken flow.

## 4. Integration honesty

- Database tests run only against an explicitly admitted disposable database
  owned by the run, never against whatever connection string happens to be
  set. Name them so the integration lane, not the unit lane, collects them;
  extract pure logic into a database-free module instead of misclassifying it.
- Fresh disposable databases miss lifecycle states persistent environments
  hold. For any reconciliation or idempotent entry path, pin the second
  invocation, not only the first.
- Testing the function is not testing the feature. A derivation or
  side-effect fix needs one pin through the real entry point down to the
  consumer's own predicate.
- Fixed-clock suites must not depend on data whose timestamps come from when
  migrations ran.
- In shared or deployed environments, create business records only through
  the real interface or API, tagged with the run identity and cleaned up by
  the run; never seed them by direct insert there.
- Elsewhere, create test data through the product's real code path (import,
  API, or UI) rather than hand-written database rows. Integration tests of a
  query or persistence layer are the exception: they may insert directly into
  their own run-owned database.
- Keep all test data synthetic, with no real personal data.

## 5. Browser and end-to-end rules

- Locate by role and accessible name. A name that carries a count or state
  uses an anchored pattern, never an exact string. Use test IDs only when
  role and name are ambiguous.
- Use web-first assertions and wait for user-visible state. No fixed sleeps.
- Assert real DOM state and the actual focus order, not the intended one.
- Prove layout and fit on the platform hosted CI uses, with viewport, scale,
  locale, timezone, and fonts pinned. A pass on a developer workstation is
  not layout proof.
- Every end-to-end spec runs in a named hosted job, or is marked local-only
  with an owner and reason. An unrun spec rots unnoticed.
- Screenshots review theme and layout; they never replace behavior tests.
- Do not repeat component tests in journeys. Promote a journey to the
  blocking smoke tier only if a failure would mean an obviously broken
  deployment; a flaky smoke test is fixed or demoted at once.

## 6. External-CLI lifecycle edges

Wrappers around stateful tools (containers, cloud CLIs, version control,
database utilities) cover: target present and handled; target absent and
skipped; unrelated resources preserved; target blocked by a dependent; a
dependent safe to remove so cleanup retries; a dependent unsafe to remove so
cleanup fails closed; a failed delete reported without broader cleanup; and
output that separates exact values from estimates.

## 7. CI tiers and smells

- Tier by purpose: the change-proposal tier runs smoke, affected journeys,
  and fast integration and blocks; the post-merge tier runs the full journey
  suite and alerts; the scheduled tier runs deep suites and informs. The
  repository owns the time budget for each tier. Timing-sensitive tests get a
  deterministic clock or leave the blocking tier.
- Fix these smells instead of hiding them: overridden console error or warn,
  filtered framework warnings, test-only branches in production code, and
  silent logging sinks.
- Re-importing a heavy module graph inside every test is a load-dependent
  flake. Import once at module scope and vary behavior through mocks.

## Report

For each coherent new or changed test group, record **Protects**, **Boundary
exercised**, **Distinct value**, and **Proof** (focused command and result,
plus the red control where applicable). List any verification-surface change
separately in the change description.
