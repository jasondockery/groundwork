#!/usr/bin/env bash
set -euo pipefail

# The pre-apply notice about the update-all migration scrolls away behind
# the Homebrew output that follows it. This runs at the end of every apply
# and repeats the one required action while the flag exists, so an
# interrupted or noninteractive apply still reminds on the next run. The
# flag is removed only after the reminder was actually shown.
flag="$HOME/.local/state/groundwork/update-all-migration-pending"
[[ -f "$flag" ]] || exit 0

# Only a human at a terminal can act on this, and only a shown reminder counts
# as delivered: a noninteractive or piped apply leaves the flag pending so the
# next interactive run still says it. (The seam lets the validator drive both.)
if [[ ! -t 1 && "${GROUNDWORK_REMINDER_ASSUME_TTY:-0}" != "1" ]]; then
  exit 0
fi

# Color keys on the run-wide signal update-all exports (GROUNDWORK_COLOR),
# not on a per-stage TTY probe that any tee or capture upstream defeats. A
# direct `chezmoi apply` in a terminal gets the TTY fallback; NO_COLOR wins.
color=0
if [[ "${GROUNDWORK_COLOR:-}" == "1" ]]; then
  color=1
elif [[ -z "${GROUNDWORK_COLOR:-}" && -t 1 && -z "${NO_COLOR:-}" ]]; then
  color=1
fi

if [[ "$color" == "1" ]]; then
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
if [[ "$color" == "1" ]]; then
  printf '\033[0m'
fi

rm -f -- "$flag"
