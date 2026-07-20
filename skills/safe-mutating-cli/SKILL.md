---
name: safe-mutating-cli
description: Validate intent completely before the first side effect when adding or changing any command that mutates machine state. Use when touching an installed command, launcher, runner, installer, updater, repair or cleanup helper, migration, or any script that changes user or machine state.
---

# Safe Mutating CLI

One rule governs everything here:

> **Validate intent completely before the first observable side effect.**

A mutating command that discovers a bad argument after it has already synced,
applied, installed, or deleted has failed even if it then exits nonzero. The
user cannot undo what already happened.

This skill covers argument handling, consent, and honest reporting. Timeouts,
cancellation, and progress belong to `AGENTS.md` → "Operations are bounded and
observable"; do not restate them here.

## Contract

```text
arguments parsed before sync, apply, network access, or any mutation
--help performs no mutation and exits 0
invalid arguments perform no mutation and exit 64
unsupported positional arguments fail; they are never silently ignored
platform-specific options fail or explain themselves off-platform
destructive actions require explicit consent, never a default yes
retry preserves the exact original scope and safety policy
cancellation and failure never claim success or readiness
help, docs, behavior, and the final receipt all agree
```

### Parse first, in every entry point

Every entry point validates, including one that is normally reached through
another. A trampoline that execs a runner does not excuse the runner from
validating: the runner is also invoked directly, and "the launcher already
checked" is false the moment someone runs the runner by hand.

Place parsing immediately after shell setup and `PATH`, **above** the first
`chezmoi apply`, install, download, or write.

### Silence is the failure mode

An unknown flag that is accepted and ignored is worse than one that errors,
because the user believes they selected a scope that was never applied. This is
how `update-all --greedy` came to run an ordinary refresh while appearing to do
something else.

The same applies to an option that is valid but inert on this platform. Reject
it or say it does nothing here; never accept it silently.

### Never widen a trust policy to widen scope

Selection and trust are different questions:

```text
Selection:  which installed items are in this operation?
Trust:      which of those is policy willing to act on?
```

A safety flag is not a filter. Adding a broad selection flag and trusting a
safety flag to exclude the unsafe members is a category error — the safety flag
may abort the whole operation instead, or the unsafe member may simply be
included. Build the candidate set explicitly, then act on it.

### Reporting is part of the contract

A receipt states what the run proved. Do not convert an unknown state into a
known reason, and do not describe a policy choice as a technical impossibility.
If an observation step fails, say the receipt is incomplete rather than
printing an empty successful-looking summary.

## Required hostile tests

Every one of these is a fixture test, not a manual check. A guard that has not
been red-proven does not exist.

```text
--help                          → zero external commands invoked, exit 0
unknown flag                    → exit 64, zero mutation
unexpected positional argument  → exit 64, zero mutation
unsupported platform option     → explicit result, never a silent no-op
failed operation                → nonzero, no readiness claim
retry                           → identical candidates and safety flags
help text                       → matches the categories actually printed
```

Prove "zero mutation" by asserting an empty command log, not by reading the
code. Fixtures that log every external invocation make this cheap.

## Workflow

1. Read this skill before the first edit, not after review.
2. Write the argument contract down before implementing it.
3. Put parsing above every side effect, in each entry point.
4. Build the explicit candidate set; never infer afterwards what a broad
   command probably did.
5. Add the hostile fixtures and watch each one fail before it passes.
6. Run `scripts/validate-groundwork` and report what ran.
