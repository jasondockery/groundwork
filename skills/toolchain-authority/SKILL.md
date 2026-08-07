---
name: toolchain-authority
description: Maintain Groundwork's Node and pnpm authority contract. Use before changing .node-version, .nvmrc, mise.toml, packageManager, engines, Corepack setup, Node setup in CI, Renovate toolchain behavior, toolchain docs, or tests containing Node or pnpm versions.
---

# Toolchain authority

## Preserve the two authorities

- Change Node only in `.node-version`.
- Change pnpm only in `package.json#packageManager`.
- Treat `.nvmrc`, `mise.toml#tools.node`, `engines`, and CI as derived adapters.
- Never declare pnpm in mise, Homebrew, or another installer. Mise owns Node; Corepack selects pnpm.
- Never add another authoritative version file.

Run `pnpm toolchain:sync` after changing an authority. Run `pnpm check:toolchain` before handoff. Never repair a mirror directly.

## Keep the machine boundary

Groundwork installs/selects Node with mise, enables and diagnoses Corepack, detects competing pnpm owners, and explains repository drift. It does not choose or rewrite another repository's Node or pnpm authorities during `update-all`.

## Classify every consumer

Register a new version-bearing surface as an authority, generated mirror, compatibility adapter, named fixture, or historical record. Reject unclassified literals. Documentation references the authority files rather than current patch versions; release notes and clearly historical records are exceptions. Current-contract tests read the authorities. Parser/failure fixtures use named values unrelated to former production pins.

Use `git ls-files -z` when inventorying tracked consumers so hidden files are included. A checkout without Git metadata falls back to a bounded filesystem walk; the classification never reports a pass while observing nothing. Use `pnpm check:outdated` for Lockfile Wanted, Compatible Latest, maturity-filtered Latest, registry Newest, the declared specification, and explicit toolchain authorities. Any command, timeout, signal, network, or JSON failure is a failed report; never convert missing evidence into “current.”
