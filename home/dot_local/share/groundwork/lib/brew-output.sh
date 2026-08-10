#!/usr/bin/env bash

# Classify Homebrew's human stream without turning unknown warnings into
# success. Callers keep the raw log; this filter suppresses only two exact,
# bounded no-change message shapes that Homebrew currently prefixes Warning:.

gw_brew_classify_stream() {
  local raw_log="$1" receipt_file="$2" mode="${3:-reset}" esc
  esc="$(printf '\033')"
  awk -v raw_log="$raw_log" -v receipt_file="$receipt_file" \
    -v mode="$mode" -v esc="$esc" '
    BEGIN {
      current = 0
      warnings = 0
      if (mode == "append") {
        while ((getline prior < receipt_file) > 0) {
          split(prior, fields, "\t")
          if (fields[1] == "current" && fields[2] ~ /^[0-9]+$/) current = fields[2]
          if (fields[1] == "warning" && fields[2] ~ /^[0-9]+$/) warnings = fields[2]
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
    }
    END {
      printf "current\t%d\nwarning\t%d\n", current, warnings > receipt_file
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

gw_brew_report_classification() {
  local label="$1" receipt_file="$2" raw_log="$3"
  local current_count warning_count raw_display="$raw_log"
  current_count="$(gw_brew_classification_count current "$receipt_file")"
  warning_count="$(gw_brew_classification_count warning "$receipt_file")"
  # shellcheck disable=SC2088 # This is a user-facing display path, not an input path.
  case "$raw_display" in
    "$HOME"/*) raw_display="~/${raw_display#"$HOME"/}" ;;
  esac
  printf '\n%s\n' "$label"
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
  printf '  Details: %s\n' "$raw_display"
}
