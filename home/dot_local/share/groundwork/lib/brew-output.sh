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
    local transcript started now last_progress next_stall size previous_size=0
    local child timed_out=0 stopped_at
    transcript="$(mktemp "${normalized_log}.pty.XXXXXX")" || return 1
    chmod 600 "$transcript"
    printf 'Groundwork: %s is attached directly to this terminal; password prompts stay visible.\n' "$label" >/dev/tty
    printf 'Groundwork: hard deadline %ss; quiet for %ss triggers a diagnostic, not cancellation.\n' "$deadline" "$stall" >/dev/tty
    started="$(date +%s)"
    last_progress="$started"
    next_stall=$((started + stall))
    /usr/bin/script -q -e -F "$transcript" "$@" </dev/tty >/dev/tty 2>/dev/tty &
    child=$!
    while kill -0 "$child" 2>/dev/null; do
      now="$(date +%s)"
      size="$(wc -c <"$transcript" | tr -d '[:space:]')"
      if [[ "$size" =~ ^[0-9]+$ && "$size" -ne "$previous_size" ]]; then
        previous_size="$size"
        last_progress="$now"
        next_stall=$((now + stall))
      elif [[ "$now" -ge "$next_stall" ]]; then
        printf '\r\nGroundwork: %s is still running; no output for %ss. Password input remains attached here.\r\n' \
          "$label" "$((now - last_progress))" >/dev/tty
        printf 'Groundwork: inspect from another terminal with: ps -axo pid,ppid,%%cpu,etime,state,command | rg '\''brew|sudo|installer|hdiutil|docker'\''\r\n' >/dev/tty
        next_stall=$((now + stall))
      fi
      if [[ "$now" -ge $((started + deadline)) ]]; then
        printf '\r\nGroundwork: %s exceeded its %ss hard deadline; cancelling it.\r\n' "$label" "$deadline" >/dev/tty
        kill -TERM "$child" 2>/dev/null || true
        stopped_at="$now"
        while kill -0 "$child" 2>/dev/null && [[ "$(date +%s)" -lt $((stopped_at + grace)) ]]; do
          sleep "$poll"
        done
        if kill -0 "$child" 2>/dev/null; then
          kill -KILL "$child" 2>/dev/null || true
        fi
        timed_out=1
        break
      fi
      sleep "$poll"
    done
    wait "$child" || command_status=$?
    gw_brew_classify_transcript "$transcript" "$normalized_log" "$receipt_file" "$mode" \
      || classifier_status=$?
    rm -f -- "$transcript"
    [[ "$timed_out" -eq 0 ]] || return 124
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
