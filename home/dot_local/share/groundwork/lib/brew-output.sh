#!/usr/bin/env bash

# Classify Homebrew's human stream without turning unknown warnings or errors
# into success. Callers keep the raw log and the child status remains
# authoritative. This filter suppresses only two exact, bounded no-change
# message shapes that Homebrew currently prefixes Warning:.

gw_brew_classify_stream() {
  local raw_log="$1" receipt_file="$2" mode="${3:-reset}" esc
  esc="$(printf '\033')"
  awk -v raw_log="$raw_log" -v receipt_file="$receipt_file" \
    -v mode="$mode" -v esc="$esc" '
    function record_failed_cask(token) {
      if (token ~ /^[A-Za-z0-9@+._-]+$/ && !failed_cask_seen[token]) {
        failed_cask_count++
        failed_cask[failed_cask_count] = token
        failed_cask_seen[token] = 1
      }
    }
    BEGIN {
      current = 0
      warnings = 0
      errors = 0
      failed_cask_count = 0
      if (mode == "append") {
        while ((getline prior < receipt_file) > 0) {
          split(prior, fields, "\t")
          if (fields[1] == "current" && fields[2] ~ /^[0-9]+$/) current = fields[2]
          if (fields[1] == "warning" && fields[2] ~ /^[0-9]+$/) warnings = fields[2]
          if (fields[1] == "error" && fields[2] ~ /^[0-9]+$/) errors = fields[2]
          if (fields[1] == "failed-cask") record_failed_cask(fields[2])
        }
        close(receipt_file)
      } else {
        printf "" > raw_log
        close(raw_log)
      }
    }
    {
      print $0 >> raw_log
      clean = $0
      gsub(esc "\\[[0-9;]*m", "", clean)
      sub(/\r$/, "", clean)
      if (clean ~ /^Warning: [A-Za-z0-9@+._-]+ [A-Za-z0-9.+_,-]+ already installed$/ ||
          clean ~ /^Warning: Not upgrading [A-Za-z0-9@+._-]+, the latest version is already installed$/) {
        current++
        next
      }
      print $0
      if (clean ~ /^Warning:/) warnings++
      if (clean ~ /^Error:/) {
        errors++
        caskroom_count = split(clean, caskroom_parts, "/Caskroom/")
        if (caskroom_count == 2) {
          split(caskroom_parts[2], caskroom_path, "/")
          record_failed_cask(caskroom_path[1])
        }
      }
    }
    END {
      printf "current\t%d\nwarning\t%d\nerror\t%d\n", current, warnings, errors > receipt_file
      for (i = 1; i <= failed_cask_count; i++) {
        printf "failed-cask\t%s\n", failed_cask[i] > receipt_file
      }
      close(receipt_file)
      close(raw_log)
    }
  '
}

# Interactive cask replacements need a real terminal for ordered cursor output
# and visible password prompts. macOS script(1) supplies that PTY while keeping
# a private transcript; only the saved copy is normalized and classified.
gw_brew_classify_transcript() {
  local transcript="$1" normalized_log="$2" receipt_file="$3" mode="${4:-reset}" esc
  esc="$(printf '\033')"
  awk -v normalized_log="$normalized_log" -v receipt_file="$receipt_file" \
    -v mode="$mode" -v esc="$esc" '
    function record_failed_cask(token) {
      if (token ~ /^[A-Za-z0-9@+._-]+$/ && !failed_cask_seen[token]) {
        failed_cask_count++
        failed_cask[failed_cask_count] = token
        failed_cask_seen[token] = 1
      }
    }
    function classify(line, clean, caskroom_count) {
      clean = line
      # Strip complete CSI control sequences from the saved copy. Live output
      # never passes through this normalizer.
      gsub(esc "\\[[0-?]*[ -/]*[@-~]", "", clean)
      while (gsub(/.[\b]/, "", clean)) {}
      gsub(/[\b]/, "", clean)
      print clean >> normalized_log
      if (clean ~ /^Warning: [A-Za-z0-9@+._-]+ [A-Za-z0-9.+_,-]+ already installed$/ ||
          clean ~ /^Warning: Not upgrading [A-Za-z0-9@+._-]+, the latest version is already installed$/) {
        current++
        return
      }
      if (clean ~ /^Warning:/) warnings++
      if (clean ~ /^Error:/) {
        errors++
        caskroom_count = split(clean, caskroom_parts, "/Caskroom/")
        if (caskroom_count == 2) {
          split(caskroom_parts[2], caskroom_path, "/")
          record_failed_cask(caskroom_path[1])
        }
      }
    }
    BEGIN {
      current = 0
      warnings = 0
      errors = 0
      failed_cask_count = 0
      if (mode == "append") {
        while ((getline prior < receipt_file) > 0) {
          split(prior, fields, "\t")
          if (fields[1] == "current" && fields[2] ~ /^[0-9]+$/) current = fields[2]
          if (fields[1] == "warning" && fields[2] ~ /^[0-9]+$/) warnings = fields[2]
          if (fields[1] == "error" && fields[2] ~ /^[0-9]+$/) errors = fields[2]
          if (fields[1] == "failed-cask") record_failed_cask(fields[2])
        }
        close(receipt_file)
      } else {
        printf "" > normalized_log
        close(normalized_log)
      }
    }
    {
      segment_count = split($0, segments, "\r")
      for (segment = 1; segment <= segment_count; segment++) {
        if (segments[segment] != "" || segment == segment_count) classify(segments[segment])
      }
    }
    END {
      printf "current\t%d\nwarning\t%d\nerror\t%d\n", current, warnings, errors > receipt_file
      for (i = 1; i <= failed_cask_count; i++) {
        printf "failed-cask\t%s\n", failed_cask[i] > receipt_file
      }
      close(receipt_file)
      close(normalized_log)
    }
  ' "$transcript"
}

# Classify one Homebrew metadata snapshot before update-all starts a cask
# replacement. Self-updating casks and casks whose uninstall stanza removes
# launchd services or privileged files stay owner-run: those replacements can
# stop for a password, an application dialog, or a helper teardown. The output
# is a typed TSV consumed without eval or command construction:
#
#   token  eligible|current|review|excluded  reason  installed  available
gw_brew_classify_cask_metadata() {
  local metadata_file="$1" expected_tokens_file="$2" classification_file="$3"
  local observed_tokens="${classification_file}.observed.$$"
  local expected_sorted="${classification_file}.expected.$$"
  local observed_sorted="${classification_file}.observed-sorted.$$"

  if [[ ! -r "$metadata_file" || ! -r "$expected_tokens_file" ]]; then
    echo "Groundwork: Homebrew cask metadata inputs are missing." >&2
    return 1
  fi
  if ! command -v jq >/dev/null 2>&1; then
    echo "Groundwork: jq is required to classify Homebrew casks safely." >&2
    return 1
  fi
  if ! awk 'NF != 1 || $0 !~ /^[A-Za-z0-9@+._-]+$/ { exit 1 }' \
    "$expected_tokens_file"; then
    echo "Groundwork: the managed cask token set is malformed." >&2
    return 1
  fi

  if ! jq -e '
      (.casks | type) == "array" and
      all(.casks[];
        (.token | type) == "string" and
        (.token | test("^[A-Za-z0-9@+._-]+$")) and
        (.installed | type) == "string" and
        (.version | type) == "string" and
        (.sha256 | type) == "string" and
        has("auto_updates") and
        ((.auto_updates | type) == "boolean" or .auto_updates == null) and
        (.pinned | type) == "boolean" and
        (.outdated | type) == "boolean" and
        (.deprecated | type) == "boolean" and
        (.disabled | type) == "boolean" and
        (.artifacts | type) == "array")
    ' "$metadata_file" >/dev/null; then
    echo "Groundwork: Homebrew returned incomplete or malformed cask metadata; no cask upgrade was attempted." >&2
    return 1
  fi

  if ! jq -r '.casks[].token' "$metadata_file" >"$observed_tokens"; then
    rm -f -- "$observed_tokens" "$expected_sorted" "$observed_sorted"
    return 1
  fi
  LC_ALL=C sort "$expected_tokens_file" >"$expected_sorted"
  LC_ALL=C sort "$observed_tokens" >"$observed_sorted"
  if [[ -n "$(uniq -d "$observed_sorted")" ]] \
    || ! cmp -s "$expected_sorted" "$observed_sorted"; then
    echo "Groundwork: Homebrew cask metadata did not match the exact managed token set; no cask upgrade was attempted." >&2
    rm -f -- "$observed_tokens" "$expected_sorted" "$observed_sorted"
    return 1
  fi

  if ! jq -r '
      .casks[] |
      . as $c |
      ([ $c.artifacts[]? |
          select(has("uninstall")) |
          .uninstall[]? |
          keys[] ] |
        any(. == "launchctl" or . == "delete")) as $privileged_replacement |
      (if $c.auto_updates and $privileged_replacement then
         "self-updating+privileged-replacement"
       elif $c.auto_updates then "self-updating"
       elif $privileged_replacement then "privileged-replacement"
       else "ordinary" end) as $ownership |
      (if $c.installed == $c.version and ($c.outdated | not) then ["current", $ownership]
       elif $c.pinned then ["excluded", "pinned"]
       elif $c.disabled then ["excluded", "disabled"]
       elif $c.deprecated then ["excluded", "deprecated"]
       elif $c.version == "latest" then ["excluded", "latest"]
       elif $c.sha256 == "no_check" then ["excluded", "no-checksum"]
       elif $ownership != "ordinary" then ["review", $ownership]
       elif $c.outdated then ["eligible", "ordinary"]
       else ["current", "ordinary"] end) as $decision |
      [ $c.token, $decision[0], $decision[1], $c.installed, $c.version ] | @tsv
    ' "$metadata_file" >"$classification_file"; then
    rm -f -- "$observed_tokens" "$expected_sorted" "$observed_sorted" "$classification_file"
    echo "Groundwork: Homebrew cask classification failed; no cask upgrade was attempted." >&2
    return 1
  fi
  rm -f -- "$observed_tokens" "$expected_sorted" "$observed_sorted"
}

# script(1) puts the REAL terminal into raw mode with signal generation off and
# restores it only on its own clean exit. Every cancellation path that kills
# script therefore has to put the caller's terminal back itself, or the pane is
# left with Ctrl-C and Ctrl-Z permanently inert — a shell that looks alive and
# answers nothing. The snapshot is a global so the update runner's EXIT trap can
# restore it too, whatever stage the transaction died in.
#
# Always empty at load, never seeded from the environment: this value is fed
# straight to stty, so an inherited or stale one would let a caller outside this
# library reprogram the terminal through Groundwork's own EXIT handler before any
# snapshot was ever taken.
GW_BREW_TTY_STATE=""

# An attached Homebrew stage can outlive this library's control flow whenever
# the caller's own INT/TERM/HUP trap exits the shell: that jumps straight to the
# caller's EXIT handler, skipping the sweep at the bottom of the branch and
# leaving brew, sudo, and installer running against a terminal nobody holds.
# These record the stage that is live right now so the caller's EXIT handler can
# still close it. Empty means no attached stage is running.
GW_BREW_ACTIVE_PGID_FILE=""
GW_BREW_ACTIVE_WATCHDOG=""
GW_BREW_ACTIVE_OUTER_PGID=""
GW_BREW_ACTIVE_GRACE=10
GW_BREW_ACTIVE_POLL=1
GW_BREW_ACTIVE_TRANSCRIPT=""
GW_BREW_ACTIVE_MARKER=""
GW_BREW_ACTIVE_STATUS_FILE=""

gw_brew_stage_begin() {
  GW_BREW_ACTIVE_PGID_FILE="$1"
  GW_BREW_ACTIVE_OUTER_PGID="$2"
  GW_BREW_ACTIVE_GRACE="$3"
  GW_BREW_ACTIVE_POLL="$4"
  GW_BREW_ACTIVE_TRANSCRIPT="$5"
  GW_BREW_ACTIVE_MARKER="$6"
  GW_BREW_ACTIVE_STATUS_FILE="$7"
  GW_BREW_ACTIVE_WATCHDOG=""
}

gw_brew_stage_end() {
  GW_BREW_ACTIVE_PGID_FILE=""
  GW_BREW_ACTIVE_WATCHDOG=""
  GW_BREW_ACTIVE_OUTER_PGID=""
  GW_BREW_ACTIVE_TRANSCRIPT=""
  GW_BREW_ACTIVE_MARKER=""
  GW_BREW_ACTIVE_STATUS_FILE=""
}

# Bounded wait for one pid to leave the process table. A zombie is not running,
# so it counts as stopped.
gw_brew_pid_stopped() {
  local pid="$1" grace="$2" poll="$3" stopped_at state
  [[ -n "$pid" ]] || return 0
  stopped_at="$(date +%s)"
  while :; do
    # kill -0 is the authority on existence. ps is consulted only to classify a
    # process that still exists, never to decide that one is gone: a process
    # table that cannot be read is not evidence of anything, and treating that
    # silence as "stopped" would report a clean close over live processes.
    if ! kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    state="$(ps -p "$pid" -o stat= 2>/dev/null | tr -d '[:space:]')"
    # A zombie holds a table slot but cannot act, so it counts as stopped --
    # only when ps actually answered.
    if [[ -n "$state" && "$state" == Z* ]]; then
      return 0
    fi
    [[ "$(date +%s)" -lt $((stopped_at + grace)) ]] || return 1
    sleep "$poll"
  done
}

# Close whatever attached stage is still live. Safe to call from an EXIT handler
# at any time, including when no stage ever started. Returns 125 when a stage was
# running and its closure could not be confirmed, so a caller folds that into its
# exit status instead of reporting a clean finish over surviving processes.
gw_brew_cleanup_active_stage() {
  local status=0 pgid="" script_pid="" grace poll watchdog
  [[ -n "$GW_BREW_ACTIVE_PGID_FILE" ]] || return 0
  grace="$GW_BREW_ACTIVE_GRACE"
  poll="$GW_BREW_ACTIVE_POLL"
  watchdog="$GW_BREW_ACTIVE_WATCHDOG"
  script_pid="$(gw_brew_script_pid $$)"

  # Stop the watchdog first so it cannot start a second cancellation underneath
  # this one, and prove it actually stopped.
  if [[ -n "$watchdog" ]]; then
    kill -TERM "$watchdog" 2>/dev/null || true
    if ! gw_brew_pid_stopped "$watchdog" "$grace" "$poll"; then
      kill -KILL "$watchdog" 2>/dev/null || true
      if ! gw_brew_pid_stopped "$watchdog" "$grace" "$poll"; then
        echo "Groundwork: the Homebrew watchdog did not stop." >&2
        status=125
      fi
    fi
  fi

  pgid="$(gw_brew_verify_pgid "$GW_BREW_ACTIVE_PGID_FILE" "$GW_BREW_ACTIVE_OUTER_PGID")" \
    || pgid=""
  if [[ -n "$pgid" ]]; then
    gw_brew_cancel_group "$pgid" "$grace" "$poll" || status=$?
  else
    # A stage was begun but never published a usable group. Whether or not the
    # recorder is still visible, nothing here can prove that what it started has
    # stopped -- so this is never reported as a clean close.
    echo "Groundwork: an attached Homebrew stage ended before its process group was known; Homebrew processes may still be running." >&2
    status=125
  fi

  if [[ -n "$script_pid" ]]; then
    kill -TERM "$script_pid" 2>/dev/null || true
    if ! gw_brew_pid_stopped "$script_pid" "$grace" "$poll"; then
      kill -KILL "$script_pid" 2>/dev/null || true
      if ! gw_brew_pid_stopped "$script_pid" "$grace" "$poll"; then
        echo "Groundwork: the Homebrew terminal recorder did not stop." >&2
        status=125
      fi
    fi
  fi

  # An abrupt exit skips the normal cleanup, so remove the stage's private
  # scratch files here. The finalized diagnostic log is deliberately kept.
  [[ -z "$GW_BREW_ACTIVE_TRANSCRIPT" ]] || rm -f -- "$GW_BREW_ACTIVE_TRANSCRIPT"
  [[ -z "$GW_BREW_ACTIVE_STATUS_FILE" ]] || rm -f -- "$GW_BREW_ACTIVE_STATUS_FILE"
  if [[ -n "$GW_BREW_ACTIVE_MARKER" ]]; then
    rm -f -- "$GW_BREW_ACTIVE_MARKER" "${GW_BREW_ACTIVE_MARKER}.pgid" \
      "${GW_BREW_ACTIVE_MARKER}.ready" "${GW_BREW_ACTIVE_MARKER}.takeover"
  fi
  gw_brew_stage_end
  return "$status"
}

# Fail closed: a terminal whose mode could not be read must not be handed to
# script(1), because nothing would be able to give it back.
gw_brew_tty_snapshot() {
  if ! GW_BREW_TTY_STATE="$(stty -g </dev/tty 2>/dev/null)" \
    || [[ -z "$GW_BREW_TTY_STATE" ]]; then
    GW_BREW_TTY_STATE=""
    echo "Groundwork: could not read this terminal's mode; refusing to start an attached Homebrew stage that could not restore it." >&2
    return 1
  fi
  return 0
}

# A failed restore keeps the snapshot: the state is still the truth about how
# this pane was borrowed, and a later attempt can still put it back. Clearing it
# would throw away the only record of what "restored" means.
# Restore against an explicit device path. A watchdog that outlives its
# supervisor has lost the controlling terminal -- the session leader took it
# with it -- so /dev/tty is no longer reachable even though the device still is.
gw_brew_tty_restore_device() {
  local device="$1" state="$2"
  [[ -n "$state" && -n "$device" && -c "$device" ]] || return 125
  stty "$state" <"$device" 2>/dev/null || return 125
  return 0
}

# Identity, not just a pid: pids are reused, and a watchdog that mistakes a new
# process for its supervisor would never take over. The start time distinguishes
# them.
gw_brew_process_identity() {
  ps -p "$1" -o lstart= 2>/dev/null | tr -s '[:space:]' ' '
}

gw_brew_supervisor_alive() {
  local pid="$1" identity="$2" observed
  kill -0 "$pid" 2>/dev/null || return 1
  observed="$(gw_brew_process_identity "$pid")"
  [[ -n "$observed" && "$observed" == "$identity" ]]
}

gw_brew_tty_restore() {
  [[ -n "${GW_BREW_TTY_STATE:-}" ]] || return 0
  if ! stty "$GW_BREW_TTY_STATE" </dev/tty 2>/dev/null; then
    echo "Groundwork: could not restore this terminal's mode. Run 'stty sane' in this pane to recover it." >&2
    return 125
  fi
  GW_BREW_TTY_STATE=""
  return 0
}

# script(1) calls login_tty(), so the command it runs becomes a session leader
# on the nested pseudo-terminal: its own session, its own process group, no
# relation to this shell's. Signalling script alone leaves brew and its sudo,
# installer, and hdiutil descendants running with no terminal attached.
#
# The group is NOT discovered by scanning the process table. Between fork and
# login_tty() the child is briefly still in this shell's group, so a scan can
# read the caller's own pgid and aim cancellation at the update runner. Instead
# the nested shell reports its own group as its very first action — after
# login_tty it is the session and group leader, so its pid IS the pgid. That is
# a fact the group leader knows about itself, available before the workload
# starts, with no window in which the answer is wrong.
#
# This validates that receipt: a real group, never the caller's, never 0 or 1.
gw_brew_verify_pgid() {
  local file="$1" outer="$2" value
  value="$(gw_brew_read_integer "$file" 2 4194304)" || return 1
  [[ "$value" != "$outer" ]] || return 1
  printf '%s' "$value"
}

# Only used to TERM script(1) itself as a backstop when the nested group is
# already gone; the group receipt above is the authority for cancellation.
gw_brew_script_pid() {
  ps -axo pid=,ppid=,comm= 2>/dev/null \
    | awk -v parent="$1" '$2 == parent && $3 ~ /(^|\/)script$/ { print $1; exit }'
}

# Read a typed integer receipt without laundering it. Deleting non-digits would
# turn "12x34" into a plausible pid and "1e9" into 19 — a malformed receipt must
# fail closed, never be repaired into something that looks valid. The WHOLE file
# is the value: trailing content means the writer did not produce what this
# contract describes, so "123\njunk" is rejected rather than truncated to 123.
# Leading zeros are refused too, so one syntax maps to one value.
gw_brew_read_integer() {
  local file="$1" minimum="$2" maximum="$3" contents=""
  [[ -f "$file" && -r "$file" ]] || return 1
  # A sentinel preserves the real bytes: plain command substitution strips ALL
  # trailing newlines, so "123\n\n" would pass a check the contract forbids.
  contents="$(
    cat -- "$file" 2>/dev/null
    printf 'x'
  )" || return 1
  contents="${contents%x}"
  contents="${contents%$'\n'}"
  # Cap the digit count before any arithmetic: bash evaluates a huge literal
  # rather than treating it as out of range.
  [[ "${#contents}" -le 10 ]] || return 1
  [[ "$contents" =~ ^(0|[1-9][0-9]*)$ ]] || return 1
  [[ "$contents" -ge "$minimum" && "$contents" -le "$maximum" ]] || return 1
  printf '%s' "$contents"
}

# A pgid of 0 or 1 is never signalled: those would mean "this process group"
# (which would include the update runner itself) or init.
#
# A zombie is not a running member. It holds a table slot until its parent reaps
# it but cannot execute anything, and `kill -0` cannot tell it apart from a live
# process. Counting zombies as alive would turn ordinary teardown into a false
# "group did not close" report and a spurious failure.
gw_brew_group_alive() {
  local pgid="${1:-}" listing
  [[ "$pgid" =~ ^[0-9]+$ && "$pgid" -gt 1 ]] || return 1
  if listing="$(ps -axo pgid=,stat= 2>/dev/null)" && [[ -n "$listing" ]]; then
    printf '%s\n' "$listing" \
      | awk -v pgid="$pgid" '
          $1 == pgid && $2 !~ /^Z/ { found = 1; exit }
          END { exit !found }'
    return $?
  fi
  # Only if the process table could not be read at all.
  kill -0 "-$pgid" 2>/dev/null
}

# Close the nested process group, TERM before KILL. Used both to cancel and to
# sweep afterwards: brew's own descendants are backgrounded the same way this
# supervisor backgrounds script(1), so they inherit the same ignored SIGINT and
# can outlive the session leader that Ctrl-C did stop. A cancelled upgrade must
# not leave an installer running against a terminal nobody is watching.
# Escalation only counts if closure is confirmed. KILL is not instantaneous and
# is not guaranteed — a process wedged in an uninterruptible device wait
# survives it — so the group is re-checked after the signal and an unclosed
# group is reported, never assumed shut.
gw_brew_cancel_group() {
  local pgid="$1" grace="$2" poll="$3" stopped_at
  gw_brew_group_alive "$pgid" || return 0
  kill -TERM "-$pgid" 2>/dev/null || true
  stopped_at="$(date +%s)"
  while gw_brew_group_alive "$pgid" \
    && [[ "$(date +%s)" -lt $((stopped_at + grace)) ]]; do
    sleep "$poll"
  done
  gw_brew_group_alive "$pgid" || return 0
  kill -KILL "-$pgid" 2>/dev/null || true
  stopped_at="$(date +%s)"
  while gw_brew_group_alive "$pgid" \
    && [[ "$(date +%s)" -lt $((stopped_at + grace)) ]]; do
    sleep "$poll"
  done
  if gw_brew_group_alive "$pgid"; then
    printf 'Groundwork: Homebrew process group %s did not close after SIGKILL; processes remain.\n' \
      "$pgid" >&2
    # shellcheck disable=SC2016 # Literal awk syntax shown to the user, not expanded here.
    printf 'Groundwork: inspect them with: ps -axo pid,pgid,state,command | awk '\''$2 == %s'\''\n' \
      "$pgid" >&2
    return 125
  fi
  return 0
}

# The watchdog is the part that gets backgrounded, because it is the part that
# may safely ignore SIGINT. It observes progress, prints the stall diagnostic,
# and enforces the hard deadline against the nested process group. It records
# the nested pgid as soon as that group exists so the supervisor can sweep for
# orphans afterwards — once cancellation has run there is nothing left to ask.
gw_brew_watchdog() {
  local supervisor="$1" transcript="$2" label="$3" deadline="$4" stall="$5"
  local grace="$6" poll="$7" marker="$8" outer_pgid="$9"
  local identity="${10}" tty_device="${11}"
  local started now last_progress next_stall size previous_size=0
  local script_pid="" pty_pgid=""
  # Outlive the terminal. If the supervisor is killed outright it is the session
  # leader, so its death hangs up this pseudo-terminal and SIGHUP would take the
  # watchdog with it -- exactly when it is the only thing left that can close
  # the nested group. Bash already gives an asynchronous child an ignored SIGINT
  # and SIGQUIT; HUP is the one that has to be refused explicitly.
  trap "" HUP
  # Announce readiness only AFTER the HUP refusal is installed. The supervisor
  # waits for this before starting the workload, so there is no window where the
  # supervisor could die and take an unprotected watchdog with it.
  : >"${marker}.ready"
  started="$(date +%s)"
  last_progress="$started"
  next_stall=$((started + stall))
  while :; do
    # A supervisor killed outright (SIGKILL, or any signal it does not trap)
    # runs no EXIT handler, so nothing else can close what Homebrew started.
    # This is the only observer still alive at that point.
    if ! gw_brew_supervisor_alive "$supervisor" "$identity"; then
      local takeover=0
      [[ -n "$pty_pgid" ]] \
        || pty_pgid="$(gw_brew_verify_pgid "${marker}.pgid" "$outer_pgid")" || pty_pgid=""
      # Close the work first, then the recorder, then give the terminal back.
      # Killing script(1) is what makes this step mandatory: script restores the
      # raw terminal on its own clean exit, and there is no clean exit here.
      if [[ -n "$pty_pgid" ]]; then
        gw_brew_cancel_group "$pty_pgid" "$grace" "$poll" || takeover=125
      else
        takeover=125
      fi
      [[ -n "$script_pid" ]] || script_pid="$(gw_brew_script_pid "$supervisor")"
      if [[ -n "$script_pid" ]]; then
        kill -TERM "$script_pid" 2>/dev/null || true
        if ! gw_brew_pid_stopped "$script_pid" "$grace" "$poll"; then
          kill -KILL "$script_pid" 2>/dev/null || true
          gw_brew_pid_stopped "$script_pid" "$grace" "$poll" || takeover=125
        fi
      fi
      gw_brew_tty_restore_device "$tty_device" "${GW_BREW_TTY_STATE:-}" || takeover=125
      # Nobody is left to receive an exit status, so the outcome is written
      # down instead of returned.
      printf '%s\n' "$takeover" >"${marker}.takeover"
      if [[ "$takeover" -ne 0 ]]; then
        printf 'Groundwork: the Homebrew supervisor died and its stage could not be fully closed.\n' >&2
      fi
      return 0
    fi
    [[ -n "$script_pid" ]] || script_pid="$(gw_brew_script_pid "$supervisor")"
    if [[ -z "$pty_pgid" ]]; then
      pty_pgid="$(gw_brew_verify_pgid "${marker}.pgid" "$outer_pgid")" || pty_pgid=""
    fi
    now="$(date +%s)"
    size="$(wc -c <"$transcript" 2>/dev/null | tr -d '[:space:]')"
    if [[ "$size" =~ ^[0-9]+$ && "$size" -ne "$previous_size" ]]; then
      previous_size="$size"
      last_progress="$now"
      next_stall=$((now + stall))
    elif [[ "$now" -ge "$next_stall" ]]; then
      printf '\r\nGroundwork: %s is still running; no output for %ss. Password input remains attached here.\r\n' \
        "$label" "$((now - last_progress))" >/dev/tty
      printf 'Groundwork: press Ctrl-C here to cancel it.\r\n' >/dev/tty
      # Deliberately NOT the supervisor pid: bash defers a trapped signal while
      # it waits for the foreground script(1), so signalling the supervisor
      # would appear to do nothing while Homebrew kept running. The nested group
      # is the thing actually doing the work, so name that.
      if [[ -n "$pty_pgid" ]]; then
        printf 'Groundwork: if Ctrl-C does not take, from another terminal run: kill -TERM -- -%s\r\n' \
          "$pty_pgid" >/dev/tty
      fi
      printf 'Groundwork: inspect with: ps -axo pid,ppid,pgid,%%cpu,etime,state,command | rg '\''brew|sudo|installer|hdiutil|docker'\''\r\n' >/dev/tty || true
      next_stall=$((now + stall))
    fi
    if [[ "$now" -ge $((started + deadline)) ]]; then
      printf '\r\nGroundwork: %s exceeded its %ss hard deadline; cancelling it.\r\n' \
        "$label" "$deadline" >/dev/tty
      printf 'timed-out\n' >"$marker"
      gw_brew_cancel_group "$pty_pgid" "$grace" "$poll"
      if [[ -n "$script_pid" ]]; then
        kill -TERM "$script_pid" 2>/dev/null || true
      fi
      return 0
    fi
    sleep "$poll"
  done
}

gw_brew_run_logged() {
  local normalized_log="$1" receipt_file="$2" mode="$3" label="$4"
  shift 4
  if [[ "${1:-}" != -- || "$#" -lt 2 ]]; then
    echo "gw_brew_run_logged: expected <log> <receipt> <reset|append> <label> -- <command>" >&2
    return 64
  fi
  shift
  case "$mode" in
    reset | append) ;;
    *)
      echo "gw_brew_run_logged: mode must be reset or append" >&2
      return 64
      ;;
  esac

  local command_status=0 classifier_status=0
  local deadline="${GROUNDWORK_BREW_DEADLINE_SECONDS:-7200}"
  local stall="${GROUNDWORK_BREW_STALL_SECONDS:-180}"
  local grace="${GROUNDWORK_BREW_CANCEL_GRACE_SECONDS:-10}"
  local poll="${GROUNDWORK_BREW_POLL_SECONDS:-1}"
  local numeric
  for numeric in "$deadline" "$stall" "$grace"; do
    if [[ ! "$numeric" =~ ^[0-9]+$ || "$numeric" -lt 1 || "$numeric" -gt 14400 ]]; then
      echo "Groundwork: Homebrew deadline, stall, and grace values must be integers from 1 through 14400 seconds." >&2
      return 64
    fi
  done
  case "$poll" in
    0.05 | 0.1 | 0.2 | 0.5 | 1) ;;
    *)
      echo "Groundwork: the Homebrew poll interval must be one of 0.05, 0.1, 0.2, 0.5, or 1 second." >&2
      return 64
      ;;
  esac

  if [[ "$(uname -s)" == Darwin && -t 0 && -t 1 && -t 2 && -x /usr/bin/script ]]; then
    local transcript marker status_file watchdog timed_out=0 pty_pgid="" recorded
    transcript="$(mktemp "${normalized_log}.pty.XXXXXX")" || return 1
    marker="$(mktemp "${normalized_log}.cancel.XXXXXX")" || return 1
    status_file="$(mktemp "${normalized_log}.status.XXXXXX")" || return 1
    chmod 600 "$transcript" "$marker" "$status_file"

    # Everything that can refuse the stage is settled BEFORE the terminal
    # snapshot and the trap swap, so no early exit can leave the caller with
    # borrowed traps or a half-taken terminal. After this point there is exactly
    # one way out, at the bottom of the branch.
    #
    # Without a trustworthy caller pgid the race guard cannot exclude this
    # shell's own group, and cancellation could aim at the update runner itself.
    local outer_pgid
    outer_pgid="$(ps -o pgid= -p $$ 2>/dev/null | tr -d '[:space:]')"
    if [[ ! "$outer_pgid" =~ ^[1-9][0-9]*$ ]]; then
      rm -f -- "$transcript" "$marker" "$status_file"
      echo "Groundwork: could not read this shell's process group; refusing to start an attached Homebrew stage that could not be cancelled safely." >&2
      return 125
    fi

    printf 'Groundwork: %s is attached directly to this terminal; password prompts stay visible.\n' "$label" >/dev/tty
    printf 'Groundwork: hard deadline %ss; quiet for %ss triggers a diagnostic, not cancellation.\n' "$deadline" "$stall" >/dev/tty
    printf 'Groundwork: press Ctrl-C to cancel; the whole Homebrew process group stops and this terminal is restored.\n' >/dev/tty

    # Take the terminal snapshot BEFORE script(1) switches it to raw, so every
    # exit path below can hand the caller back a working pane. If the mode
    # cannot be read, nothing here can promise to restore it — stop instead.
    if ! gw_brew_tty_snapshot; then
      rm -f -- "$transcript" "$marker" "$status_file"
      return 125
    fi

    # The caller's own INT, TERM, and HUP traps are deliberately left ALONE.
    # They already exit 129/130/143, which is exactly the right response, so
    # borrowing them for this stage and handing them back would add a
    # save/restore step that can only ever match what is already installed.
    #
    # Nothing here needs them either: the real terminal is in raw mode for the
    # whole stage, so no keypress reaches this shell as a signal. Cancellation
    # is read from the workload's own recorded status instead, which is the
    # path a relayed Ctrl-C actually takes. An external `kill` still reaches the
    # caller's trap unchanged, and the stall diagnostic names the nested group
    # so an operator can close the work directly.

    # Bash forces SIGINT and SIGQUIT to SIG_IGN for an ASYNCHRONOUS child of a
    # non-interactive shell, and a signal ignored on entry to a shell cannot be
    # trapped or reset from inside it — `trap - INT` in the subshell does not
    # undo it. The disposition then survives exec, through script(1) and on into
    # brew and everything brew runs. So backgrounding the workload would hand
    # the whole Homebrew tree a permanently ignored interrupt, and the Ctrl-C
    # that script relays into the nested terminal would be delivered to
    # processes that discard it — every run, not just a wedged one.
    #
    # The workload therefore runs in the FOREGROUND, where it inherits the
    # default disposition and Ctrl-C is real, and the watchdog is what gets
    # backgrounded instead. `set -m` is not the fix here: job control would move
    # the workload to a background process group, and its first read of the
    # terminal for a password would raise SIGTTIN and stop it.
    # From here until stage_end, the caller's EXIT handler can close this stage
    # even if a signal exits the shell before the sweep below is reached.
    gw_brew_stage_begin "${marker}.pgid" "$outer_pgid" "$grace" "$poll" \
      "$transcript" "$marker" "$status_file"
    local supervisor_identity tty_device ready_waited=0
    supervisor_identity="$(gw_brew_process_identity $$)"
    tty_device="$(tty 2>/dev/null || true)"
    gw_brew_watchdog "$$" "$transcript" "$label" "$deadline" "$stall" \
      "$grace" "$poll" "$marker" "$outer_pgid" "$supervisor_identity" "$tty_device" &
    watchdog=$!
    GW_BREW_ACTIVE_WATCHDOG="$watchdog"
    # Do not start the workload until the watchdog has refused SIGHUP. Before
    # that it could be torn down with the supervisor, leaving nothing to close
    # the stage.
    while [[ ! -e "${marker}.ready" && "$ready_waited" -lt 100 ]]; do
      kill -0 "$watchdog" 2>/dev/null || break
      ready_waited=$((ready_waited + 1))
      sleep 0.05
    done
    if [[ ! -e "${marker}.ready" ]]; then
      gw_brew_stage_end
      kill -KILL "$watchdog" 2>/dev/null || true
      gw_brew_tty_restore || true
      rm -f -- "$transcript" "$marker" "$status_file"
      echo "Groundwork: the Homebrew watchdog did not start; refusing to run an attached stage nothing could cancel." >&2
      return 125
    fi
    # script(1) -e collapses a signalled workload into an ordinary nonzero
    # status, so a cancellation would be indistinguishable from a Homebrew
    # failure — and update-all already spends exit 2 on "review required". The
    # inner shell records the true status from inside the nested session, so
    # cancellation stays cancellation all the way up to the runner.
    # After script(1)'s login_tty this shell IS the session and process-group
    # leader of the nested terminal, so $$ is the group id. Recording it here,
    # before the workload is allowed to start, means the group is known from the
    # first instant it exists — there is no window in which a Ctrl-C arrives
    # against a group nothing has identified yet.
    # The receipt paths are passed as ARGUMENTS, not exported variables, and the
    # wrapper copies them into locals before the workload runs. Homebrew and its
    # descendants therefore never see them in the environment: a child cannot
    # overwrite the status receipt or point cleanup at another process group.
    #
    # Publication is fail-closed. If the group cannot be recorded and read back,
    # the workload is never started — an unrecorded group is one Ctrl-C could
    # not close, which is exactly the failure this path exists to prevent.
    # shellcheck disable=SC2016 # The inner shell expands these, not this one.
    /usr/bin/script -q -e -F "$transcript" /bin/bash -c '
        gw_pgid_file="$1"
        gw_status_file="$2"
        shift 2
        if ! printf "%s" "$$" >"$gw_pgid_file" \
          || [[ "$(cat -- "$gw_pgid_file" 2>/dev/null)" != "$$" ]]; then
          printf "Groundwork: could not publish the Homebrew process group; refusing to start it.\n" >&2
          printf 125 >"$gw_status_file"
          exit 125
        fi
        trap "printf 130 >\"$gw_status_file\"; exit 130" INT
        trap "printf 143 >\"$gw_status_file\"; exit 143" TERM
        trap "printf 129 >\"$gw_status_file\"; exit 129" HUP
        workload_status=0
        "$@" || workload_status=$?
        printf "%s" "$workload_status" >"$gw_status_file"
        exit "$workload_status"
      ' gw-brew-workload "${marker}.pgid" "$status_file" "$@" </dev/tty >/dev/tty 2>/dev/tty \
      || command_status=$?
    if [[ -s "$status_file" ]]; then
      if recorded="$(gw_brew_read_integer "$status_file" 0 255)"; then
        command_status="$recorded"
      else
        echo "Groundwork: the Homebrew workload recorded a malformed exit status; treating the stage as failed." >&2
        [[ "$command_status" -ne 0 ]] || command_status=1
      fi
    fi
    kill -TERM "$watchdog" 2>/dev/null || true
    wait "$watchdog" 2>/dev/null || true
    # Forget the watchdog only once it is confirmed stopped. `wait` returns
    # early when a signal trap runs, without reaping, and clearing the record
    # then would leave the caller's EXIT handler with nothing to clean up.
    if gw_brew_pid_stopped "$watchdog" "$grace" "$poll"; then
      GW_BREW_ACTIVE_WATCHDOG=""
    fi

    [[ ! -s "$marker" ]] || timed_out=1
    pty_pgid="$(gw_brew_verify_pgid "${marker}.pgid" "$outer_pgid")" || pty_pgid=""

    # Sweep on every path, including a clean exit and a Ctrl-C the nested
    # terminal delivered without this supervisor ever seeing a signal. brew
    # backgrounds its own helpers exactly the way this function backgrounds the
    # watchdog, so they carry the same ignored interrupt and can outlive the
    # session leader that Ctrl-C did stop. Whatever brew started does not
    # outlive this function.
    local sweep_status=0 restore_status=0
    gw_brew_cancel_group "$pty_pgid" "$grace" "$poll" || sweep_status=$?
    # A clean, fast workload can finish before the watchdog ever sees its group,
    # and that is fine — there is nothing left to close. But if this stage was
    # CANCELLED, an unverified group means Homebrew may still be running with no
    # terminal attached and nothing proved otherwise. Say so rather than report a
    # tidy cancellation.
    local was_cancelled=0
    [[ "$timed_out" -eq 0 ]] || was_cancelled=1
    case "$command_status" in 129 | 130 | 143) was_cancelled=1 ;; esac
    if [[ -z "$pty_pgid" && "$was_cancelled" -ne 0 ]]; then
      echo "Groundwork: cancelled $label without confirming its process group; Homebrew processes may still be running." >&2
      echo "Groundwork: check with: ps -axo pid,ppid,pgid,state,command | rg 'brew|sudo|installer|hdiutil'" >&2
      [[ "$sweep_status" -ne 0 ]] || sweep_status=125
    fi
    # Restore before classifying: the terminal must come back even if the
    # classifier itself fails.
    gw_brew_tty_restore || restore_status=$?
    # Only now is the stage genuinely over: the group is closed and the terminal
    # is back. A signal arriving before this point still finds an active stage
    # for the caller's EXIT handler to close.
    gw_brew_stage_end
    gw_brew_classify_transcript "$transcript" "$normalized_log" "$receipt_file" "$mode" \
      || classifier_status=$?
    rm -f -- "$transcript" "$marker" "${marker}.pgid" "${marker}.ready" \
      "${marker}.takeover" "$status_file"
    # An unclosed process group or an unrestored terminal is the failure this
    # whole path exists to prevent, so it outranks the workload's own status.
    [[ "$sweep_status" -eq 0 ]] || return "$sweep_status"
    [[ "$restore_status" -eq 0 ]] || return "$restore_status"
    [[ "$timed_out" -eq 0 ]] || return 124
    # script(1) -e reports the workload's status; a workload killed by SIGINT
    # surfaces as 130 and is a cancellation, not a Homebrew failure.
    [[ "$command_status" -ne 0 ]] && return "$command_status"
    return "$classifier_status"
  fi

  local pipeline_status=()
  "$@" 2>&1 | gw_brew_classify_stream "$normalized_log" "$receipt_file" "$mode"
  pipeline_status=("${PIPESTATUS[@]}")
  command_status="${pipeline_status[0]}"
  classifier_status="${pipeline_status[1]}"
  [[ "$command_status" -ne 0 ]] && return "$command_status"
  return "$classifier_status"
}

gw_brew_classification_count() {
  local key="$1" receipt_file="$2"
  if [[ ! -r "$receipt_file" ]]; then
    echo 0
    return 0
  fi
  awk -F '\t' -v wanted="$key" '$1 == wanted && $2 ~ /^[0-9]+$/ { print $2; found = 1; exit }
    END { if (!found) print 0 }' "$receipt_file" 2>/dev/null
}

gw_brew_classification_values() {
  local key="$1" receipt_file="$2"
  [[ -r "$receipt_file" ]] || return 0
  awk -F '\t' -v wanted="$key" '$1 == wanted && NF == 2 { print $2 }' \
    "$receipt_file" 2>/dev/null
}

gw_brew_report_classification() {
  local label="$1" receipt_file="$2" raw_log="$3" status="${4:-0}"
  local current_count warning_count error_count failed_cask raw_display="$raw_log"
  current_count="$(gw_brew_classification_count current "$receipt_file")"
  warning_count="$(gw_brew_classification_count warning "$receipt_file")"
  error_count="$(gw_brew_classification_count error "$receipt_file")"
  # shellcheck disable=SC2088 # This is a user-facing display path, not an input path.
  case "$raw_display" in
    "$HOME"/*) raw_display="~/${raw_display#"$HOME"/}" ;;
  esac
  printf '\n%s\n' "$label"
  if [[ "$status" -eq 0 ]]; then
    echo '  Result: completed'
  else
    printf '  Result: failed (exit %s)\n' "$status"
  fi
  if [[ "$current_count" -gt 0 ]]; then
    printf '  Current: %s known no-change message(s) summarized\n' "$current_count"
  else
    echo '  Current: no known no-change warning messages'
  fi
  if [[ "$warning_count" -gt 0 ]]; then
    printf '  Warnings: %s preserved above\n' "$warning_count"
  else
    echo '  Warnings: none'
  fi
  if [[ "$error_count" -gt 0 ]]; then
    printf '  Errors: %s preserved above\n' "$error_count"
  else
    echo '  Errors: none observed in Homebrew output'
  fi
  while IFS= read -r failed_cask; do
    [[ -n "$failed_cask" ]] || continue
    printf '  Failed cask: %s\n' "$failed_cask"
  done < <(gw_brew_classification_values failed-cask "$receipt_file")
  printf '  Details: %s\n' "$raw_display"
  if [[ "$status" -ne 0 ]]; then
    while IFS= read -r failed_cask; do
      [[ -n "$failed_cask" ]] || continue
      printf '\n  Owner-run recovery for %s:\n' "$failed_cask"
      printf '    brew remove --force --cask %s\n' "$failed_cask"
      printf '    brew install --cask %s\n' "$failed_cask"
      printf '    brew list --cask --versions %s\n' "$failed_cask"
      echo '  Application data and preferences are outside this recovery scope.'
    done < <(gw_brew_classification_values failed-cask "$receipt_file")
  fi
}
