---
name: system-update-orchestration
description: Select and classify the exact update set before acting, and report only what the run proved. Use when changing update-all, groundwork-update-run, Homebrew install/upgrade/repair logic, mise upgrades, chezmoi synchronization, update receipts, package scope, or supply-chain policy.
---

# System Update Orchestration

One rule governs everything here:

> **Select and classify the exact update set before acting. Never run a broad
> command and infer afterwards what it probably did.**

Read `skills/safe-mutating-cli` first — argument handling, consent, and receipt
honesty live there. This skill covers what is specific to updating a machine.

## Ownership is explicit

Pick one and make the command name, help, implementation, and receipt agree:

```text
A. Groundwork-owned packages only     — derive the set from the rendered Brewfile
B. every eligible installed package   — say so, and warn that hand-installed
                                        packages are in scope too
```

An unqualified `brew upgrade` is model B. Calling that "the Groundwork-managed
environment" in help text is a mismatch users will discover the hard way.

## Selection and trust are separate

`--require-sha` is a **failure policy, not a candidate filter**. It aborts on a
cask that ships no checksum; it does not quietly drop it and continue. So this
combination is a trap:

```bash
brew upgrade --require-sha --greedy-auto-updates   # WRONG
```

`--greedy-auto-updates` widens the candidate set to self-updating casks, which
commonly include `sha256 :no_check` ones. Verified 2026-07-20 on a real
machine: this plan included `google-chrome`, the exact cask
`scripts/audit-brew-casks` keeps out of every Brewfile and hands to its own
consent-gated installer. The safety flag did not filter it out.

Build an explicit token list instead:

```text
1. upgrade formulae
2. determine the casks in scope (per the ownership model above)
3. bulk-query their metadata ONCE: brew info --json=v2 --cask <tokens...>
4. classify
5. pass only eligible tokens to: brew upgrade --cask --require-sha <tokens...>
6. report the rest without asking Homebrew to touch them
```

## Classification

```text
ordinary versioned + checksummed   eligible by default
self-updating + checksummed        eligible only under explicit opt-in
no checksum                        never; refused by integrity policy
version :latest                    never; these ship sha256 :no_check
pinned                             never; the user pinned it
disabled/deprecated/incompatible   never
unknown                            never; classification unavailable
```

`--greedy-latest` and bare `--greedy` (which implies it) stay banned outright.
`scripts/validate-groundwork` locks this; if the lock must change, change it
deliberately with the rationale, never to make a new patch pass.

## Receipts are epistemically honest

Report categories that match what the run actually established:

```text
attempted and no longer outdated
intentionally excluded by policy   (with the specific reason)
attempted but still outdated
not attempted
classification unavailable
receipt incomplete
```

Rules that are easy to violate:

- **Unknown stays unknown.** "Still outdated" does not prove "vendor-owned". A
  leftover may be pinned, `:latest`, disabled, incompatible, or unexplained.
- **Compare like with like.** A before/after snapshot must use the *same scope
  the upgrade used*. Diffing a full `--greedy` view against a non-greedy action
  reports a universe the command never tried to touch.
- **Do not swallow observation failures.** `2>/dev/null || true` on a state
  query turns a broken observation into an empty successful one. Mark the
  receipt incomplete and say so.
- **Do not overclaim provenance.** A cask leaving the outdated list is not proof
  Groundwork upgraded it; a self-updating app may have updated itself mid-run.
  Prefer "no longer reported outdated" unless the command log confirms it.
- **Name the stage.** A cask bucket is not a receipt for formulae, mise, and
  every other stage. Label it for what it covers.
- **Policy is not impossibility.** "Only its vendor can update it" is false —
  Groundwork *refuses* it because it has no checksum. Say that.
- **Never hardcode vendor metadata.** Checksum and auto-update status change.
  Query them per run; keep specific cask names out of long-lived help.

## Retries preserve policy

The repair/retry path receives the identical candidate list, checksum policy,
update lane, platform conditions, and user-approved scope as the first attempt.
A flagless retry is a silent bypass of the policy the first attempt enforced.

## Release-age floors

`mise upgrade --minimum-release-age 5d` mirrors the renovate-config preset and
fails closed when mise cannot enforce it. The escape hatch is narrow by design:
pin an exact version, which the floor exempts.

Homebrew has no equivalent, and the case for adding one is weak: casks are
curated and reviewed, the install set is hand-picked with no transitive blast
radius, `--require-sha` already covers artifact integrity, and most casks
self-update anyway so a Homebrew-side delay would not hold the software back.
Do not build a first-seen ledger to simulate one.

## Required fixture matrix

| Fixture cask              | Default | Explicit opt-in | Receipt                      |
| ------------------------- | ------- | --------------- | ---------------------------- |
| versioned + checksummed   | upgrade | upgrade         | eligible                     |
| self-updating checksummed | skip    | upgrade         | policy-specific              |
| no checksum               | skip    | skip            | excluded by integrity policy |
| `version :latest`         | skip    | skip            | latest lane excluded         |
| pinned                    | skip    | skip            | pinned                       |
| unknown metadata          | skip    | skip            | classification unavailable   |

Plus: a no-check cask must not abort unrelated upgrades; before/after query
failure marks the receipt incomplete; retry scope matches the first attempt;
no `jq` yields "reason unavailable" rather than a guess; the macOS-only path is
explicit on Linux; and no outdated casks yields a concise successful receipt.

Red-prove every branch. Run `scripts/validate-groundwork` and report what ran.
