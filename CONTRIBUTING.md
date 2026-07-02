# Contributing

Thanks for helping improve this setup. This repo is optimized for a readable,
teachable AI-native development foundation across Mac workstations, Linux/WSL
terminal workflows, and headless agent/container environments, not for maximum
cleverness.

## Before Changing Files

- Read `AGENTS.md`; it is the canonical instruction file for humans and agents.
- Keep beginner docs in `docs/`.
- Keep repeatable agent procedures in `skills/` only when they are reused often.
- Keep setup flows in scripts, then explain how to run or inspect the script.
- Use the chezmoi version pinned in `.chezmoiversion`. It is Groundwork's
  supported toolchain floor, not a claim that older distro-packaged chezmoi
  builds cannot render some files.

## Pull Requests

Good pull requests are small and focused:

- Explain what changed and why.
- Mention any macOS setting, app install, or destructive behavior changed.
- Run the relevant validation from the README or GitHub Actions locally when practical.
- Do not commit machine-local files, secrets, private notes, or exported app databases.

## Style

- Prefer existing repo patterns.
- Write docs for a capable beginner: define terms once, give a first successful path, then give practice drills.
- Keep AI agent instructions minimal and non-duplicative. `AGENTS.md` is the source of truth; tool-specific files should be thin adapters.

## Public Repo Hygiene

Before publishing or accepting outside contributions, check:

- No secrets or machine-local state are tracked.
- `LICENSE`, `SECURITY.md`, and this file still match the intended sharing model.
- GitHub secret scanning and push protection are enabled in repository settings when available.
