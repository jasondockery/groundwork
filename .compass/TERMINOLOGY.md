# Shared terminology

These definitions establish cross-repository meaning without replacing
domain-specific states.

## Outcome states

- **Current** — the observed subject already satisfies the applicable accepted
  authority; no change is required.
- **Updated** — the intended change was applied and the stated proof for that
  change passed.
- **Deferred** — valid work was intentionally postponed by a named policy,
  dependency, or owner decision; the next trigger is explicit.
- **Skipped** — a step did not run because a declared condition made it
  inapplicable. A required step cannot be converted to skipped to obtain green.
- **Review** — evidence is ready for human judgment; acceptance is not implied.
- **Warning** — work completed or evidence exists, but a declared non-terminal
  risk, soft threshold, or soft budget requires attention.
- **Failed** — an authoritative requirement or hard budget did not pass.
  Partial success does not change the outcome. Repository policy determines
  whether a measured threshold is advisory or required; the word "budget"
  alone does not determine the state.
- **Pending repair** — a known failure has an owned correction path but that
  correction has not yet passed its required proof.

## Proof terms

- **Focused proof** — the smallest reliable check that establishes the affected
  behavior or diagnoses one failure mode.
- **Full proof** — the repository's canonical broad gate for the relevant
  cross-cutting claim. It is not a stack of every available command.
- **Working-tree proof** — evidence bound to the observed source, index, and
  working-tree bytes. It does not prove a later commit.
- **Exact-commit proof** — evidence bound to one clean immutable local commit
  and the declared proof inputs.
- **Hosted proof** — evidence from the hosted system, bound to its exact source
  SHA, run identity, attempt, and environment.
- **Deployed acceptance** — bounded evidence against the actual deployed bytes
  and environment, bound to the deployed source identity.

## Inclusive-product evidence

- **Accessibility target** — the named standard and level an applicable
  surface is intended to satisfy, such as WCAG 2.2 Level AA. A target is a
  requirement, not evidence that conformance has been demonstrated.
- **Automated accessibility gate** — machine-checkable evidence for the rules
  and states the configured tool can observe. A passing gate is not a WCAG
  conformance claim.
- **Manual accessibility evaluation** — documented knowledgeable human
  evaluation at the relevant keyboard, assistive-technology, visual,
  cognitive, motion, zoom/reflow, and device boundaries.
- **Conformance claim** — an assertion that an identified scope conforms to a
  named standard and level, backed by the evaluation and documentation that
  standard requires. Automated evidence alone is insufficient.
- **Lab performance evidence** — a repeatable observation in a controlled
  environment. It is not field or real-user evidence.
- **Field performance evidence** — observed real-user behavior bound to the
  declared population, percentile, device segments, period, and product
  identity.

## Authority terms

- **Field failure** — a defect first observed outside the normal local proof
  boundary, such as hosted CI, another platform, a generated consumer, a
  release, or deployment.
- **Owner authority** — an irreversible, privileged, policy, product, or risk
  decision reserved for the accountable owner.
- **Generated authority** — a canonical source whose repository-owned generator
  produces derived bytes; generated outputs are not edited independently.
- **Product capability** — user-meaningful behavior owned by a product, not by
  shared engineering doctrine.
- **Compass contribution** — a repository-owned shared-engineering principle or
  reusable procedure proposed for canonical adoption into Compass rather than
  silently redefining it locally.

`Workspace Contract contribution` and the machine field
`contractContributions` are reserved for Roost's separate generated-workspace
concept: instructions, specs, skills, checks, docs, adapters, and similar
materials installed capabilities contribute to a workspace.
