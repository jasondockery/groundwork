#!/usr/bin/env bash
set -euo pipefail

repo_owner="${GROUNDWORK_REPO_OWNER:-jasondockery}"
repo_name="${GROUNDWORK_REPO_NAME:-groundwork}"
repo_url="${GROUNDWORK_REPO_URL:-https://github.com/${repo_owner}/${repo_name}.git}"
github_user="${GROUNDWORK_GITHUB_USER:-${GITHUB_USER:-}}"
groundwork_dir="${GROUNDWORK_DIR:-$HOME/code/groundwork}"

# Restartable bootstrap for a new Mac:
# - validates admin access and Apple developer tools
# - installs or reuses Homebrew
# - installs or reuses git, gh, and chezmoi
# - authenticates GitHub only if the selected repo URL is not anonymously readable
# - clones/updates Groundwork in a visible checkout
# - runs chezmoi with that checkout as the source directory
#
# Re-run this script after fixing any failure. Completed steps are skipped or
# retried safely.

info() {
  printf '\n==> %s\n' "$*"
}

warn() {
  printf '\nwarning: %s\n' "$*" >&2
}

die() {
  printf '\nerror: %s\n' "$*" >&2
  exit 1
}

prompt() {
  local reply
  local question="$1"
  local default="${2:-}"

  if [[ ! -t 0 ]]; then
    printf '%s' "$default"
    return
  fi

  read -r -p "$question" reply
  printf '%s' "${reply:-$default}"
}

ensure_github_auth() {
  info "Checking GitHub authentication"

  if ! gh auth status --hostname github.com >/dev/null 2>&1; then
    warn "No valid GitHub authentication found for github.com."
    gh auth login --hostname github.com --git-protocol https --web
  fi

  if [[ -n "$github_user" ]]; then
    info "Selecting GitHub account: $github_user"
    if ! gh auth switch --hostname github.com --user "$github_user" >/dev/null 2>&1; then
      warn "GitHub account '$github_user' is not authenticated yet."
      gh auth login --hostname github.com --git-protocol https --web
      gh auth switch --hostname github.com --user "$github_user" >/dev/null
    fi
  elif [[ -t 0 ]]; then
    local choice
    echo
    gh auth status --hostname github.com || true
    echo
    echo "Use the active GitHub account above if it can read ${repo_owner}/${repo_name}."
    echo "Choose 'switch' if another already-authenticated account should be active."
    echo "Choose 'login' to add or refresh a GitHub account."
    choice="$(prompt "GitHub account choice [keep/switch/login]: " "keep")"
    case "$choice" in
      keep|k|"")
        ;;
      switch|s)
        gh auth switch --hostname github.com || gh auth login --hostname github.com --git-protocol https --web
        ;;
      login|l|add|a)
        gh auth login --hostname github.com --git-protocol https --web
        ;;
      *)
        warn "Unknown choice '$choice'; keeping the current active account."
        ;;
    esac
  fi

  gh auth setup-git --hostname github.com
}

can_read_repo() {
  GIT_TERMINAL_PROMPT=0 git ls-remote --exit-code "$repo_url" HEAD >/dev/null 2>&1
}

github_repo_slug() {
  local url="$1" slug
  case "$url" in
    https://github.com/*) slug="${url#https://github.com/}" ;;
    git@github.com:*) slug="${url#git@github.com:}" ;;
    ssh://git@github.com/*) slug="${url#ssh://git@github.com/}" ;;
    *) return 1 ;;
  esac
  slug="${slug%/}"
  slug="${slug%.git}"
  [[ "$slug" == */* ]] || return 1
  printf '%s\n' "$slug"
}

origin_matches_repo_url() {
  local origin_url="$1" expected_url="$2" origin_slug expected_slug
  [[ "$origin_url" == "$expected_url" ]] && return 0
  if origin_slug="$(github_repo_slug "$origin_url")" && expected_slug="$(github_repo_slug "$expected_url")"; then
    [[ "$origin_slug" == "$expected_slug" ]]
    return
  fi
  return 1
}

ensure_repo_access() {
  info "Checking Groundwork repo access"

  if can_read_repo; then
    info "Repo is readable: ${repo_url}"
    return
  fi

  case "$repo_url" in
    https://github.com/*)
      warn "Repo is not readable anonymously; trying GitHub authentication."
      ensure_github_auth
      can_read_repo || die "Could not read ${repo_url}. Confirm the URL is correct and the active GitHub account can access ${repo_owner}/${repo_name}."
      ;;
    git@github.com:*|ssh://git@github.com/*)
      die "Could not read ${repo_url} over SSH. Confirm this Mac has the right SSH key loaded and that key is added to the GitHub account with repo access."
      ;;
    *)
      die "Could not read ${repo_url}. Confirm the repo URL and network access, then re-run this script."
      ;;
  esac
}

clone_or_update_groundwork() {
  info "Preparing visible Groundwork checkout"

  if [[ -d "$groundwork_dir/.git" ]]; then
    local origin_url
    info "Groundwork checkout already exists: $groundwork_dir"
    origin_url="$(git -C "$groundwork_dir" remote get-url origin 2>/dev/null || true)"
    [[ -n "$origin_url" ]] || die "$groundwork_dir has no origin remote. Set GROUNDWORK_DIR to another path or fix the checkout."
    if ! origin_matches_repo_url "$origin_url" "$repo_url"; then
      die "$groundwork_dir points at '$origin_url', not '$repo_url'. Move it aside, set GROUNDWORK_DIR, or set GROUNDWORK_REPO_URL to the existing checkout intentionally."
    fi
    git -C "$groundwork_dir" fetch origin
    git -C "$groundwork_dir" pull --ff-only
    return
  fi

  if [[ -e "$groundwork_dir" ]]; then
    die "$groundwork_dir exists but is not a Git checkout. Move it aside or set GROUNDWORK_DIR to another path."
  fi

  mkdir -p "$(dirname "$groundwork_dir")"
  git clone "$repo_url" "$groundwork_dir"
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  die "This bootstrap is for macOS."
fi

info "Checking administrator access"
sudo -v || die "Homebrew needs the current macOS user to be an Administrator."

info "Checking Apple Command Line Tools"
if ! /usr/bin/xcode-select -p >/dev/null 2>&1; then
  /usr/bin/xcode-select --install || true
  cat >&2 <<'EOF'

The Apple Command Line Tools installer has been opened.
Finish that install, then run this bootstrap again.
EOF
  exit 1
fi

developer_dir="$(/usr/bin/xcode-select -p 2>/dev/null || true)"
if command -v /usr/bin/xcodebuild >/dev/null 2>&1; then
  if ! /usr/bin/xcodebuild -license check >/dev/null 2>&1; then
    license_output="$(/usr/bin/xcodebuild -license check 2>&1 || true)"
    if [[ "$license_output" == *"requires Xcode"* && "$developer_dir" == "/Library/Developer/CommandLineTools" ]]; then
      warn "Full Xcode is not active; continuing with Command Line Tools."
    else
      info "Accepting Xcode license"
      sudo /usr/bin/xcodebuild -license accept || {
        cat >&2 <<'EOF'

Could not accept the Xcode license automatically.
Run:
  sudo xcodebuild -license accept

Then run this bootstrap again.
EOF
        exit 1
      }
    fi
  fi
fi

if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -x /usr/local/bin/brew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

if ! command -v brew >/dev/null 2>&1; then
  info "Installing Homebrew"
  sudo -v || die "Homebrew needs administrator access; run again from an Administrator account."
  NONINTERACTIVE=1 /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  else
    die "Homebrew installer finished, but brew was not found."
  fi
else
  info "Homebrew already installed"
fi

info "Installing bootstrap tools"
brew install git gh chezmoi

ensure_repo_access
clone_or_update_groundwork

info "Applying Groundwork from ${groundwork_dir}"
chezmoi --source "$groundwork_dir" init --apply

info "Bootstrap complete"
cat <<EOF

Next:
  1. Open the Groundwork docs:
       open "$groundwork_dir/docs/index.html"
  2. Work through the README finish-up checklist.
  3. Re-run 'chezmoi apply' any time you want to repair managed config.
EOF
