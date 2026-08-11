#!/usr/bin/env bash

# Ownership and atomic lifecycle helpers for Groundwork's Yazi configuration.
# This file is sourced by chezmoi's apply hook and the installed recovery command.

GROUNDWORK_YAZI_LEGACY_SHA256="902e3187b9eef278f68c3f61118c012756764896fa58d17fb513dbefebebf615"

groundwork_yazi_sha256() { # file
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    echo "Groundwork Yazi config: neither shasum nor sha256sum is available; ownership cannot be proved." >&2
    return 1
  fi
}

groundwork_yazi_hash_is_valid() { # hash
  [[ "$1" =~ ^[0-9a-f]{64}$ ]]
}

groundwork_yazi_require_plain_directories() { # directory...
  local path
  for path in "$@"; do
    [[ ! -L "$path" ]] || {
      echo "Groundwork Yazi config: managed path parent is a symlink; refusing to follow it: $path" >&2
      return 1
    }
    [[ ! -e "$path" || -d "$path" ]] || {
      echo "Groundwork Yazi config: managed path parent is not a directory: $path" >&2
      return 1
    }
  done
}

groundwork_yazi_require_plain_ancestor_chain() { # path
  local path
  path="$(dirname "$1")"
  while [[ "$path" != / && "$path" != . ]]; do
    [[ ! -L "$path" ]] || {
      echo "Groundwork Yazi config: path ancestor is a symlink; refusing to follow it: $path" >&2
      return 1
    }
    [[ ! -e "$path" || -d "$path" ]] || {
      echo "Groundwork Yazi config: path ancestor is not a directory: $path" >&2
      return 1
    }
    path="$(dirname "$path")"
  done
}

groundwork_yazi_effective_target() {
  local config_home
  if [[ -n "${YAZI_CONFIG_HOME:-}" ]]; then
    printf '%s/yazi.toml\n' "${YAZI_CONFIG_HOME%/}"
  else
    config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
    printf '%s/yazi/yazi.toml\n' "${config_home%/}"
  fi
}

groundwork_yazi_read_receipt() { # receipt
  local contents line_count
  groundwork_yazi_require_plain_ancestor_chain "$1" || return 1
  [[ -f "$1" && ! -L "$1" ]] || return 1
  line_count="$(wc -l <"$1" | tr -d '[:space:]')"
  [[ "$line_count" == 1 ]] || return 1
  contents="$(cat "$1")" || return 1
  [[ "$contents" == sha256:* ]] || return 1
  contents="${contents#sha256:}"
  groundwork_yazi_hash_is_valid "$contents" || return 1
  printf '%s\n' "$contents"
}

groundwork_yazi_restore_quarantine() { # quarantined target
  local quarantined="$1" target="$2"
  if [[ ! -e "$target" && ! -L "$target" ]]; then
    mv -- "$quarantined" "$target"
    rmdir "$(dirname "$quarantined")" 2>/dev/null || true
    return 0
  fi
  echo "Groundwork Yazi config: $target appeared during the transaction." >&2
  echo "The previous file remains quarantined at $quarantined; reconcile both paths manually." >&2
  return 1
}

groundwork_yazi_owned_hash() { # quarantined desired receipt
  local quarantined="$1" desired="$2" receipt="$3" actual desired_hash recorded
  [[ -f "$quarantined" && ! -L "$quarantined" ]] || return 1
  actual="$(groundwork_yazi_sha256 "$quarantined")" || return 1
  desired_hash="$(groundwork_yazi_sha256 "$desired")" || return 1
  [[ "$actual" == "$desired_hash" ]] && return 0
  [[ "$actual" == "$GROUNDWORK_YAZI_LEGACY_SHA256" ]] && return 0
  if recorded="$(groundwork_yazi_read_receipt "$receipt" 2>/dev/null)"; then
    [[ "$actual" == "$recorded" ]] && return 0
  fi
  return 1
}

groundwork_yazi_record() { # managed-target desired-source receipt
  local target="$1" desired="$2" receipt="$3" actual desired_hash state_dir temporary

  groundwork_yazi_require_plain_ancestor_chain "$target" || return 1
  groundwork_yazi_require_plain_ancestor_chain "$receipt" || return 1
  groundwork_yazi_require_plain_directories \
    "$(dirname "$(dirname "$target")")" \
    "$(dirname "$target")" || return 1
  [[ -f "$target" && ! -L "$target" ]] || {
    echo "Groundwork Yazi config: the applied target is missing, not regular, or a symlink: $target" >&2
    return 1
  }
  [[ -f "$desired" && ! -L "$desired" ]] || return 1
  actual="$(groundwork_yazi_sha256 "$target")" || return 1
  desired_hash="$(groundwork_yazi_sha256 "$desired")" || return 1
  [[ "$actual" == "$desired_hash" ]] || {
    echo "Groundwork Yazi config: apply completed without producing the exact managed file; ownership was not recorded." >&2
    return 1
  }

  state_dir="$(dirname "$receipt")"
  groundwork_yazi_require_plain_directories \
    "$(dirname "$(dirname "$state_dir")")" \
    "$(dirname "$state_dir")" \
    "$state_dir" || return 1
  [[ ! -L "$receipt" ]] || {
    echo "Groundwork Yazi config: ownership receipt is a symlink; refusing to replace it: $receipt" >&2
    return 1
  }
  [[ ! -e "$receipt" || -f "$receipt" ]] || {
    echo "Groundwork Yazi config: ownership receipt is not a regular file: $receipt" >&2
    return 1
  }
  mkdir -p "$state_dir"
  groundwork_yazi_require_plain_directories \
    "$(dirname "$(dirname "$state_dir")")" \
    "$(dirname "$state_dir")" \
    "$state_dir" || return 1
  temporary="$(mktemp "$state_dir/.yazi-config.XXXXXX")"
  chmod 600 "$temporary"
  printf 'sha256:%s\n' "$actual" >"$temporary"
  mv -f "$temporary" "$receipt"
}

groundwork_yazi_apply_owned() { # managed-target desired-source receipt
  local target="$1" desired="$2" receipt="$3"
  local config_dir state_dir target_dir quarantine_dir quarantined temporary desired_hash

  [[ -f "$desired" && ! -L "$desired" ]] || {
    echo "Groundwork Yazi config: managed source is missing or is a symlink: $desired" >&2
    return 1
  }
  desired_hash="$(groundwork_yazi_sha256 "$desired")" || return 1
  groundwork_yazi_hash_is_valid "$desired_hash" || return 1

  groundwork_yazi_require_plain_ancestor_chain "$target" || return 1
  groundwork_yazi_require_plain_ancestor_chain "$receipt" || return 1

  target_dir="$(dirname "$target")"
  config_dir="$(dirname "$target_dir")"
  state_dir="$(dirname "$receipt")"
  groundwork_yazi_require_plain_directories \
    "$config_dir" \
    "$target_dir" \
    "$(dirname "$(dirname "$state_dir")")" \
    "$(dirname "$state_dir")" \
    "$state_dir" || return 1
  [[ ! -L "$receipt" ]] || {
    echo "Groundwork Yazi config: ownership receipt is a symlink; refusing to replace it: $receipt" >&2
    return 1
  }
  [[ ! -e "$receipt" || -f "$receipt" ]] || {
    echo "Groundwork Yazi config: ownership receipt is not a regular file: $receipt" >&2
    return 1
  }
  mkdir -p "$target_dir"
  groundwork_yazi_require_plain_directories "$config_dir" "$target_dir" || return 1

  [[ ! -L "$target" ]] || {
    echo "Groundwork Yazi config: $target is a symlink; refusing to replace its destination." >&2
    return 1
  }
  if [[ -e "$target" && ! -f "$target" ]]; then
    echo "Groundwork Yazi config: $target exists but is not a regular file; refusing to replace it." >&2
    return 1
  fi

  quarantine_dir=""
  quarantined=""
  if [[ -e "$target" ]]; then
    quarantine_dir="$(mktemp -d "$target_dir/.groundwork-yazi-apply.XXXXXX")"
    quarantined="$quarantine_dir/yazi.toml"
    if ! mv -- "$target" "$quarantined"; then
      rmdir "$quarantine_dir" 2>/dev/null || true
      return 1
    fi
    if ! groundwork_yazi_owned_hash "$quarantined" "$desired" "$receipt"; then
      groundwork_yazi_restore_quarantine "$quarantined" "$target" || true
      echo "Groundwork Yazi config: an unowned or changed file blocks adoption at $target." >&2
      echo "Your file was left untouched. Merge its settings into the managed source, or move it aside and rerun chezmoi apply." >&2
      return 1
    fi
  fi

  temporary="$(mktemp "$target_dir/.yazi-config.XXXXXX")"
  chmod 644 "$temporary"
  cat "$desired" >"$temporary"
  if ! ln "$temporary" "$target"; then
    rm -f -- "$temporary"
    [[ -z "$quarantined" ]] || groundwork_yazi_restore_quarantine "$quarantined" "$target" || true
    echo "Groundwork Yazi config: $target appeared during apply; no file was overwritten." >&2
    return 1
  fi

  if ! groundwork_yazi_record "$target" "$desired" "$receipt"; then
    if [[ -f "$target" && ! -L "$target" && "$target" -ef "$temporary" ]]; then
      rm -f -- "$target"
    fi
    rm -f -- "$temporary"
    if [[ -n "$quarantined" ]]; then
      groundwork_yazi_restore_quarantine "$quarantined" "$target" || true
    fi
    echo "Groundwork Yazi config: ownership could not be recorded; the newly applied file was withdrawn." >&2
    if [[ -e "$target" && ! -L "$target" ]]; then
      echo "The previous owned file was restored at $target." >&2
    else
      echo "No target was left at $target." >&2
    fi
    return 1
  fi
  rm -f -- "$temporary"

  if [[ -n "$quarantined" ]]; then
    rm -f -- "$quarantined"
    rmdir "$quarantine_dir" 2>/dev/null || true
  fi
}

groundwork_yazi_remove_owned() { # managed-target receipt
  local target="$1" receipt="$2" actual recorded quarantine_dir quarantined

  groundwork_yazi_require_plain_ancestor_chain "$target" || return 1
  groundwork_yazi_require_plain_ancestor_chain "$receipt" || return 1
  groundwork_yazi_require_plain_directories \
    "$(dirname "$(dirname "$target")")" \
    "$(dirname "$target")" \
    "$(dirname "$(dirname "$(dirname "$receipt")")")" \
    "$(dirname "$(dirname "$receipt")")" \
    "$(dirname "$receipt")" || return 1
  [[ ! -L "$target" && -f "$target" ]] || {
    echo "Groundwork Yazi config: no removable Groundwork-owned regular file exists at $target." >&2
    return 1
  }
  recorded="$(groundwork_yazi_read_receipt "$receipt")" || {
    echo "Groundwork Yazi config: no valid ownership receipt exists; refusing to remove $target." >&2
    return 1
  }

  quarantine_dir="$(mktemp -d "$(dirname "$target")/.groundwork-yazi-remove.XXXXXX")"
  quarantined="$quarantine_dir/yazi.toml"
  if ! mv -- "$target" "$quarantined"; then
    rmdir "$quarantine_dir" 2>/dev/null || true
    return 1
  fi
  if [[ -L "$quarantined" || ! -f "$quarantined" ]]; then
    groundwork_yazi_restore_quarantine "$quarantined" "$target" || true
    echo "Groundwork Yazi config: the quarantined target is not a regular file; refusing removal." >&2
    return 1
  fi
  actual="$(groundwork_yazi_sha256 "$quarantined")" || {
    groundwork_yazi_restore_quarantine "$quarantined" "$target" || true
    return 1
  }
  if [[ "$actual" != "$recorded" ]]; then
    groundwork_yazi_restore_quarantine "$quarantined" "$target" || true
    echo "Groundwork Yazi config: $target has user changes; refusing to remove it." >&2
    echo "The file and ownership receipt are unchanged. Reconcile it manually or reapply Groundwork first." >&2
    return 1
  fi

  rm -f -- "$quarantined"
  rmdir "$quarantine_dir" 2>/dev/null || true
  rm -f -- "$receipt"
  rmdir "$(dirname "$target")" 2>/dev/null || true
}
