#!/usr/bin/env bash
set -euo pipefail

# Groundwork now installs its own zsh, but installing it changes nothing on its
# own: without a nudge, an existing user keeps running the OS shell forever and
# the ownership policy never reaches them. So say it once, at the end of an
# apply, and never again — this only informs. It never runs chsh.
state_dir="${GROUNDWORK_STATE_DIR:-$HOME/.local/state/groundwork}"
seen="$state_dir/shell-adopt-notice-shown"
[[ -f "$seen" ]] && exit 0

# Only a human at a terminal can act on it.
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

lib="${GROUNDWORK_SHELL_LIB:-$HOME/.local/share/groundwork/lib/shell-runtime.sh}"
[[ -r "$lib" ]] || exit 0
# shellcheck source=/dev/null
. "$lib"
gw_shell_probe

# Ownership is resolved BEFORE anything else. Two things depend on it:
#   - we only claim Groundwork "manages" a zsh Homebrew actually owns;
#   - we do not burn the one-shot notice on an unverified state. If the stable
#     path was replaced and happens to be the login shell, marking the notice
#     delivered would hide exactly the problem worth telling someone about.
[[ "$GW_OWNERSHIP" == "owned" ]] || exit 0

# A transient account-lookup failure is not a user decision: stay pending rather
# than burning the notice on an "unknown" state.
[[ "$GW_LOGIN_STATE" == "ok" ]] || exit 0

# Already adopted — and now provably so. Nothing to say; never ask again.
if [[ "$GW_LOGIN_SHELL" == "$GW_MANAGED_ZSH" ]]; then
  mkdir -p "$state_dir"
  : >"$seen"
  exit 0
fi

[[ "$color" == "1" ]] && printf '\033[1;33m'
cat <<EOF

==> Groundwork can now manage your zsh

Groundwork installed its own zsh ($(gw_managed_zsh_version)). Adopting it means the shell
running your prompt, plugins, and completions is one Groundwork keeps updated
and can diagnose. Your login shell is still $GW_LOGIN_SHELL.

    Adopt:  groundwork-shell-adopt     (asks for sudo once; undo with --revert)
    Or not: keep your current shell. Your config still works, but the shell
            runtime is then yours: version and behavior are whatever your OS
            ships, and Groundwork cannot guarantee parity across machines.

Verified on Apple Silicon macOS; Intel macOS, Linux, and WSL2 are provisional
while their receipts are collected. This notice appears once, either way.

EOF
[[ "$color" == "1" ]] && printf '\033[0m'

# Shown once. Whether they adopt or ignore it, that decision is theirs.
mkdir -p "$state_dir"
: >"$seen"
