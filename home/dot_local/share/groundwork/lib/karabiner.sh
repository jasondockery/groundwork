# shellcheck shell=bash
# shellcheck disable=SC2034 # GW_KARABINER_* constants are this sourced library's public API.
# Read-only Karabiner process facts plus the one vendor-documented restart
# request. Callers decide whether to report or act; this library never guesses
# that a request succeeded without observing a new root Core Service PID.

GW_KARABINER_CLI='/Library/Application Support/org.pqrs/Karabiner-Elements/bin/karabiner_cli'
GW_KARABINER_CORE_MARKER='/Karabiner-Core-Service.app/Contents/MacOS/Karabiner-Core-Service'
GW_KARABINER_MINIMUM_VERSION='16.1.0'
# Verified against the vendor's support page on 2026-08-05. A future macOS
# major stays unknown until Groundwork refreshes this evidence.
GW_KARABINER_SUPPORTED_MACOS_MAJORS='13 14 15 26 27'
GW_KARABINER_USER_AGENT='org.pqrs.service.agent.karabiner_console_user_server'

gw_karabiner_platform() {
  /usr/bin/uname -s 2>/dev/null
}

gw_karabiner_macos_version() {
  /usr/bin/sw_vers -productVersion 2>/dev/null
}

gw_karabiner_version() {
  [[ -x "$GW_KARABINER_CLI" ]] || return 1
  "$GW_KARABINER_CLI" --version 2>/dev/null
}

gw_karabiner_version_at_least() {
  local actual="$1" minimum="$2"
  [[ "$actual" =~ ^[0-9]+([.][0-9]+)*$ && "$minimum" =~ ^[0-9]+([.][0-9]+)*$ ]] || return 2
  /usr/bin/awk -v actual="$actual" -v minimum="$minimum" '
    BEGIN {
      actual_count = split(actual, a, ".")
      minimum_count = split(minimum, m, ".")
      count = actual_count > minimum_count ? actual_count : minimum_count
      for (i = 1; i <= count; i++) {
        av = (i <= actual_count ? a[i] : 0) + 0
        mv = (i <= minimum_count ? m[i] : 0) + 0
        if (av > mv) exit 0
        if (av < mv) exit 1
      }
      exit 0
    }
  '
}

gw_karabiner_macos_supported() {
  local version="$1" major supported
  [[ "$version" =~ ^[0-9]+([.][0-9]+)*$ ]] || return 2
  major="${version%%.*}"
  for supported in $GW_KARABINER_SUPPORTED_MACOS_MAJORS; do
    [[ "$major" == "$supported" ]] && return 0
  done
  return 1
}

# TSV for the root Core Service only: PID, owner, elapsed time, resident-set
# KiB. Karabiner 16.1.0 may also run the same executable as the console user;
# that companion is not the privileged process whose replacement proves the
# documented restart reached the service under investigation.
gw_karabiner_root_core_rows() {
  /bin/ps -axo pid=,user=,etime=,rss=,command= 2>/dev/null \
    | /usr/bin/awk -v marker="$GW_KARABINER_CORE_MARKER" '
      $2 == "root" && substr($0, length($0) - length(marker) + 1) == marker {
        printf "%s\t%s\t%s\t%s\n", $1, $2, $3, $4
      }
    '
}

# TSV: Activity Monitor-style memory footprint, compressed memory. `ps rss`
# and `top mem` answer different questions on macOS; reporting both prevents a
# small resident set from hiding a large compressed footprint.
gw_karabiner_top_snapshot() {
  local pid="$1"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 64
  /usr/bin/top -l 1 -pid "$pid" -stats pid,mem,cmprs 2>/dev/null \
    | /usr/bin/awk -v pid="$pid" '$1 == pid { printf "%s\t%s\n", $2, $3; found = 1; exit } END { if (!found) exit 1 }'
}

gw_karabiner_rss_mib() {
  local kib="$1"
  [[ "$kib" =~ ^[0-9]+$ ]] || return 64
  /usr/bin/awk -v kib="$kib" 'BEGIN { printf "%.1f", kib / 1024 }'
}

gw_karabiner_restart_user_agent() {
  local uid
  uid="$(/usr/bin/id -u)" || return 1
  /bin/launchctl kickstart -k "gui/${uid}/${GW_KARABINER_USER_AGENT}"
}

gw_karabiner_wait_tick() {
  /bin/sleep 0.5
}
