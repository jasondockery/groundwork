# shellcheck shell=bash
# Read-only always-on-app process facts. Homebrew quits these GUI apps while
# replacing their casks and does not relaunch them, so the keyboard driver,
# launcher, display manager, and menu-bar library are otherwise easy to lose
# without noticing. Callers decide whether to report or launch; this library
# only observes.

GW_ALWAYS_ON_APPS='Karabiner-Elements Raycast BetterDisplay Anybox'

gw_always_on_app_reason() {
  case "$1" in
    Karabiner-Elements) printf 'keyboard rules and permission prompts are visible' ;;
    Raycast) printf 'the launcher hotkey keeps answering' ;;
    BetterDisplay) printf 'display presets and brightness controls stay available' ;;
    Anybox) printf 'the bookmark library and its shortcuts stay in the menu bar' ;;
    *) printf 'its background service stays available' ;;
  esac
}

# Exit 0 running, 1 installed but not running, 2 not installed (not a finding
# either way -- windowed apps with their own update channels stay out of scope).
gw_always_on_app_running() {
  local app_name="$1" applications_dir="${GROUNDWORK_APPLICATIONS_DIR:-/Applications}"
  [[ -d "$applications_dir/${app_name}.app" ]] || return 2
  pgrep -f "/${app_name}[.]app/" >/dev/null 2>&1
}

# TSV: app_name, one-line reason, for every always-on app that is installed
# but not currently running.
gw_always_on_apps_not_running() {
  local app_name status
  for app_name in $GW_ALWAYS_ON_APPS; do
    status=0
    gw_always_on_app_running "$app_name" || status=$?
    if [[ "$status" -eq 1 ]]; then
      printf '%s\t%s\n' "$app_name" "$(gw_always_on_app_reason "$app_name")"
    fi
  done
  return 0
}
