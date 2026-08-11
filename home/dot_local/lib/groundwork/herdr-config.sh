#!/usr/bin/env bash

# Ownership and atomic lifecycle helpers for Groundwork's Herdr configuration.
# Sourced by the apply hook and the installed inspection/removal command.

groundwork_herdr_sha256() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    echo "Groundwork Herdr config: neither shasum nor sha256sum is available; ownership cannot be proved." >&2
    return 1
  fi
}

groundwork_herdr_hash_is_valid() {
  [[ "$1" =~ ^[0-9a-f]{64}$ ]]
}

groundwork_herdr_require_plain_ancestor_chain() {
  local path
  path="$(dirname "$1")"
  while [[ "$path" != / && "$path" != . ]]; do
    [[ ! -L "$path" ]] || {
      echo "Groundwork Herdr config: path ancestor is a symlink; refusing to follow it: $path" >&2
      return 1
    }
    [[ ! -e "$path" || -d "$path" ]] || {
      echo "Groundwork Herdr config: path ancestor is not a directory: $path" >&2
      return 1
    }
    path="$(dirname "$path")"
  done
}

groundwork_herdr_require_plain_directories() {
  local path
  for path in "$@"; do
    [[ ! -L "$path" ]] || {
      echo "Groundwork Herdr config: managed path parent is a symlink; refusing to follow it: $path" >&2
      return 1
    }
    [[ ! -e "$path" || -d "$path" ]] || {
      echo "Groundwork Herdr config: managed path parent is not a directory: $path" >&2
      return 1
    }
  done
}

groundwork_herdr_effective_target() {
  if [[ -n "${HERDR_CONFIG_PATH:-}" ]]; then
    printf '%s\n' "$HERDR_CONFIG_PATH"
  else
    printf '%s/herdr/config.toml\n' "${XDG_CONFIG_HOME:-$HOME/.config}"
  fi
}

groundwork_herdr_read_receipt() {
  local contents line_count
  groundwork_herdr_require_plain_ancestor_chain "$1" || return 1
  [[ -f "$1" && ! -L "$1" ]] || return 1
  line_count="$(wc -l <"$1" | tr -d '[:space:]')"
  [[ "$line_count" == 1 ]] || return 1
  contents="$(cat "$1")" || return 1
  [[ "$contents" == sha256:* ]] || return 1
  contents="${contents#sha256:}"
  groundwork_herdr_hash_is_valid "$contents" || return 1
  printf '%s\n' "$contents"
}

groundwork_herdr_restore_quarantine() {
  local quarantined="$1" target="$2"
  if [[ ! -e "$target" && ! -L "$target" ]]; then
    mv -- "$quarantined" "$target"
    rmdir "$(dirname "$quarantined")" 2>/dev/null || true
    return 0
  fi
  echo "Groundwork Herdr config: $target appeared during the transaction." >&2
  echo "The previous file remains quarantined at $quarantined; reconcile both paths manually." >&2
  return 1
}

groundwork_herdr_owned_hash() {
  local quarantined="$1" desired="$2" receipt="$3" actual desired_hash recorded
  [[ -f "$quarantined" && ! -L "$quarantined" ]] || return 1
  actual="$(groundwork_herdr_sha256 "$quarantined")" || return 1
  desired_hash="$(groundwork_herdr_sha256 "$desired")" || return 1
  [[ "$actual" == "$desired_hash" ]] && return 0
  if recorded="$(groundwork_herdr_read_receipt "$receipt" 2>/dev/null)"; then
    [[ "$actual" == "$recorded" ]] && return 0
  fi
  return 1
}

groundwork_herdr_record() {
  local target="$1" desired="$2" receipt="$3" actual desired_hash state_dir temporary
  groundwork_herdr_require_plain_ancestor_chain "$target" || return 1
  groundwork_herdr_require_plain_ancestor_chain "$receipt" || return 1
  [[ -f "$target" && ! -L "$target" ]] || return 1
  actual="$(groundwork_herdr_sha256 "$target")" || return 1
  desired_hash="$(groundwork_herdr_sha256 "$desired")" || return 1
  [[ "$actual" == "$desired_hash" ]] || {
    echo "Groundwork Herdr config: apply did not produce the exact managed file; ownership was not recorded." >&2
    return 1
  }
  state_dir="$(dirname "$receipt")"
  groundwork_herdr_require_plain_directories \
    "$(dirname "$(dirname "$state_dir")")" "$(dirname "$state_dir")" "$state_dir" || return 1
  [[ ! -L "$receipt" && (! -e "$receipt" || -f "$receipt") ]] || {
    echo "Groundwork Herdr config: ownership receipt is redirected or not a regular file: $receipt" >&2
    return 1
  }
  mkdir -p "$state_dir"
  groundwork_herdr_require_plain_directories "$state_dir" || return 1
  temporary="$(mktemp "$state_dir/.herdr-config.XXXXXX")"
  chmod 600 "$temporary"
  printf 'sha256:%s\n' "$actual" >"$temporary"
  mv -f "$temporary" "$receipt"
}

groundwork_herdr_apply_owned() {
  local target="$1" desired="$2" receipt="$3"
  local config_dir target_dir state_dir quarantine_dir quarantined temporary desired_hash
  [[ -f "$desired" && ! -L "$desired" ]] || {
    echo "Groundwork Herdr config: managed source is missing or redirected: $desired" >&2
    return 1
  }
  desired_hash="$(groundwork_herdr_sha256 "$desired")" || return 1
  groundwork_herdr_hash_is_valid "$desired_hash" || return 1
  groundwork_herdr_require_plain_ancestor_chain "$target" || return 1
  groundwork_herdr_require_plain_ancestor_chain "$receipt" || return 1

  target_dir="$(dirname "$target")"
  config_dir="$(dirname "$target_dir")"
  state_dir="$(dirname "$receipt")"
  groundwork_herdr_require_plain_directories \
    "$config_dir" "$target_dir" \
    "$(dirname "$(dirname "$state_dir")")" "$(dirname "$state_dir")" "$state_dir" || return 1
  [[ ! -L "$receipt" && (! -e "$receipt" || -f "$receipt") ]] || {
    echo "Groundwork Herdr config: ownership receipt is redirected or not a regular file: $receipt" >&2
    return 1
  }
  mkdir -p "$target_dir"
  groundwork_herdr_require_plain_directories "$config_dir" "$target_dir" || return 1
  [[ ! -L "$target" ]] || {
    echo "Groundwork Herdr config: $target is a symlink; refusing to replace its destination." >&2
    return 1
  }
  [[ ! -e "$target" || -f "$target" ]] || {
    echo "Groundwork Herdr config: $target is not a regular file; refusing to replace it." >&2
    return 1
  }

  quarantine_dir=""
  quarantined=""
  if [[ -e "$target" ]]; then
    quarantine_dir="$(mktemp -d "$target_dir/.groundwork-herdr-apply.XXXXXX")"
    quarantined="$quarantine_dir/config.toml"
    mv -- "$target" "$quarantined" || return 1
    if ! groundwork_herdr_owned_hash "$quarantined" "$desired" "$receipt"; then
      groundwork_herdr_restore_quarantine "$quarantined" "$target" || true
      echo "Groundwork Herdr config: an unowned or changed file blocks adoption at $target." >&2
      echo "Your file was left untouched. Merge it into the managed source or move it aside, then rerun chezmoi apply." >&2
      return 1
    fi
  fi

  temporary="$(mktemp "$target_dir/.herdr-config.XXXXXX")"
  chmod 644 "$temporary"
  cat "$desired" >"$temporary"
  if ! ln "$temporary" "$target"; then
    rm -f -- "$temporary"
    [[ -z "$quarantined" ]] || groundwork_herdr_restore_quarantine "$quarantined" "$target" || true
    echo "Groundwork Herdr config: $target appeared during apply; no file was overwritten." >&2
    return 1
  fi
  if ! groundwork_herdr_record "$target" "$desired" "$receipt"; then
    if [[ -f "$target" && ! -L "$target" && "$target" -ef "$temporary" ]]; then
      rm -f -- "$target"
    fi
    rm -f -- "$temporary"
    [[ -z "$quarantined" ]] || groundwork_herdr_restore_quarantine "$quarantined" "$target" || true
    echo "Groundwork Herdr config: ownership could not be recorded; the new file was withdrawn." >&2
    return 1
  fi
  rm -f -- "$temporary"
  if [[ -n "$quarantined" ]]; then
    rm -f -- "$quarantined"
    rmdir "$quarantine_dir" 2>/dev/null || true
  fi
}

groundwork_herdr_remove_owned() {
  local target="$1" receipt="$2" actual recorded quarantine_dir quarantined
  groundwork_herdr_require_plain_ancestor_chain "$target" || return 1
  groundwork_herdr_require_plain_ancestor_chain "$receipt" || return 1
  [[ ! -L "$target" && -f "$target" ]] || {
    echo "Groundwork Herdr config: no removable Groundwork-owned regular file exists at $target." >&2
    return 1
  }
  recorded="$(groundwork_herdr_read_receipt "$receipt")" || {
    echo "Groundwork Herdr config: no valid ownership receipt exists; refusing to remove $target." >&2
    return 1
  }
  quarantine_dir="$(mktemp -d "$(dirname "$target")/.groundwork-herdr-remove.XXXXXX")"
  quarantined="$quarantine_dir/config.toml"
  mv -- "$target" "$quarantined" || return 1
  actual="$(groundwork_herdr_sha256 "$quarantined")" || {
    groundwork_herdr_restore_quarantine "$quarantined" "$target" || true
    return 1
  }
  if [[ "$actual" != "$recorded" ]]; then
    groundwork_herdr_restore_quarantine "$quarantined" "$target" || true
    echo "Groundwork Herdr config: $target has user changes; refusing to remove it." >&2
    return 1
  fi
  rm -f -- "$quarantined" "$receipt"
  rmdir "$quarantine_dir" "$(dirname "$target")" 2>/dev/null || true
}
