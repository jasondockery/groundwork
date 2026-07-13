#!/usr/bin/env bash
set -euo pipefail

# The pre-apply notice about the update-all migration scrolls away behind
# the Homebrew output that follows it. This runs at the end of the apply,
# so the one action the user must take is the last thing on screen.
flag="$HOME/.local/state/groundwork/update-all-migration-pending"
[[ -f "$flag" ]] || exit 0
rm -f -- "$flag"

if [[ -t 1 ]]; then
  printf '\033[1;33m'
fi
cat <<'EOF'

==> Groundwork: one step left in this terminal

update-all moved from a shell function to ~/.local/bin/update-all.
Terminals opened before this update still have the old function loaded.

    Run: exec zsh

New terminals need nothing, and future update-all changes take effect
during the same run that fetches them — no more shell reloads.
EOF
if [[ -t 1 ]]; then
  printf '\033[0m'
fi
