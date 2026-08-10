---
name: verification-selection
description: Select and report the cheapest reliable proof matching a change's behavior, blast radius, generated outputs, source identity, hosted boundary, or deployment claim. Use before final verification, a ready claim, artifact publication, or deciding between focused, full, hosted, and deployed proof.
---

# Verification selection

1. Name the claim and the natural execution boundary before choosing a command.
2. During implementation, run only the smallest focused proof needed to answer
   the immediate question.
3. Inspect the completed diff, then choose one final path: affected checks for
   scoped work or the repository's single canonical full gate for cross-cutting
   work. Do not stack redundant focused and full proofs.
4. Match behavior to its boundary: pure logic to unit tests, browser behavior
   to a real browser, composed journeys to end-to-end proof, process behavior to
   hostile executable fixtures, config to parser/schema/semantic checks,
   generated output to generation and parity, and distributed artifacts to a
   clean external consumer.
5. Treat a test undiscovered by canonical verification as no coverage.
6. Select the repository's authorized publication mode while preserving all
   pre-existing owner-controlled Git state:
   - **Owner-review mode:** implementation, focused proof, completed diff,
     human review, commit, exact proof, then push or pull request.
   - **Repository-authorized autonomous mode:** explicit repository or task
     authority may include commit and push, but only for task-attributable
     changes and with the same state-preservation requirements.
   For either mode, commit before final publication proof and prove that exact
   clean commit. Make no source, index, or history change between final proof
   and push.
7. Distinguish working-tree, exact-commit, hosted exact-SHA, and deployed proof.
   Never claim a higher level from a lower one.
8. Record command, duration, tree effects, exact identity, cache or environment
   facts relevant to the claim, reruns, duplicate proof, invalidated proof, and
   remaining owner gates.

Staged versus unstaged state does not define task ownership or approval. Inspect
the complete task diff independently of the index, stage only attributable
changes when authorized, and stop if owner and agent changes cannot be safely
separated.

## Inclusive-product and web-performance ladder

For applicable user-facing work, move quality left until the cheapest reliable
boundary owns it:

1. Static checks for structure, names, messages, locale metadata, direction,
   deterministic contrast tokens, architecture, and resource budgets.
2. Real-browser component proof for semantic DOM, automated accessibility
   rules, keyboard behavior, focus, themes, forced colors, reduced motion,
   target sizing, pseudo-locales, and RTL where applicable.
3. Selected composed journeys for keyboard-only flows, dialogs, menus, forms,
   error recovery, 320 CSS-pixel reflow, text-spacing overrides, locale changes,
   and runtime failures.
4. Build and lab performance against exact artifacts and declared regression
   budgets.
5. Exact-SHA deployed acceptance against the real routes, headers, assets, and
   environment.
6. Knowledgeable manual accessibility evaluation, including relevant assistive
   technology, zoom/reflow, contrast modes, motion, color vision, and touch.
7. Field or real-user evidence, including Core Web Vitals at the declared
   percentile and device segments, once sufficient traffic exists.

Select only the levels needed for the claim. Automated accessibility rules are
a subset of accessibility evaluation; they do not establish a conformance claim
without the required knowledgeable human evaluation. Lab performance is not
field performance.

Reviewed 2026-08-10 against W3C WAI
[evaluation guidance](https://www.w3.org/WAI/test-evaluate/) and current
[Core Web Vitals guidance](https://web.dev/articles/vitals).

Use equivalent tools when the stack requires them; preserve the proof boundary,
not a brand name.
