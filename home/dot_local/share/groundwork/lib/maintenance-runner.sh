#!/usr/bin/env bash

# Shared bounded process-group runner for Groundwork maintenance helpers.
# Callers validate and set these globals before sourcing:
#   deadline observe_deadline heartbeat cancel_grace poll_seconds orphan_grace
# shellcheck disable=SC2154 # The caller-owned globals are this library's API.

bounded_kill() {
  local child="$1" pgid="$2" signal="${3:-TERM}"
  if [[ "$pgid" =~ ^[0-9]+$ ]]; then
    kill "-$signal" -- "-$pgid" 2>/dev/null || true
  elif [[ "$child" =~ ^[0-9]+$ ]]; then
    kill "-$signal" "$child" 2>/dev/null || true
  fi
}

bounded_child_running() {
  local child="$1" state
  kill -0 "$child" 2>/dev/null || return 1
  state="$(ps -o stat= -p "$child" 2>/dev/null | tr -d '[:space:]' || true)"
  if [[ -z "$state" ]]; then
    kill -0 "$child" 2>/dev/null
    return
  fi
  [[ "$state" != Z* ]]
}

bounded_tree_running() {
  local child="$1" pgid="$2"
  if [[ "$pgid" =~ ^[0-9]+$ ]]; then
    kill -0 -- "-$pgid" 2>/dev/null
  else
    kill -0 "$child" 2>/dev/null
  fi
}

bounded_describe_tree() {
  local pgid="$1" members
  members="$(LC_ALL=C ps -eo pid=,pgid=,comm= 2>/dev/null \
    | awk -v wanted="$pgid" '$2 == wanted {
        pid = $1
        executable = $3
        gsub(/[^[:alnum:]_.+\/-]/, "?", executable)
        printf "    PID %s: executable %s\n", pid, executable
      }')"
  if [[ -n "$members" ]]; then
    printf '%s\n' "$members" >&2
  else
    echo "    PID/executable details became unavailable before inspection." >&2
  fi
}

bounded_restore_traps() {
  local saved_hup="$1" saved_int="$2" saved_term="$3"
  if [[ -n "$saved_hup" ]]; then eval "$saved_hup"; else trap - HUP; fi
  if [[ -n "$saved_int" ]]; then eval "$saved_int"; else trap - INT; fi
  if [[ -n "$saved_term" ]]; then eval "$saved_term"; else trap - TERM; fi
}

bounded_shutdown() {
  local child="$1" pgid="$2" stopped_at now
  bounded_kill "$child" "$pgid" TERM
  stopped_at="$(date +%s)"
  while bounded_tree_running "$child" "$pgid"; do
    now="$(date +%s)"
    [[ "$now" -lt $((stopped_at + cancel_grace)) ]] || break
    sleep "$poll_seconds"
  done
  if bounded_tree_running "$child" "$pgid"; then
    bounded_kill "$child" "$pgid" KILL
  fi
  stopped_at="$(date +%s)"
  while bounded_tree_running "$child" "$pgid"; do
    now="$(date +%s)"
    [[ "$now" -lt $((stopped_at + cancel_grace)) ]] || break
    sleep "$poll_seconds"
  done
  if bounded_tree_running "$child" "$pgid"; then
    echo "  Groundwork: the maintenance process tree could not be fully stopped." >&2
    return 1
  fi
  wait "$child" 2>/dev/null || true
  return 0
}

run_bounded_internal() {
  local label="$1" seconds="$2" output="$3"
  shift 3
  local started now next_heartbeat child="" pgid="" status=0 interrupted=0
  local child_reaped=0 leader_exited_at=0 monitor_was_on=0
  local saved_hup saved_int saved_term
  saved_hup="$(trap -p HUP || true)"
  saved_int="$(trap -p INT || true)"
  saved_term="$(trap -p TERM || true)"
  started="$(date +%s)"
  next_heartbeat=$((started + heartbeat))
  # Install local handlers before launch. A signal in the launch window records
  # intent immediately; once child/pgid exist the same handler starts
  # cancellation and the loop completes the bounded TERM-to-KILL sequence.
  trap 'interrupted=129; bounded_kill "$child" "$pgid" TERM' HUP
  trap 'interrupted=130; bounded_kill "$child" "$pgid" TERM' INT
  trap 'interrupted=143; bounded_kill "$child" "$pgid" TERM' TERM
  case "$-" in
    *m*) monitor_was_on=1 ;;
  esac
  set -m
  if [[ -n "$output" ]]; then
    "$@" </dev/null >"$output" &
  else
    "$@" </dev/null &
  fi
  child=$!
  # With monitor mode enabled for the launch, Bash makes the child the leader
  # of a new process group whose ID is the child PID.
  pgid="$child"
  if [[ "$monitor_was_on" -eq 1 ]]; then
    set -m
  else
    set +m
  fi
  while bounded_tree_running "$child" "$pgid"; do
    if [[ "$child_reaped" -eq 0 ]] && ! bounded_child_running "$child"; then
      wait "$child" || status=$?
      child_reaped=1
      leader_exited_at="$(date +%s)"
    fi
    if [[ "$interrupted" -ne 0 ]]; then
      trap '' HUP INT TERM
      if ! bounded_shutdown "$child" "$pgid"; then
        bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
        return 125
      fi
      bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
      return "$interrupted"
    fi
    now="$(date +%s)"
    if [[ "$now" -ge $((started + seconds)) ]]; then
      echo "  Groundwork: $label exceeded its ${seconds}s hard deadline; cancelling its process tree." >&2
      if [[ "$child_reaped" -eq 1 ]]; then
        bounded_describe_tree "$pgid"
      fi
      trap '' HUP INT TERM
      if ! bounded_shutdown "$child" "$pgid"; then
        bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
        return 125
      fi
      bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
      return 124
    fi
    if [[ "$child_reaped" -eq 1 && "$now" -ge $((leader_exited_at + orphan_grace)) ]]; then
      echo "  Groundwork: $label left a background process in its maintenance group after the ${orphan_grace}s drain grace; cancelling it." >&2
      bounded_describe_tree "$pgid"
      trap '' HUP INT TERM
      if ! bounded_shutdown "$child" "$pgid"; then
        bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
        return 125
      fi
      bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
      [[ "$status" -ne 0 ]] && return "$status"
      return 1
    fi
    if [[ "$now" -ge "$next_heartbeat" ]]; then
      echo "  Still running: $label ($((now - started))s elapsed)" >&2
      next_heartbeat=$((now + heartbeat))
    fi
    sleep "$poll_seconds"
  done
  if [[ "$interrupted" -ne 0 ]]; then
    trap '' HUP INT TERM
    if ! bounded_shutdown "$child" "$pgid"; then
      bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
      return 125
    fi
    bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
    return "$interrupted"
  fi
  if [[ "$child_reaped" -eq 0 ]]; then
    wait "$child" || status=$?
  fi
  if [[ "$interrupted" -ne 0 ]]; then
    bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
    return "$interrupted"
  fi
  bounded_restore_traps "$saved_hup" "$saved_int" "$saved_term"
  return "$status"
}

run_bounded() {
  local label="$1"
  shift
  echo "  Running: $label (deadline ${deadline}s; Ctrl-C cancels)"
  run_bounded_internal "$label" "$deadline" "" "$@"
}

run_bounded_capture() {
  local label="$1" output="$2"
  shift 2
  run_bounded_internal "$label" "$observe_deadline" "$output" "$@"
}

exit_if_terminal_status() {
  case "$1" in
    125 | 129 | 130 | 143) exit "$1" ;;
  esac
}
