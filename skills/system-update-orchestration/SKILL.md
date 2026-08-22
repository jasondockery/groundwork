---
name: system-update-orchestration
description: Select and classify the exact update set before acting, and report only what the run proved. Use when changing update-all, groundwork-update-run, Homebrew install/upgrade/repair logic, mise upgrades, chezmoi synchronization, update receipts, package scope, or supply-chain policy.
---

# System Update Orchestration

Compass's `dependency-change` skill owns the universal authority and consumer
proof procedure. This Groundwork-local extension owns `update-all`, Homebrew,
mise, chezmoi, package selection, retry, and machine receipt semantics.

One rule governs everything here:

> **Select and classify the exact update set before acting. Never run a broad
> command and infer afterwards what it probably did.**

Read `skills/safe-mutating-cli` first — argument handling, consent, and receipt
honesty live there. This skill covers what is specific to updating a machine.

## Ownership is explicit

Pick one and make the command name, help, implementation, and receipt agree.
Groundwork uses model B for Homebrew and Mac App Store inventory:

```text
A. Groundwork-declared packages only  — derive the set from the rendered Brewfile
B. every eligible installed package   — inventory the package manager, classify
                                        every item, and name every exclusion
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
self-updating + checksummed        greedy-aware exact-token lane
no checksum + declared updater     unchanged; accepted vendor coverage
no checksum + unknown updater      unchanged; owner review
version :latest + checksum         greedy-latest exact-token lane
version :latest + no checksum      never; unverifiable
pinned                             never; the user pinned it
disabled/deprecated/incompatible   never
unknown                            never; classification unavailable
```

Evaluate current before privileged-replacement review: a current privileged
cask is current, not recurring noise. Bind no-checksum vendor coverage to the
reviewed Groundwork token policy; metadata flags alone do not grant updater
authority. Match Homebrew's own default: a cask upgrade may quit and reopen a
running app that declares a safe quit action, the same as running
`brew upgrade` directly. An explicit `--no-app-quit` observes running app
artifacts before mutation, passes Homebrew's `--no-quit` guard at every
default cask mutation boundary so an app launched after that observation
also stays protected, and defers only those exact casks — for one invocation;
it is never an ambient environment setting.

Bare `--greedy` stays banned outright. The narrower
`--greedy-auto-updates` and `--greedy-latest` flags may appear only with a
preclassified, installed, exact token list. Candidate selection comes from the
matching greedy-aware `brew outdated` query, so a current 590 MB application is
not downloaded merely because its metadata says it can self-update.

## Always-on apps get relaunched, not just reported

Homebrew quits a running GUI app while replacing its cask and never relaunches
it. `groundwork-apps-start` reopens Karabiner-Elements, Raycast, BetterDisplay,
and Anybox — the always-on set — when installed but not running, and
`groundwork-update-run.tmpl` calls it directly after a successful Homebrew
lane on macOS. This is a deliberate, previously-agreed decision with two
specific reasons, not an oversight:

1. **Keybindings must not silently die.** Karabiner-Elements owns keyboard
   remapping; if Homebrew quits it and nothing reopens it, every remap stops
   working with no error anywhere — the person discovers it by a keystroke
   doing the wrong thing, possibly minutes or hours later, with no link back
   to "I ran update-all."
2. **Gatekeeper approval needs the person present.** A freshly replaced cask's
   first launch may need explicit user approval (Accessibility, Input
   Monitoring, "opened from the internet"). Launching it while the person is
   already at the keyboard watching the update is the one moment that
   approval is cheap; deferred to whenever they next need the app, it is a
   confusing, unexplained prompt with no context.

**Do not "fix" this into report-only** (log what changed, print a command to
run later, never call `open -a` from update-run) to avoid a GUI window
appearing mid-run. That trade was tried and reverted in this same repo
(2026-08) specifically because it reintroduces both failures above. The
launch already explains itself in the terminal
(`echo "${app_name} is installed but not running; opening it so ${reason}."`)
before it happens — that is the fix for "surprise," not removing the launch.
`groundwork-doctor --always-on-apps` (`home/dot_local/share/groundwork/lib/always-on-apps.sh`)
is a separate, additional **read-only** check for between-run visibility; it
is not a replacement for update-all's real relaunch.

## Receipts are epistemically honest

Report categories that match what the run actually established:

```text
attempted and no longer outdated
intentionally excluded by policy   (with the specific reason)
attempted but still outdated
not attempted (pinned, deferred-running, vendor-covered, or owner review)
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
- **Policy is not impossibility.** "Only its vendor can update it" is false.
  Groundwork may accept a declared self-updater as coverage or refuse an
  unresolved no-checksum cask under its integrity policy. Say which was proved.
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

| Fixture cask                         | Automatic disposition            | Receipt                      |
| ------------------------------------ | -------------------------------- | ---------------------------- |
| ordinary versioned + checksummed     | normal exact-token lane          | eligible/current             |
| self-updating + checksummed, outdated| targeted auto-update exact lane  | eligible/current             |
| self-updating + checksummed, current | no mutation                      | current                      |
| no checksum + declared vendor updater| no mutation                      | accepted vendor coverage     |
| no checksum, updater unresolved      | no mutation                      | owner review                  |
| `version :latest` + checksum         | targeted latest exact lane       | eligible/current             |
| `version :latest` + no checksum      | no mutation                      | unverifiable                 |
| pinned                               | no mutation                      | pinned                       |
| disabled/deprecated                  | no mutation                      | explicit reason              |
| unknown metadata                     | no mutation                      | classification unavailable   |

Plus: multiple self-updating casks enter one explicit command; an absent or
current token cannot poison that lane; a no-check cask must not abort unrelated
upgrades; current privileged casks create no recurring review; running apps are
deferred without blocking unrelated tokens unless app quitting is explicitly
enabled; before/after query failure marks the receipt incomplete; retry scope
matches the first attempt; no `jq` yields "reason unavailable" rather than a
guess; the macOS-only path is explicit on Linux; all discovered Mac App Store
updates use exact IDs; and no outdated items yields a concise successful receipt.

Red-prove every branch. Run `scripts/validate-groundwork` and report what ran.
