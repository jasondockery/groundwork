# Platform support contract and shell-runtime ownership

`AGENTS.md` carries the decision boundary: fail closed before mutating anything
on an unsupported platform, and never mutate a host OS from inside the
environment Groundwork manages. This spec holds the detail.

## Supported platforms

Groundwork fully supports macOS and the Unix developer core on Ubuntu LTS,
natively or under WSL2. Ubuntu LTS is the primary tested Windows path.

Debian stable and Fedora stable are targeted next and become supported when their
CI receipts land — **support status follows verification, never aspiration**.

Groundwork supports Linux directly. WSL2 is one supported way to run that Linux
environment on a Windows-owned machine; native Linux is the recommendation for
anyone who wants no Microsoft dependency.

WSL1, unverifiable WSL environments, and native Windows shells (PowerShell, CMD,
Git Bash) are unsupported. They must fail closed with guidance rather than
partially work — and fail **before mutating anything**.

## Platform and distribution are separate dimensions

- `groundwork-platform` reports `darwin` / `linux` / `wsl2` / `wsl1` /
  `wsl-unknown` / `unsupported`.
- `groundwork-distro` reports the distribution ID, and `--family` its bootstrap
  family.

Only bootstrap prerequisites may branch on the family. Shared Unix behavior stays
shared.

## Ownership boundary

Groundwork never mutates a host operating system outside the environment it runs
in: no distro package upgrades on Linux, no Windows-host updates from WSL2.

## Shell runtime ownership

Groundwork owns the interactive zsh runtime on supported platforms through
Homebrew, along with its configuration, plugins, completions, prompt integration,
updates, and diagnostics — so behavior is reproducible across macOS, Linux, and
WSL2 instead of varying with whatever shell the OS ships.

Adoption is an explicit step (`groundwork-shell-adopt`), never something an apply
does silently, because it changes the account's login-shell record.

The OS shell is never modified or removed: it stays the recovery path
(`groundwork-shell-adopt --revert`).

Scripts keep portable shebangs (`#!/usr/bin/env bash`, or `zsh` only when zsh
features are required) and never hard-code an architecture-specific Homebrew
path — resolve it with `brew --prefix`.

The read-only probe shared by `groundwork-shell-adopt`, `groundwork-doctor`, and
the adoption notice is `home/dot_local/share/groundwork/lib/shell-runtime.sh`. It
never executes the candidate zsh until Homebrew ownership is proven.
