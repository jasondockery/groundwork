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
6. For publication, commit first and prove that exact clean commit. Make no
   source, index, or history change between final proof and push.
7. Distinguish working-tree, exact-commit, hosted exact-SHA, and deployed proof.
   Never claim a higher level from a lower one.
8. Record command, duration, tree effects, exact identity, cache or environment
   facts relevant to the claim, reruns, duplicate proof, invalidated proof, and
   remaining owner gates.

Use equivalent tools when the stack requires them; preserve the proof boundary,
not a brand name.
