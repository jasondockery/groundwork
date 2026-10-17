# shellcheck shell=bash
# Read-only PATH-shadowing facts for Groundwork-managed CLIs.
#
# Vendor installers (OpenCode, Bun, Claude's local CLI, rustup, Deno, npm -g,
# nvm) drop a directory at the front of PATH. That copy wins even when its
# version matches Homebrew or mise today, and the two drift on the next
# update of either. This library only observes: it never deletes a binary,
# never edits a shell file, and never removes config or session data.
#
# Usage: source .../lib/path-shadow.sh; gw_path_shadow_scan
# Prints TSV rows (always exits 0):
#   shadowed<TAB>cmd<TAB>winning<TAB>managed<TAB>win_ver<TAB>managed_ver<TAB>owner<TAB>file<TAB>line<TAB>kind
#   managed-drift<TAB>file<TAB>line<TAB>text
#   unmanaged-path<TAB>file<TAB>line<TAB>text
#   missing<TAB>cmd<TAB>managed<TAB>owner
#
# Test seams: GROUNDWORK_BREW_PREFIX, GROUNDWORK_BREWFILE, GROUNDWORK_CHEZMOI,
# HOME, PATH.

gw_path_shadow_canonical() {
  local target="$1" depth=0 link
  [[ -n "$target" ]] || return 1
  if command -v realpath >/dev/null 2>&1; then
    realpath "$target" 2>/dev/null && return 0
  fi
  while [[ -L "$target" ]]; do
    depth=$((depth + 1))
    if ((depth > 40)); then
      return 1
    fi
    link="$(readlink "$target")" || break
    [[ "$link" == /* ]] || link="$(dirname "$target")/$link"
    target="$link"
  done
  if [[ -d "$target" ]]; then
    (cd "$target" 2>/dev/null && pwd -P)
  elif [[ -e "$target" ]]; then
    printf '%s/%s\n' "$(cd "$(dirname "$target")" 2>/dev/null && pwd -P)" "$(basename "$target")"
  else
    printf '%s\n' "$target"
  fi
}

gw_path_shadow_brew_prefix() {
  if [[ -n "${GROUNDWORK_BREW_PREFIX:-}" ]]; then
    printf '%s\n' "$GROUNDWORK_BREW_PREFIX"
    return 0
  fi
  local brew prefix
  brew="$(command -v brew 2>/dev/null || true)"
  if [[ -n "$brew" ]]; then
    prefix="$("$brew" --prefix 2>/dev/null || true)"
    if [[ -n "$prefix" ]]; then
      printf '%s\n' "$prefix"
      return 0
    fi
  fi
  local candidate
  for candidate in /opt/homebrew /home/linuxbrew/.linuxbrew /usr/local; do
    if [[ -x "$candidate/bin/brew" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

gw_path_shadow_brewfile() {
  printf '%s\n' "${GROUNDWORK_BREWFILE:-$HOME/.config/homebrew/Brewfile}"
}

# Formula/cask tokens named in the applied Brewfile (basename after a tap).
gw_path_shadow_brewfile_tokens() {
  local file
  file="$(gw_path_shadow_brewfile)"
  [[ -r "$file" ]] || return 0
  awk '
    /^[[:space:]]*#/ { next }
    /^[[:space:]]*(brew|cask)[[:space:]]+"/ {
      line = $0
      sub(/^[[:space:]]*(brew|cask)[[:space:]]+"/, "", line)
      sub(/".*/, "", line)
      n = split(line, parts, "/")
      if (n >= 1 && parts[n] != "") print parts[n]
    }
  ' "$file"
}

# Known vendor directories that curl|bash installers prepend to PATH.
# rustup's ~/.cargo/bin is included because cargo-installed binaries share
# names with Homebrew tools; rustup itself is the Groundwork-managed owner
# of cargo/rustc when the rustup formula is present.
gw_path_shadow_vendor_dirs() {
  printf '%s\n' \
    "$HOME/.opencode/bin" \
    "$HOME/.bun/bin" \
    "$HOME/.claude/local" \
    "$HOME/.claude/local/bin" \
    "$HOME/.codex" \
    "$HOME/.codex/bin" \
    "$HOME/.cargo/bin" \
    "$HOME/.deno/bin" \
    "$HOME/.npm-global/bin" \
    "$HOME/.nvm" \
    "$HOME/.fnm" \
    "$HOME/.volta/bin" \
    "$HOME/.asdf/shims" \
    "$HOME/go/bin" \
    "$HOME/.yarn/bin"
}

gw_path_shadow_vendor_line_pattern() {
  printf '%s\n' \
    '\.opencode/bin|\.bun/bin|\.claude/local|\.codex/bin|[.]codex["'\'':]|\.cargo/bin|\.cargo/env|\.deno/bin|\.npm-global/bin|\.nvm|\.fnm|\.volta/bin|\.asdf/shims|/go/bin|\.yarn/bin'
}

gw_path_shadow_is_path_line() {
  local line="$1" code
  code="${line%%#*}"
  [[ "$code" =~ PATH|path\+|path=|\.cargo/env ]]
}

gw_path_shadow_is_vendor_path_line() {
  local line="$1" pattern
  gw_path_shadow_is_path_line "$line" || return 1
  pattern="$(gw_path_shadow_vendor_line_pattern)"
  echo "$line" | grep -Eq -- "$pattern"
}

gw_path_shadow_first_hit() {
  local name="$1" dir
  local IFS=':'
  # shellcheck disable=SC2086
  set -- ${PATH-}
  for dir in "$@"; do
    [[ -n "$dir" ]] || continue
    if [[ -x "$dir/$name" && ! -d "$dir/$name" ]]; then
      printf '%s\n' "$dir/$name"
      return 0
    fi
  done
  return 1
}

# First line of --version, or "unavailable". Never lets a hanging binary stall
# the doctor: perl alarm is present on every supported platform.
gw_path_shadow_version() {
  local bin="$1" out
  if [[ ! -f "$bin" || ! -x "$bin" ]]; then
    printf 'unavailable\n'
    return 0
  fi
  out="$(
    perl -e 'alarm 2; exec @ARGV' "$bin" --version 2>/dev/null \
      | head -n 1 \
      | tr -d '\r'
  )" || true
  out="${out#"${out%%[![:space:]]*}"}"
  out="${out%"${out##*[![:space:]]}"}"
  if [[ -z "$out" ]]; then
    printf 'unavailable\n'
    return 0
  fi
  printf '%s\n' "$out"
}

gw_path_shadow_token_from_path() {
  local resolved="$1"
  case "$resolved" in
    */Cellar/*)
      resolved="${resolved#*/Cellar/}"
      printf '%s\n' "${resolved%%/*}"
      ;;
    */Caskroom/*)
      resolved="${resolved#*/Caskroom/}"
      printf '%s\n' "${resolved%%/*}"
      ;;
    */opt/*)
      resolved="${resolved#*/opt/}"
      printf '%s\n' "${resolved%%/*}"
      ;;
    *)
      return 1
      ;;
  esac
}

# TSV: command, managed_path, owner (homebrew|mise)
gw_path_shadow_managed_clis() {
  local prefix token name path resolved seen=$'\n' cmd
  if prefix="$(gw_path_shadow_brew_prefix)"; then
    local tokens=$'\n'
    while IFS= read -r token; do
      [[ -n "$token" ]] || continue
      tokens="$tokens$token"$'\n'
    done < <(gw_path_shadow_brewfile_tokens)

    local bindir
    for bindir in "$prefix/bin" "$prefix/sbin"; do
      [[ -d "$bindir" ]] || continue
      for path in "$bindir"/*; do
        [[ -e "$path" || -L "$path" ]] || continue
        [[ -x "$path" && ! -d "$path" ]] || continue
        name="$(basename "$path")"
        case "$seen" in *$'\n'"$name"$'\n'*) continue ;; esac
        resolved="$(gw_path_shadow_canonical "$path" 2>/dev/null || printf '%s' "$path")"
        token="$(gw_path_shadow_token_from_path "$resolved" || true)"
        [[ -n "$token" ]] || continue
        case "$tokens" in *$'\n'"$token"$'\n'*) ;; *) continue ;; esac
        seen="$seen$name"$'\n'
        printf '%s\t%s\t%s\n' "$name" "$path" "homebrew"
      done
    done
  fi

  if command -v mise >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
    local tools_json tool
    tools_json="$(mise ls --current --json 2>/dev/null || true)"
    if [[ -n "$tools_json" ]]; then
      while IFS= read -r tool; do
        [[ -n "$tool" ]] || continue
        case "$tool" in
          npm:* | pipx:* | ubi:* | aqua:* | cargo:* | go:* | npm) continue ;;
        esac
        cmd="$tool"
        case "$tool" in
          python) cmd="python3" ;;
        esac
        path="$(mise which "$cmd" 2>/dev/null || mise which "$tool" 2>/dev/null || true)"
        [[ -n "$path" && -x "$path" ]] || continue
        name="$(basename "$path")"
        case "$seen" in *$'\n'"$name"$'\n'*) continue ;; esac
        seen="$seen$name"$'\n'
        printf '%s\t%s\t%s\n' "$name" "$path" "mise"
        if [[ "$tool" == "python" ]]; then
          local python_alias
          python_alias="$(mise which python 2>/dev/null || true)"
          if [[ -n "$python_alias" && -x "$python_alias" ]]; then
            name="$(basename "$python_alias")"
            case "$seen" in *$'\n'"$name"$'\n'*) ;; *)
              seen="$seen$name"$'\n'
              printf '%s\t%s\t%s\n' "$name" "$python_alias" "mise"
              ;;
            esac
          fi
        fi
      done < <(printf '%s' "$tools_json" | jq -r 'keys[]' 2>/dev/null || true)
    fi
  fi
  return 0
}

gw_path_shadow_same_command() {
  local winning="$1" managed="$2" name="$3"
  local win_real managed_real resolved
  win_real="$(gw_path_shadow_canonical "$winning" 2>/dev/null || printf '%s' "$winning")"
  managed_real="$(gw_path_shadow_canonical "$managed" 2>/dev/null || printf '%s' "$managed")"
  [[ "$win_real" == "$managed_real" ]] && return 0
  case "$winning" in
    */mise/shims/*)
      resolved="$(mise which "$name" 2>/dev/null || true)"
      [[ -n "$resolved" ]] || return 1
      resolved="$(gw_path_shadow_canonical "$resolved" 2>/dev/null || printf '%s' "$resolved")"
      [[ "$resolved" == "$managed_real" ]] && return 0
      ;;
  esac
  return 1
}

gw_path_shadow_desired() {
  local dest="$1" chezmoi
  chezmoi="${GROUNDWORK_CHEZMOI:-}"
  if [[ -z "$chezmoi" ]] && command -v chezmoi >/dev/null 2>&1; then
    chezmoi="chezmoi"
  fi
  [[ -n "$chezmoi" ]] || return 1
  "$chezmoi" cat -- "$dest" 2>/dev/null
}

gw_path_shadow_line_in_text() {
  local needle="$1" text="$2"
  printf '%s\n' "$text" | grep -Fxq -- "$needle"
}

# TSV: kind, file, line, text — kind is managed-drift or unmanaged-path
gw_path_shadow_shell_path_lines() {
  local dest desired line number code
  local managed_files="$HOME/.zshrc"$'\n'"$HOME/.zprofile"
  local unmanaged_files="$HOME/.zshrc.local"$'\n'"$HOME/.zprofile.local"$'\n'"$HOME/.zshenv"$'\n'"$HOME/.bashrc"$'\n'"$HOME/.profile"

  while IFS= read -r dest; do
    [[ -n "$dest" && -r "$dest" ]] || continue
    desired=""
    if ! desired="$(gw_path_shadow_desired "$dest")"; then
      desired=""
    fi
    number=0
    while IFS= read -r line || [[ -n "$line" ]]; do
      number=$((number + 1))
      gw_path_shadow_is_vendor_path_line "$line" || continue
      code="$line"
      if [[ -n "$desired" ]] && gw_path_shadow_line_in_text "$line" "$desired"; then
        continue
      fi
      printf '%s\t%s\t%s\t%s\n' "managed-drift" "$dest" "$number" "$line"
    done <"$dest"
  done <<<"$managed_files"

  while IFS= read -r dest; do
    [[ -n "$dest" && -r "$dest" ]] || continue
    number=0
    while IFS= read -r line || [[ -n "$line" ]]; do
      number=$((number + 1))
      gw_path_shadow_is_vendor_path_line "$line" || continue
      printf '%s\t%s\t%s\t%s\n' "unmanaged-path" "$dest" "$number" "$line"
    done <"$dest"
  done <<<"$unmanaged_files"
  return 0
}

gw_path_shadow_dir_mentioned_in_line() {
  local dir="$1" line="$2" rel
  rel="${dir#"$HOME"/}"
  case "$line" in
    *"$dir"* | *"\$HOME/$rel"* | *"\$HOME/$rel:"* | *"~/$rel"*) return 0 ;;
  esac
  echo "$line" | grep -Fq -- "$rel"
}

# Pick the shell line most likely responsible for a winning path.
# Prints: file<TAB>line<TAB>kind  or empty.
gw_path_shadow_responsible_line() {
  local winning="$1" shell_rows="$2" vendor dir file line kind
  winning="$(gw_path_shadow_canonical "$winning" 2>/dev/null || printf '%s' "$winning")"
  dir="$(dirname "$winning")"
  vendor=""
  while IFS= read -r vendor; do
    [[ -n "$vendor" ]] || continue
    vendor="$(gw_path_shadow_canonical "$vendor" 2>/dev/null || printf '%s' "$vendor")"
    case "$winning" in
      "$vendor" | "$vendor"/*) break ;;
    esac
    vendor=""
  done < <(gw_path_shadow_vendor_dirs)

  local match_file="" match_line="" match_kind=""
  while IFS=$'\t' read -r kind file line _; do
    [[ -n "$kind" ]] || continue
    if [[ -n "$vendor" ]] && gw_path_shadow_dir_mentioned_in_line "$vendor" "$(sed -n "${line}p" "$file" 2>/dev/null || true)"; then
      match_file="$file"
      match_line="$line"
      match_kind="$kind"
      # Prefer managed-file drift: chezmoi apply will revert it.
      [[ "$kind" == "managed-drift" ]] && break
    elif gw_path_shadow_dir_mentioned_in_line "$dir" "$(sed -n "${line}p" "$file" 2>/dev/null || true)"; then
      match_file="$file"
      match_line="$line"
      match_kind="$kind"
      [[ "$kind" == "managed-drift" ]] && break
    fi
  done <<<"$shell_rows"
  if [[ -n "$match_file" ]]; then
    printf '%s\t%s\t%s\n' "$match_file" "$match_line" "$match_kind"
  fi
}

gw_path_shadow_scan() {
  local shell_rows managed_rows name managed_path owner winning win_real
  local win_ver managed_ver responsible file line kind

  shell_rows="$(gw_path_shadow_shell_path_lines || true)"
  managed_rows="$(gw_path_shadow_managed_clis || true)"

  if [[ -n "$shell_rows" ]]; then
    printf '%s\n' "$shell_rows"
  fi

  while IFS=$'\t' read -r name managed_path owner; do
    [[ -n "$name" && -n "$managed_path" ]] || continue
    winning="$(gw_path_shadow_first_hit "$name" || true)"
    if [[ -z "$winning" ]]; then
      printf '%s\t%s\t%s\t%s\n' "missing" "$name" "$managed_path" "$owner"
      continue
    fi
    if gw_path_shadow_same_command "$winning" "$managed_path" "$name"; then
      continue
    fi
    win_ver="$(gw_path_shadow_version "$winning")"
    managed_ver="$(gw_path_shadow_version "$managed_path")"
    responsible="$(gw_path_shadow_responsible_line "$winning" "$shell_rows" || true)"
    file=""
    line=""
    kind=""
    if [[ -n "$responsible" ]]; then
      IFS=$'\t' read -r file line kind <<<"$responsible"
    fi
    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
      "shadowed" "$name" "$winning" "$managed_path" \
      "$win_ver" "$managed_ver" "$owner" "$file" "$line" "$kind"
  done <<<"$managed_rows"
  return 0
}

gw_path_shadow_has_findings() {
  local rows
  rows="$(gw_path_shadow_scan || true)"
  [[ -n "$rows" ]]
}

gw_path_shadow_legacy_config_note() {
  case "$1" in
    opencode)
      printf '%s\n' "The older Go-era binary read ~/.opencode.json; current OpenCode uses ~/.config/opencode/. Those files do not collide, so old settings are still on disk."
      ;;
  esac
}
