#!/usr/bin/env bash
set -euo pipefail

arch="$(uname -m)"
case "$arch" in
  x86_64)
    release_arch="x86_64"
    deb_arch="amd64"
    musl_arch="x86_64"
    ;;
  aarch64 | arm64)
    release_arch="arm64"
    deb_arch="arm64"
    musl_arch="aarch64"
    ;;
  *)
    echo "unsupported arch: $arch" >&2
    exit 1
    ;;
esac

github_api_headers=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  github_api_headers=(-H "Authorization: Bearer $GITHUB_TOKEN")
elif [[ -r /run/secrets/github_token ]]; then
  github_token="$(</run/secrets/github_token)"
  if [[ -n "$github_token" ]]; then
    github_api_headers=(-H "Authorization: Bearer $github_token")
  fi
  unset github_token
fi

release_json() {
  local repo="$1"
  if ((${#github_api_headers[@]})); then
    curl -fsSL "${github_api_headers[@]}" "https://api.github.com/repos/$repo/releases/latest"
  else
    curl -fsSL "https://api.github.com/repos/$repo/releases/latest"
  fi
}

# Download the first release asset matching pattern, then verify it against the
# release's published checksum asset when one exists: a sidecar <name>.sha256
# (atuin) or a checksums*.txt list (lazygit, sesh). Upstreams that publish no
# checksums (zoxide, delta, dust today) install unverified; the roadmap tracks
# raising this lane to GitHub artifact attestation verification.
download_release_asset() {
  local repo="$1" pattern="$2" dest="$3"
  local response url name sum_url expected
  response="$(release_json "$repo")" || {
    echo "failed to fetch latest release metadata for $repo" >&2
    return 1
  }
  url="$(jq -r --arg pattern "$pattern" '[.assets[] | select(.name | test($pattern)) | .browser_download_url] | first // empty' <<<"$response")"
  if [[ -z "$url" ]]; then
    echo "no release asset matched $repo pattern $pattern" >&2
    jq -r '.assets[]?.name' <<<"$response" >&2
    return 1
  fi
  name="${url##*/}"
  curl -fsSL "$url" -o "$dest"
  sum_url="$(jq -r --arg n "$name.sha256" '[.assets[] | select(.name == $n) | .browser_download_url] | first // empty' <<<"$response")"
  if [[ -n "$sum_url" ]]; then
    expected="$(curl -fsSL "$sum_url" | awk '{print $1; exit}')"
  else
    sum_url="$(jq -r '[.assets[] | select(.name | test("checksums.*\\.txt$"; "i")) | .browser_download_url] | first // empty' <<<"$response")"
    if [[ -n "$sum_url" ]]; then
      expected="$(curl -fsSL "$sum_url" | awk -v n="$name" '$2 == n || $2 == "*" n { print $1; exit }')"
    fi
  fi
  if [[ -n "$sum_url" ]]; then
    if [[ -z "$expected" ]]; then
      echo "release checksums for $repo do not list $name" >&2
      return 1
    fi
    if ! printf '%s  %s\n' "$expected" "$dest" | sha256sum -c --status -; then
      echo "checksum mismatch for $name from $repo" >&2
      return 1
    fi
    echo "verified sha256 for $name"
  else
    echo "no checksum asset published for $name; installed unverified"
  fi
}

install_starship() {
  curl -fsSL https://starship.rs/install.sh | sh -s -- -y -b /usr/local/bin
}

install_mise() {
  curl -fsSL https://mise.run | MISE_INSTALL_PATH=/usr/local/bin/mise sh
  chmod 0755 /usr/local/bin/mise
}

install_uv() {
  curl -fsSL https://astral.sh/uv/install.sh | UV_INSTALL_DIR=/usr/local/bin sh
  chmod 0755 /usr/local/bin/uv /usr/local/bin/uvx
}

# zoxide's upstream install.sh queries the GitHub API without auth and rate-limits
# on shared CI runner IPs; fetch the release through the authenticated helper instead.
install_zoxide() (
  local tmp zoxide_bin
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  download_release_asset ajeetdsouza/zoxide "zoxide-.*-${musl_arch}-unknown-linux-musl\\.tar\\.gz$" "$tmp/zoxide.tar.gz"
  tar -xzf "$tmp/zoxide.tar.gz" -C "$tmp"
  zoxide_bin="$(find "$tmp" -type f -name zoxide -perm /111 -print -quit)"
  if [[ -z "$zoxide_bin" ]]; then
    echo "zoxide binary not found in release archive" >&2
    return 1
  fi
  install -m 0755 "$zoxide_bin" /usr/local/bin/zoxide
  zoxide --version >/dev/null
)

# Tarball installers run in a subshell with an EXIT trap so the temp dir is
# cleaned up on any failure path, and end with a smoke check so a wrong or
# incompatible binary fails the build here, not later in a shell session.
install_atuin() (
  local tmp atuin_bin
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  download_release_asset atuinsh/atuin "atuin-${musl_arch}-unknown-linux-musl\\.tar\\.gz$" "$tmp/atuin.tar.gz"
  tar -xzf "$tmp/atuin.tar.gz" -C "$tmp"
  atuin_bin="$(find "$tmp" -type f -name atuin -perm /111 -print -quit)"
  if [[ -z "$atuin_bin" ]]; then
    echo "atuin binary not found in release archive" >&2
    return 1
  fi
  install -m 0755 "$atuin_bin" /usr/local/bin/atuin
  atuin --version >/dev/null
)

install_antidote() {
  if [[ -d /usr/local/share/antidote/.git ]]; then
    git -C /usr/local/share/antidote pull --ff-only || true
  else
    git clone --depth 1 https://github.com/mattmc3/antidote.git /usr/local/share/antidote
  fi
}

install_lazygit() (
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  download_release_asset jesseduffield/lazygit "linux_${release_arch}\.tar\.gz$" "$tmp/lazygit.tar.gz"
  tar -xzf "$tmp/lazygit.tar.gz" -C "$tmp" lazygit
  install -m 0755 "$tmp/lazygit" /usr/local/bin/lazygit
  lazygit --version >/dev/null
)

install_delta() (
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  download_release_asset dandavison/delta "git-delta_[0-9].*_${deb_arch}\.deb$" "$tmp/delta.deb"
  apt-get update
  apt-get install -y "$tmp/delta.deb"
  rm -rf /var/lib/apt/lists/*
  delta --version >/dev/null
)

install_eza() {
  mkdir -p /etc/apt/keyrings
  wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | gpg --dearmor >/etc/apt/keyrings/gierens.gpg.tmp
  mv /etc/apt/keyrings/gierens.gpg.tmp /etc/apt/keyrings/gierens.gpg
  echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] https://deb.gierens.de stable main" >/etc/apt/sources.list.d/gierens.list
  chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list
  apt-get update
  apt-get install -y eza
  rm -rf /var/lib/apt/lists/*
}

install_dust() (
  local tmp dust_bin
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  download_release_asset bootandy/dust "dust-v.*-${musl_arch}-unknown-linux-musl\\.tar\\.gz$" "$tmp/dust.tar.gz"
  tar -xzf "$tmp/dust.tar.gz" -C "$tmp"
  dust_bin="$(find "$tmp" -type f -name dust -perm /111 -print -quit)"
  if [[ -z "$dust_bin" ]]; then
    echo "dust binary not found in release archive" >&2
    return 1
  fi
  install -m 0755 "$dust_bin" /usr/local/bin/dust
  dust --version >/dev/null
)

install_sesh() (
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  download_release_asset joshmedeski/sesh "Linux_${release_arch}\.tar\.gz$" "$tmp/sesh.tar.gz"
  tar -xzf "$tmp/sesh.tar.gz" -C "$tmp"
  install -m 0755 "$tmp/sesh" /usr/local/bin/sesh
  sesh --version >/dev/null
)

install_starship
install_mise
install_uv
install_zoxide
install_atuin
install_antidote
install_lazygit
install_delta
install_eza
install_dust
install_sesh
