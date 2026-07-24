# shellcheck shell=bash
# shellcheck disable=SC2034  # The GW_* state variables below are this library's public API: it SETS them for scripts that source it (groundwork-doctor, groundwork-shell-adopt) to read. They are not unused locals.
# Groundwork shell-runtime probe — READ-ONLY fact gathering, shared by
# groundwork-shell-adopt, groundwork-doctor, and the one-time adoption notice.
#
# It exists because those three had each grown their own copy of "what is the
# login shell / is this zsh really Homebrew's", and the copies drifted into real
# defects: one executed the candidate binary before proving it was trustworthy,
# another consumed its state before checking ownership at all. Facts belong in
# one place; only groundwork-shell-adopt mutates anything.
#
# It NEVER executes the candidate zsh. Running an unverified binary to ask its
# version is exactly what a replaced binary wants — ownership is proven from
# Homebrew's metadata and the filesystem, and only a caller that sees
# GW_OWNERSHIP=owned may run it.
#
# Usage:  source .../lib/shell-runtime.sh; gw_shell_probe
# Sets:
#   GW_LOGIN_SHELL     account record ("" when unreadable)
#   GW_LOGIN_STATE     ok | unreadable
#   GW_SESSION_SHELL   $SHELL, an inherited value — never proof of anything
#   GW_PARENT_EXE      invoking process executable ("" when unknown)
#   GW_PARENT_STATE    path | name-only | unknown
#   GW_BREW_PREFIX     "" when Homebrew is missing/broken
#   GW_BREW_STATE      ok | missing | broken
#   GW_MANAGED_ZSH     the stable path Groundwork would adopt ("" without brew)
#   GW_FORMULA_ROOT    brew --prefix zsh, canonicalized
#   GW_RESOLVED_ZSH    canonical target of GW_MANAGED_ZSH
#   GW_OWNERSHIP       owned | unowned | absent | unknown
#   GW_SHELLS_FILE     the shells file consulted
#   GW_SHELLS_STATE    registered | not-registered | unreadable
#   GW_PREV_SHELL      recorded pre-Groundwork login shell ("" when none)
#   GW_PREV_STATE      recorded | missing-binary | none

gw_canonical_path() {
  # Canonicalize without depending on realpath: symlinks, `//`, and
  # /var-vs-/private/var must all normalize, or containment tests compare two
  # spellings of the same directory and wrongly say "no". On Linux this is what
  # makes /proc/PID/exe (the real Cellar binary) comparable to Homebrew's
  # stable symlink.
  local target="$1"
  [[ -n "$target" ]] || return 1
  if command -v realpath >/dev/null 2>&1; then
    realpath "$target" 2>/dev/null && return 0
  fi
  # Bounded: a cyclic symlink would otherwise spin forever — and a damaged or
  # replaced managed path is precisely what this probe exists to inspect, so a
  # malformed link is inside its error model, not outside it.
  local depth=0
  while [[ -L "$target" ]]; do
    depth=$((depth + 1))
    if ((depth > 40)); then
      return 1
    fi
    local link
    link="$(readlink "$target")" || break
    [[ "$link" == /* ]] || link="$(dirname "$target")/$link"
    target="$link"
  done
  if [[ -d "$target" ]]; then
    (cd "$target" 2>/dev/null && pwd -P)
  else
    printf '%s/%s\n' "$(cd "$(dirname "$target")" 2>/dev/null && pwd -P)" "$(basename "$target")"
  fi
}

gw_shell_probe() {
  GW_SHELLS_FILE="${GROUNDWORK_SHELLS_FILE:-/etc/shells}"
  local state_dir="${GROUNDWORK_STATE_DIR:-$HOME/.local/state/groundwork}"
  local previous_file="$state_dir/previous-login-shell"

  # --- account record (authoritative; $SHELL is not) ---
  # Every probe is fail-soft: a directory-service hiccup under `set -e` would
  # otherwise kill the diagnostics that exist for exactly that moment.
  GW_LOGIN_SHELL=""
  # Test seam. Without it, a fixture can only shim `dscl`/`getent` as binaries —
  # and if one of those returns empty, the probe falls through to the REAL next
  # source (getent, then /etc/passwd) and reads the actual machine account. That
  # is how a Linux CI run adopted against the runner's real login shell while the
  # same test passed on a Mac (no getent). One seam, honored first, ends it.
  if [[ -n "${GROUNDWORK_LOGIN_SHELL_FILE:-}" ]]; then
    if [[ -r "$GROUNDWORK_LOGIN_SHELL_FILE" ]]; then
      GW_LOGIN_SHELL="$(head -n 1 "$GROUNDWORK_LOGIN_SHELL_FILE" 2>/dev/null || true)"
    fi
    GW_LOGIN_STATE="ok"
    [[ -n "$GW_LOGIN_SHELL" ]] || GW_LOGIN_STATE="unreadable"
    GW_SESSION_SHELL="${SHELL:-}"
    gw_shell_probe_rest
    return 0
  fi
  if command -v dscl >/dev/null 2>&1; then
    GW_LOGIN_SHELL="$(dscl . -read "/Users/$USER" UserShell 2>/dev/null | awk '{print $2}' || true)"
  fi
  if [[ -z "$GW_LOGIN_SHELL" ]] && command -v getent >/dev/null 2>&1; then
    GW_LOGIN_SHELL="$(getent passwd "$USER" 2>/dev/null | cut -d: -f7 || true)"
  fi
  if [[ -z "$GW_LOGIN_SHELL" && -r /etc/passwd ]]; then
    GW_LOGIN_SHELL="$(awk -F: -v u="$USER" '$1 == u {print $7}' /etc/passwd 2>/dev/null || true)"
  fi
  GW_LOGIN_STATE="ok"
  [[ -n "$GW_LOGIN_SHELL" ]] || GW_LOGIN_STATE="unreadable"

  GW_SESSION_SHELL="${SHELL:-}"
  gw_shell_probe_rest
}

# Everything after the account record — factored out so the test seam above can
# reuse it verbatim instead of duplicating the ownership logic.
gw_shell_probe_rest() {
  # --- the process that actually invoked us ($SHELL cannot answer this) ---
  GW_PARENT_EXE=""
  GW_PARENT_STATE="unknown"
  if [[ -r "/proc/$PPID/exe" ]]; then
    GW_PARENT_EXE="$(readlink -f "/proc/$PPID/exe" 2>/dev/null || true)"
  fi
  if [[ -n "$GW_PARENT_EXE" ]]; then
    GW_PARENT_STATE="path"
  else
    GW_PARENT_EXE="$(ps -o comm= -p "$PPID" 2>/dev/null | sed 's/^-//' || true)"
    [[ -n "$GW_PARENT_EXE" ]] && GW_PARENT_STATE="name-only"
    [[ "$GW_PARENT_EXE" == /* ]] && GW_PARENT_STATE="path"
  fi

  # --- Homebrew, the managed path, and OWNERSHIP ---
  GW_BREW_PREFIX=""
  GW_MANAGED_ZSH=""
  GW_FORMULA_ROOT=""
  GW_RESOLVED_ZSH=""
  GW_OWNERSHIP="unknown"
  if ! command -v brew >/dev/null 2>&1; then
    GW_BREW_STATE="missing"
  elif ! GW_BREW_PREFIX="$(brew --prefix 2>/dev/null)" || [[ -z "$GW_BREW_PREFIX" ]]; then
    GW_BREW_PREFIX=""
    GW_BREW_STATE="broken"
  else
    GW_BREW_STATE="ok"
    GW_MANAGED_ZSH="$GW_BREW_PREFIX/bin/zsh"
    if [[ ! -f "$GW_MANAGED_ZSH" || ! -x "$GW_MANAGED_ZSH" ]]; then
      GW_OWNERSHIP="absent"
    else
      # "Formula installed AND something executable sits at the stable path" is
      # not ownership — a replaced binary passes that pair. Require the stable
      # path to RESOLVE INTO Homebrew's zsh formula.
      GW_OWNERSHIP="unowned"
      if brew list --versions zsh >/dev/null 2>&1; then
        GW_FORMULA_ROOT="$(brew --prefix zsh 2>/dev/null || true)"
        GW_FORMULA_ROOT="$(gw_canonical_path "$GW_FORMULA_ROOT" 2>/dev/null || true)"
        GW_RESOLVED_ZSH="$(gw_canonical_path "$GW_MANAGED_ZSH" 2>/dev/null || true)"
        if [[ -n "$GW_FORMULA_ROOT" && "$GW_RESOLVED_ZSH" == "$GW_FORMULA_ROOT/"* ]]; then
          GW_OWNERSHIP="owned"
        fi
      fi
    fi
  fi

  # --- /etc/shells registration (unreadable is NOT the same as absent) ---
  if [[ ! -r "$GW_SHELLS_FILE" ]]; then
    GW_SHELLS_STATE="unreadable"
  elif [[ -n "$GW_MANAGED_ZSH" ]] && grep -Fxq "$GW_MANAGED_ZSH" "$GW_SHELLS_FILE"; then
    GW_SHELLS_STATE="registered"
  else
    GW_SHELLS_STATE="not-registered"
  fi

  # --- the recorded rollback path ---
  GW_PREV_SHELL=""
  GW_PREV_STATE="none"
  if [[ -r "$previous_file" ]]; then
    GW_PREV_SHELL="$(head -n 1 "$previous_file" 2>/dev/null || true)"
    if [[ -n "$GW_PREV_SHELL" && "$GW_PREV_SHELL" == /* ]]; then
      if [[ -f "$GW_PREV_SHELL" && -x "$GW_PREV_SHELL" ]]; then
        GW_PREV_STATE="recorded"
      else
        GW_PREV_STATE="missing-binary"
      fi
    else
      GW_PREV_SHELL=""
    fi
  fi
}

# The ONLY sanctioned way to run the candidate: proven-owned binaries only.
gw_managed_zsh_version() {
  # Run the RESOLVED path that ownership was proven against, not the stable
  # symlink — that symlink could be swapped between the check and the call.
  [[ "${GW_OWNERSHIP:-}" == "owned" && -n "${GW_RESOLVED_ZSH:-}" ]] || return 1
  "$GW_RESOLVED_ZSH" --version 2>/dev/null | awk '{print $2}'
}
