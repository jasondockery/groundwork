#!/usr/bin/env bash

# Portable single-writer lock for the complete Groundwork update transaction.
# Callers validate their own arguments before sourcing or acquiring it.

groundwork_lock_dir="${GROUNDWORK_UPDATE_LOCK_DIR:-$HOME/.local/state/groundwork/update-all.lock}"
groundwork_lock_owned=0
groundwork_lock_token="${GROUNDWORK_UPDATE_LOCK_TOKEN:-}"
groundwork_lock_incomplete_grace="${GROUNDWORK_UPDATE_LOCK_INCOMPLETE_GRACE_SECONDS:-5}"
if [[ ! "$groundwork_lock_incomplete_grace" =~ ^[0-9]+$ ||
  "$groundwork_lock_incomplete_grace" -lt 1 ]]; then
  groundwork_lock_incomplete_grace=5
fi

groundwork_lock_read() {
  local file="$1" value=""
  [[ -f "$file" ]] && IFS= read -r value <"$file" 2>/dev/null
  printf '%s' "$value"
}

groundwork_lock_process_start() {
  if [[ -n "${GROUNDWORK_UPDATE_LOCK_PROCESS_START_OVERRIDE:-}" ]]; then
    printf '%s\n' "$GROUNDWORK_UPDATE_LOCK_PROCESS_START_OVERRIDE"
    return
  fi
  ps -o lstart= -p "$1" 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

groundwork_lock_mtime() {
  local value
  if value="$(stat -c %Y "$1" 2>/dev/null)" && [[ "$value" =~ ^[0-9]+$ ]]; then
    printf '%s\n' "$value"
    return
  fi
  if value="$(stat -f %m "$1" 2>/dev/null)" && [[ "$value" =~ ^[0-9]+$ ]]; then
    printf '%s\n' "$value"
    return
  fi
  printf '0\n'
}

groundwork_lock_incomplete_is_stale() {
  local now modified
  now="$(date +%s)"
  modified="$(groundwork_lock_mtime "$groundwork_lock_dir")"
  [[ "$modified" -gt 0 && "$now" -ge "$modified" ]] || return 1
  [[ $((now - modified)) -ge "$groundwork_lock_incomplete_grace" ]]
}

groundwork_lock_remove_stale() {
  local expected_pid="$1" expected_token="$2" expected_process_start="$3"
  local current_pid current_token current_process_start
  current_pid="$(groundwork_lock_read "$groundwork_lock_dir/pid")"
  current_token="$(groundwork_lock_read "$groundwork_lock_dir/token")"
  current_process_start="$(groundwork_lock_read "$groundwork_lock_dir/process-start")"
  [[ "$current_pid" == "$expected_pid" &&
    "$current_token" == "$expected_token" &&
    "$current_process_start" == "$expected_process_start" ]] || return 1
  rm -f -- "$groundwork_lock_dir/pid" "$groundwork_lock_dir/started-at" \
    "$groundwork_lock_dir/operation" "$groundwork_lock_dir/token" \
    "$groundwork_lock_dir/process-start" || return 1
  rmdir "$groundwork_lock_dir" 2>/dev/null
}

groundwork_lock_acquire() {
  local operation="$1" attempt owner_pid owner_started owner_operation owner_token
  local owner_process_start current_process_start

  if [[ -n "${GROUNDWORK_UPDATE_LOCK_HELD:-}" ]]; then
    owner_pid="$(groundwork_lock_read "$groundwork_lock_dir/pid")"
    if [[ "$GROUNDWORK_UPDATE_LOCK_HELD" != "1" ||
      -z "$groundwork_lock_token" ||
      ! "$owner_pid" =~ ^[0-9]+$ ||
      "$(groundwork_lock_read "$groundwork_lock_dir/token")" != "$groundwork_lock_token" ]]; then
      echo "Groundwork: inherited update lock state is invalid; refusing to mutate." >&2
      return 75
    fi
    if [[ "$$" == "$owner_pid" ]]; then
      # update-all exec'd the freshly applied runner without changing PID.
      groundwork_lock_owned=1
    elif [[ "$PPID" == "$owner_pid" ]]; then
      # groundwork-cleanup is a direct child and borrows its runner's lock.
      groundwork_lock_owned=0
    else
      echo "Groundwork: inherited update lock token did not come from the lock owner." >&2
      return 75
    fi
    return 0
  fi

  mkdir -p "$(dirname "$groundwork_lock_dir")"
  attempt=0
  while [[ "$attempt" -lt 2 ]]; do
    attempt=$((attempt + 1))
    if mkdir "$groundwork_lock_dir" 2>/dev/null; then
      groundwork_lock_token="$$.$RANDOM.$(date +%s)"
      printf '%s\n' "$$" >"$groundwork_lock_dir/pid"
      date -u '+%Y-%m-%dT%H:%M:%SZ' >"$groundwork_lock_dir/started-at"
      printf '%s\n' "$operation" >"$groundwork_lock_dir/operation"
      printf '%s\n' "$groundwork_lock_token" >"$groundwork_lock_dir/token"
      groundwork_lock_process_start "$$" >"$groundwork_lock_dir/process-start"
      groundwork_lock_owned=1
      export GROUNDWORK_UPDATE_LOCK_HELD=1
      export GROUNDWORK_UPDATE_LOCK_TOKEN="$groundwork_lock_token"
      return 0
    fi

    owner_pid="$(groundwork_lock_read "$groundwork_lock_dir/pid")"
    owner_started="$(groundwork_lock_read "$groundwork_lock_dir/started-at")"
    owner_operation="$(groundwork_lock_read "$groundwork_lock_dir/operation")"
    owner_token="$(groundwork_lock_read "$groundwork_lock_dir/token")"
    owner_process_start="$(groundwork_lock_read "$groundwork_lock_dir/process-start")"
    if [[ ! "$owner_pid" =~ ^[0-9]+$ ||
      -z "$owner_started" ||
      -z "$owner_operation" ||
      -z "$owner_token" ||
      -z "$owner_process_start" ]]; then
      if groundwork_lock_incomplete_is_stale; then
        groundwork_lock_remove_stale "$owner_pid" "$owner_token" "$owner_process_start" || {
          echo "Groundwork: incomplete update lock changed while it was being inspected; retry." >&2
          return 75
        }
        continue
      fi
      echo "Groundwork: another update is acquiring the machine-maintenance lock." >&2
      echo "  Lock: $groundwork_lock_dir" >&2
      return 75
    fi
    if kill -0 "$owner_pid" 2>/dev/null; then
      current_process_start="$(groundwork_lock_process_start "$owner_pid")"
      if [[ -n "$owner_process_start" && -n "$current_process_start" &&
        "$owner_process_start" != "$current_process_start" ]]; then
        groundwork_lock_remove_stale "$owner_pid" "$owner_token" "$owner_process_start" || {
          echo "Groundwork: reused-PID update lock changed while it was being inspected; retry." >&2
          return 75
        }
        continue
      fi
      echo "Groundwork: another update or maintenance run is already active." >&2
      printf '  PID: %s\n  Started: %s\n  Operation: %s\n' \
        "$owner_pid" "${owner_started:-unknown}" "${owner_operation:-unknown}" >&2
      return 75
    fi
    groundwork_lock_remove_stale "$owner_pid" "$owner_token" "$owner_process_start" || {
      echo "Groundwork: stale update lock changed while it was being inspected; retry." >&2
      return 75
    }
  done

  echo "Groundwork: could not acquire the machine-maintenance lock." >&2
  return 75
}

groundwork_lock_release() {
  local current_token
  [[ "$groundwork_lock_owned" -eq 1 ]] || return 0
  current_token="$(groundwork_lock_read "$groundwork_lock_dir/token")"
  [[ "$current_token" == "$groundwork_lock_token" ]] || return 0
  rm -f -- "$groundwork_lock_dir/pid" "$groundwork_lock_dir/started-at" \
    "$groundwork_lock_dir/operation" "$groundwork_lock_dir/token" \
    "$groundwork_lock_dir/process-start" || true
  rmdir "$groundwork_lock_dir" 2>/dev/null || true
  groundwork_lock_owned=0
  return 0
}
