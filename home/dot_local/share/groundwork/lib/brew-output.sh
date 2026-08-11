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
