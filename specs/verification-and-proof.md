# Verification, proof identity, and delivery

The decision rules an agent needs *before* running anything live in `AGENTS.md`
("Done means verified"). This spec holds the detail: how to choose a command,
what makes a receipt reusable, and what has to be reported at handoff.

## Owner verification hold

An explicit owner instruction to pause before verification overrides the normal
ladder. While the hold is active, inspect source and diffs but do not run tests,
linters, formatters, hooks, validators, builds, or proof commands. Before asking
to resume, present the exact proposed commands, estimated durations, overlap or
duplication, whether each command is diagnostic or final proof, and the tree
identity it will prove.

## Verification economics

Finish the accepted implementation and inspect the complete diff before starting
expensive proof. During implementation, use only the smallest focused check
needed to answer the question at hand.

Final proof chooses exactly one path:

- An ordinary scoped change runs `static` plus its affected named suites once.
- A validator, shared-runner, bootstrap, cross-platform rendering, CI-routing,
  release, or otherwise genuinely cross-cutting change runs only the
  seconds-long Bash/Python syntax preflight, then `full` **once**.

Never run every focused suite, and never run standalone receipt tests followed
routinely by `full` — `static` already owns those receipt contracts.

If `full` exposes one lane defect, fix it, run that focused lane to diagnose,
then rerun `full` once on the unchanged final tree.

For an owner-authorized publish, reconcile the complete index and create the
intended local commit before final proof. Run final proof on that exact clean
commit, then make no source, index, or history change before pushing it. A
modified-tree receipt can support diagnosis or handoff, but it cannot prove a
commit created afterward.

## Proof identity and timing

A reusable receipt identifies the repository, exact commit or content-addressed
index and working tree, complete command and arguments, relevant configuration
hash, toolchain or lock hash, suite version, and platform. A receipt missing any
required identity field is historical context, not reusable proof.

Until Groundwork owns a receipt binding every required identity input, local
proof is not reusable; exact-SHA CI proof is reusable only for that exact SHA.

At handoff, name the affected surfaces, the selected commands and why they cover
those surfaces, and any repository-wide contract the scoped proof did not
exercise. Also report best-effort implementation time, measured verification and
hook time, every command and duration, the slowest check, reruns, duplicate proof
time, invalidated verification time, and whether the final tree is what passed.
When implementation was continuous enough to make the comparison meaningful,
include the verification-to-implementation ratio.

Call out any verification over 5 minutes, hook over 1 minute, or final
verification sequence over 10 minutes as an advisory economics problem, never as
a reason to weaken correctness.

## Suite budgets and deadlines

Advisory suite targets: `static` 55s, `update` 90s, `docker` 75s,
`platform-macos` 15s, `full` 270s. Treat the first five representative
final-tree runs as advisory baseline evidence; a later regression creates a
productivity warning and a backlog item, not permission to remove proof.

Validator-only policy commands have a 20-second process-group watchdog. Every
suite also has a whole-suite deadline plus bounded cleanup: 540 seconds for
`static` and `docker`, 840 seconds for `update` and `platform-macos`, and 300
seconds for routine `full`. A nightly or forensic run may request a larger
ceiling explicitly with `--deadline-seconds`.

The supervisor's inherited PID marker prevents recursion only when it names the
exact immediate parent; it is neither a supported disable switch nor a
hostile-input security boundary. Full-suite composition hands focused children
that exact-parent marker so the outer deadline owns the complete transaction. A
private owner-liveness pipe makes an abruptly terminated outer runner trigger
bounded cleanup of its complete process group.

## Hook budget

Repository hooks, when present, stay local and cheap: pre-commit targets staged
files and should finish within 10 seconds; pre-push runs affected or focused
proof and should finish within 2 minutes. Full suites, Docker builds, and
network-backed proof belong in explicit validation or CI, not in a hook. Reuse
prior proof only when every proof identity field matches exactly.

## Claim honesty

Say what a green run actually exercised. Distinguish a unit/fixture proof, a
rendered-artifact proof, a warm-cache integration run, an offline deterministic
run, a cold-network smoke, and a real field receipt. A proof must not claim more
than it ran; if caches were warm, the receipt says so.

A piped command's exit status is not proof the primary command succeeded —
`cmd | tee` reports `tee`'s status. Bash-compatible verification scripts set
`set -euo pipefail`, and any pipeline through `tee`, `tail`, or a filter captures
and reports the authoritative status explicitly.

A template that passes in this repo is not proven until its **rendered** output
passes under the consumer's configuration. Validate each supported profile after
rendering — syntax, package/cask policy, and semantic invariants — not the
template source alone. Do not depend on byte parity between files that different
formatter configurations touch: unify the settings or compare intended semantics.

For dotfile changes, prefer a focused `chezmoi diff` or targeted `chezmoi apply`
check when practical. For keyboard and terminal changes, verify the live binding
or config where possible, not just the source file.

## Delivery

Classify every handoff as release-affecting or not, and treat delivery as part of
"done". Groundwork releases are SemVer tags plus GitHub Releases (`PLAYBOOK.md`,
Versioning & Releases): a change that alters what a fresh install or `update-all`
delivers is release-affecting.

An unreleased feature reaches no user, so release-affecting work is not done
until it ships — cut the release once `main` is green (see the `cut-release`
skill); do not merely propose it and stop. Batching several release-affecting
changes into one release is fine, but then name the pending batch and the version
it will ship under so it is not silently deferred.

Internal automation, docs-only cleanup, and dependency plumbing are not
release-affecting — say "no release cut" and why. Never bump a version for a
milestone; only for a changed consumable artifact.
