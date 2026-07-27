#!/usr/bin/env bash
# Converge the Node/pnpm ownership model: mise owns Node, Corepack owns pnpm.
#
# Runs on EVERY apply rather than on-change, deliberately. A run_onchange script
# keyed to the mise config text would not rerun when `node = "lts"` silently
# advances to a new Node major — and a new Node install is exactly when Corepack
# needs enabling again (and, from Node 25, installing at all).
#
# Apply-time network dependency: when Corepack is absent this installs the pinned
# version, so an offline apply leaves pnpm untouched and says so rather than
# half-migrating.
#
# TRANSACTIONAL, and only as far as it can honestly claim: the previously-working
# pnpm is removed only after the replacement is proven through a BARE `pnpm` on a
# prospective PATH — not by executing a known absolute path, which would prove
# nothing about the resolution failure this exists to fix.
#
# Scope, stated exactly: this removes EVERY mise-managed pnpm version, because
# mise records no provenance and Groundwork cannot tell the ones it installed
# (via the former `pnpm = "latest"`) from ones you installed yourself. They are
# removable cache — `mise install pnpm@<version>` restores any of them — but the
# claim is "all mise-managed pnpm", not "only Groundwork's". pnpm from Homebrew,
# npm -g, Volta, or a hand-rolled install is reported, never touched.
set -euo pipefail

command -v mise >/dev/null 2>&1 || exit 0

note() { printf 'Groundwork: %s\n' "$1"; }
warn() { printf 'Groundwork: %s\n' "$1" >&2; }

# ── Pins: PARSED, never sourced ───────────────────────────────────────────────
# The file lives in $HOME and is user-editable; `.` would execute whatever is in
# it on every apply, turning a data file into an extension point for no reason.
# Only these two keys are read, and only in their expected shapes.
pins="$HOME/.local/share/groundwork/node-toolchain.env"
read_pin() {
  local key="$1" pattern="$2"
  [ -r "$pins" ] || return 0
  local value
  value="$(sed -n "s/^${key}=\\([^#]*\\).*/\\1/p" "$pins" | tail -n1 | tr -d '"'\''[:space:]')"
  printf '%s' "$value" | grep -qE "$pattern" || return 0
  printf '%s' "$value"
}
COREPACK_VERSION="$(read_pin GROUNDWORK_COREPACK_VERSION '^[0-9]+\.[0-9]+\.[0-9]+$')"
UNBUNDLED_MAJOR="$(read_pin GROUNDWORK_COREPACK_UNBUNDLED_FROM_NODE_MAJOR '^[0-9]+$')"
UNBUNDLED_MAJOR="${UNBUNDLED_MAJOR:-25}"

# ── The ACTIVE managed Node is the only shim destination we accept ────────────
# `command -v corepack` could resolve Homebrew's or another Node's Corepack, and
# a bare `corepack enable` writes shims beside THAT installation.
node_bin="$(mise which node 2>/dev/null || true)"
if [ -z "$node_bin" ] || [ ! -x "$node_bin" ]; then
  note "mise has no active Node yet — skipping pnpm/Corepack setup (rerun after 'mise install')."
  exit 0
fi
node_dir="$(cd "$(dirname "$node_bin")" && pwd)"
node_version="$("$node_bin" --version 2>/dev/null || echo unknown)"
node_major="${node_version#v}"
node_major="${node_major%%.*}"

mise_pnpm_installed="$(mise ls --installed pnpm 2>/dev/null | awk '{print $2}' | tr '\n' ' ' || true)"

# Converged means BOTH halves are true: Corepack owns pnpm AND no mise pnpm is
# left to shadow it. Checking only for the shim would call a machine converged
# while `mise/installs/pnpm/latest` still wins PATH — the exact bug being fixed.
if [ -x "$node_dir/pnpm" ] && [ -z "${mise_pnpm_installed// /}" ]; then
  exit 0
fi

# ── 1. Locate or install Corepack, PINNED, beside the active Node ─────────────
corepack_bin="$node_dir/corepack"
if [ ! -x "$corepack_bin" ]; then
  if [ -z "$COREPACK_VERSION" ]; then
    warn "Groundwork's Corepack version pin is missing or malformed ($pins);"
    warn "refusing to install an unpinned Corepack. pnpm is unchanged."
    exit 1
  fi
  if [ -n "$node_major" ] && [ "$node_major" -ge "$UNBUNDLED_MAJOR" ] 2>/dev/null; then
    note "Node $node_major does not bundle Corepack; installing pinned corepack@$COREPACK_VERSION."
  else
    note "Corepack missing from Node $node_major; installing pinned corepack@$COREPACK_VERSION."
  fi
  if [ ! -x "$node_dir/npm" ]; then
    warn "no npm beside the active Node — cannot install Corepack. pnpm is unchanged."
    exit 0
  fi
  if ! "$node_dir/npm" install -g "corepack@$COREPACK_VERSION" >/dev/null 2>&1; then
    warn "could not install corepack@$COREPACK_VERSION (offline?). pnpm is unchanged; rerun 'chezmoi apply' when online."
    exit 0
  fi
fi
[ -x "$corepack_bin" ] || {
  warn "Corepack still not present beside the active Node; leaving pnpm untouched."
  exit 0
}

# ── 1b. Never overwrite a pnpm somebody else put there ───────────────────────
# `corepack enable --install-directory` writes its proxy into that directory. If
# the user ran `npm install -g pnpm` under this Node, that file is theirs, and
# this script's whole promise is that it does not remove tools the user chose.
if [ -e "$node_dir/pnpm" ]; then
  existing_target="$node_dir/pnpm"
  [ -L "$existing_target" ] && existing_target="$(readlink -f "$node_dir/pnpm" 2>/dev/null || printf '%s' "$node_dir/pnpm")"
  case "$existing_target" in
    *corepack*) ;; # already ours to manage
    *)
      warn "a non-Corepack pnpm already exists at $node_dir/pnpm — it was not installed by Groundwork."
      warn "Leaving it alone. Remove it yourself if you want Corepack to own pnpm, then rerun 'chezmoi apply'."
      exit 0
      ;;
  esac
fi

# ── 2. Enable the pnpm shim INTO the active Node's bin, explicitly ────────────
if ! COREPACK_ENABLE_DOWNLOAD_PROMPT=0 "$corepack_bin" enable pnpm --install-directory "$node_dir" >/dev/null 2>&1; then
  warn "corepack enable pnpm failed (permissions on $node_dir?). pnpm is unchanged."
  exit 1
fi
if [ ! -x "$node_dir/pnpm" ]; then
  warn "Corepack reported success but no pnpm shim exists in $node_dir. pnpm is unchanged."
  exit 1
fi

# ── 3. Prove BARE `pnpm` on the prospective PATH before removing anything ─────
# The regression was PATH re-resolution, so the proof has to be a bare command on
# the PATH the user will actually have — not "$node_dir/pnpm", which only proves
# a file at a known path runs.
prospective_path="$(
  printf '%s' "$PATH" | tr ':' '\n' \
    | awk '!/\/mise\/installs\/pnpm\// && length' \
    | paste -sd: -
)"
prospective_path="$node_dir:$prospective_path"
if ! PATH="$prospective_path" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --version >/dev/null 2>&1; then
  warn "bare 'pnpm' does not resolve to the Corepack shim on the prospective PATH."
  warn "Nothing was removed. Diagnose with: groundwork-doctor --node-toolchain"
  exit 1
fi

# ── 4. Only now remove the mise-managed pnpm (ALL versions — see the note above)
removed=0
if [ -n "${mise_pnpm_installed// /}" ]; then
  if mise uninstall --all pnpm >/dev/null 2>&1; then
    removed=1
    mise reshim >/dev/null 2>&1 || true
  else
    note "could not remove the mise-managed pnpm; Corepack is enabled but the old install still shadows it."
    note "remove it yourself: mise uninstall --all pnpm && mise reshim"
  fi
fi

# ── 5. Re-prove with a bare command; recover honestly if it broke ─────────────
if [ "$removed" -eq 1 ] && ! COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --version >/dev/null 2>&1; then
  warn "bare 'pnpm' stopped resolving after removing the mise install — restoring it."
  restored=""
  for version in $mise_pnpm_installed; do
    if mise install "pnpm@$version" >/dev/null 2>&1; then restored="$version"; fi
  done
  # Reinstalling FILES is not enough: mise must also SELECT one, or bare `pnpm`
  # stays missing. A working pnpm beats a clean config diff on an error path, so
  # this re-selects and reports the resulting drift rather than leaving the user
  # with no package manager.
  if [ -n "$restored" ] && mise use -g "pnpm@$restored" >/dev/null 2>&1; then
    mise reshim >/dev/null 2>&1 || true
    warn "Restored mise pnpm@$restored and re-selected it globally."
    warn "This deliberately re-adds pnpm to your mise config, so 'chezmoi diff' will"
    warn "show drift against the managed config until this is resolved."
  else
    mise reshim >/dev/null 2>&1 || true
    warn "Could not restore a working pnpm automatically. Recover with:"
    warn "  mise use -g pnpm@latest"
  fi
  warn "Then report this: groundwork-doctor --node-toolchain"
  exit 1
fi

if [ "$removed" -eq 1 ]; then
  note "pnpm now comes from Corepack and follows each repository's packageManager pin."
  note "Its version is per-repository, so it will differ between projects by design."
  note "Existing shells keep the old PATH. Open a new shell (or a new tmux pane);"
  note "in a current shell, 'hash -r' clears the command cache."
  note "Verify any time with: groundwork-doctor --node-toolchain"
fi
