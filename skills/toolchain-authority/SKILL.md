---
name: toolchain-authority
description: Keeps one editable authority for each runtime, package-manager, and build-tool pin and treats every other version-bearing surface as a derived mirror, adapter, fixture, or historical record. Use before changing a Node, Python, pnpm, or similar version file, packageManager or engines fields, version-manager config, CI runtime setup, container toolchain arguments, update-bot rules for tools, or docs and tests that mention tool versions, and when reviewing a toolchain or platform version bump. Not for ordinary library dependency updates (use dependency-change).
---

# Toolchain authority

This is the shared base. A repository may extend it with its own authority
files and commands; it never redefines the rules below. Load
`dependency-change` for the general update procedure and
`developer-tool-change` when adopting or configuring a tool.

## 1. One authority per pin

- Each runtime, package manager, and pinned build tool has exactly one
  editable authority file or field, named in the repository's instructions.
  Never add a second authoritative version file.
- Classify every other version-bearing surface as one of: generated mirror,
  compatibility adapter, named fixture, or historical record. Reject an
  unclassified version literal.
- Inventory version-bearing surfaces from the tracked file list, including
  hidden files. Without version-control metadata, fall back to a bounded
  filesystem walk. A classification that observed nothing never passes.

## 2. Derive, never copy

- Scripts, CI, containers, and generated templates read the authority or a
  shared helper that parses it. A version copied into a workflow, container
  argument, or document is a second pin.
- Change the authority, then run the repository's sync command to regenerate
  mirrors. Never repair a mirror by hand.
- Documentation and skills name the authority path, not the current version.
  Release notes and clearly historical records are the exception.
- Tests of the current contract read the authority. Parser and failure
  fixtures use named, obviously fake versions unrelated to past or present
  production pins.
- Correlated mirrors move in the same change as their authority; a partial
  update is invalid.

## 3. Treat automated rewrites as suspect

Update commands, update bots, and package-manager subcommands can silently
rewrite shared version catalogs into concrete per-package versions, or drop
catalog entries. After any automated rewrite, run the repository's toolchain
and dependency authority checks before trusting the result. Check the pinned
tool's own help before relying on a version-sensitive flag.

## 4. Missing evidence is not current

Any command, timeout, signal, network, or parse failure while checking for
drift or available updates is a failed report. Never convert missing evidence
into Current.

## 5. Triage human-reviewed toolchain bumps

A runtime, package-manager, build-tool, test-runner, or platform bump that a
person merges, and every major or security bump, gets one release-note triage
before merge. Read the upstream notes for the exact release named in the
change, not from memory. Check each item against what this repository actually
uses, citing `path:line`:

```markdown
## Release-note triage: <tool> <from> -> <to>

**Taken / verified**
- <item>: <what it changes here>, checked at `path:line`.

**Behaviour changes checked**
- <item>: <setting or command relied on>; <no change | action taken>.

**Not applicable**
- <item>: <the repository fact that makes it so>.

**Proof**: <focused checks run>; hosted run on <sha>.
```

- Always list security fixes and behaviour changes to install, caching,
  linking, process lifecycle, and test isolation, taken or not.
- "Not applicable" needs a repository fact, not an opinion.
- A behaviour change found later by proof is added under Taken with the fixing
  commit.
- Keep one triage per change and update it when the head moves, naming the
  head it covers.

## Done when

- The repository's toolchain sync leaves no diff and its authority check
  passes.
- Clean-install proof runs in an isolated fixture, not a warm checkout.
