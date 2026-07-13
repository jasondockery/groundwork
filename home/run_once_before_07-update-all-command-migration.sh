#!/usr/bin/env bash
set -euo pipefail

# This runs before chezmoi replaces ~/.zshrc. Only machines that actually have
# the old managed function need the one-time reload notice; fresh installs do
# not. The flag file makes the end-of-apply reminder script repeat the one
# required action after the Homebrew output has scrolled this notice away.
if [[ -f "$HOME/.zshrc" ]] && grep -q '^update-all() {' "$HOME/.zshrc"; then
  cat <<'EOF'
Groundwork moved update-all from an in-memory shell function to
~/.local/bin/update-all.

Existing terminals may still have the old function loaded.
Run `exec zsh` once in those terminals. Future update-all changes will take
effect during the same invocation without another shell reload.
EOF
  mkdir -p "$HOME/.local/state/groundwork"
  : >"$HOME/.local/state/groundwork/update-all-migration-pending"
fi
