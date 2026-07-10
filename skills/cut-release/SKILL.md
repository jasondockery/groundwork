---
name: cut-release
description: Cut a Groundwork release (SemVer tag + GitHub Release) after release-affecting work lands, so the change actually reaches users. Use when a change alters what a fresh install or update-all delivers and main is green.
---

# Cut a Release

Groundwork ships to users through **SemVer tags + GitHub Releases** (see `PLAYBOOK.md`, "Versioning & Releases"). A feature that lands on `main` but is never tagged reaches no user: `main` is the rolling edge, tags are the known-good refs people pin and pull. Release-affecting work is not done until it ships.

## When to run

Run this when the change is **release-affecting**: it alters what a fresh bootstrap or `chezmoi update` / `update-all` delivers (new or removed tools, new prompts or template-data schema, changed scripts, changed docs users read). Do not cut a release for internal automation, CI plumbing, or dependency bumps that change nothing a user consumes — for those, say "no release cut" and why.

Batching is allowed: several release-affecting changes can ship in one release. But do not silently defer — if you are batching, name the pending batch and the version it will ship under.

## Choose the version

Read the previous tag (`git tag --sort=-v:refname | head -1`) and bump per the loose SemVer in `PLAYBOOK.md`:

- **major** — the update requires user action (bootstrap flow change, template-data schema change, renamed/removed scripts a user invokes).
- **minor** — new tools, docs, or drills; backward-compatible additions.
- **patch** — fixes only.

A new opt-in prompt that defaults safely and additive tools are **minor**, not major.

## Preconditions (all must hold)

1. **`main` is green.** The tag must point at a `main` SHA with passing CI. Check: `gh run list --branch main --workflow CI --limit 1`. If red, fix CI first — a red main means nothing can ship.
2. **Local tree matches origin.** `git status -sb` shows no divergence; `git fetch` then confirm `main` == `origin/main`.
3. **Validation passes locally.** `scripts/validate-groundwork`.

## Cut it

Write release notes **for the actual users** and as teaching artifacts, per the north star: what changed, what to run after `chezmoi update`, and any manual step, in plain language for a capable beginner. Then, tag and release together pointing at the green SHA:

```bash
gh release create vX.Y.Z --target <green-sha> --title "vX.Y.Z" --notes-file -
```

Gather the changelog input from `git log --oneline <prev-tag>..HEAD`, but group it by what the user experiences (new tools, fixes, docs), not raw commit subjects.

## After

- If the Docker image is published to a registry, mirror the release tag: `groundwork:vX.Y.Z` + `latest` (see `PLAYBOOK.md`).
- Report the tag, the SHA it points at, and the user-facing summary.

## Verify

- `gh release view vX.Y.Z` shows the release with the intended notes.
- `git tag --sort=-v:refname | head -1` is the new tag.
- The tag's SHA has green CI.
