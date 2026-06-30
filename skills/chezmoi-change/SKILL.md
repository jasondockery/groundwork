---
name: chezmoi-change
description: Safely edit and verify Groundwork-managed chezmoi files. Use when changing shell, tmux, Git, editor, app, Brewfile, helper scripts, or any file that maps from the Groundwork source tree into a user's home directory.
---

# Chezmoi Change

Use the visible checkout as the source of truth. Never hand-edit the applied copy under `$HOME` and call the task done.

## Workflow

1. Identify the managed source path:
   - `~/.zshrc` -> `home/dot_zshrc.tmpl`
   - `~/.gitconfig` -> `home/dot_gitconfig.tmpl`
   - `~/.config/<name>` -> `home/dot_config/<name>`
   - `~/.local/bin/<name>` -> `home/dot_local/bin/executable_<name>`
   - `~/Library/...` -> `home/Library/...`
2. Edit only the source file, or use `chezmoi edit <target>`.
3. Render or diff before claiming done:
   - Use `chezmoi diff` for broad changes.
   - Use `chezmoi --source "$PWD" execute-template < path.tmpl` for a focused template check.
   - Use `bash -n`, `zsh -n`, or the relevant parser on rendered scripts/configs.
4. If practical and low-risk, run a targeted `chezmoi apply <target>` or inspect the generated target.
5. Run `scripts/validate-groundwork` before commit or release-sized changes.

## Guardrails

- Keep `.chezmoiroot` as `home`.
- Do not edit generated files under `$HOME` except as a temporary diagnostic.
- Only automate settings backed by stable files, templates, documented macOS defaults, or vendor-supported CLIs. For app-owned databases, cloud sync stores, Keychain state, secrets, and per-device shortcut/display state, document the vendor sync/export path instead of writing hidden internal files.
- Do not remove first-run backup/restore coverage when changing managed files.
- Report any apply step not run, especially for macOS settings or app databases.
