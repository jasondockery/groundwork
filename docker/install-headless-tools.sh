#!/usr/bin/env bash
set -euo pipefail

arch="$(uname -m)"
case "$arch" in
  x86_64) release_arch="x86_64"; deb_arch="amd64"; atuin_arch="x86_64" ;;
  aarch64|arm64) release_arch="arm64"; deb_arch="arm64"; atuin_arch="aarch64" ;;
  *) echo "unsupported arch: $arch" >&2; exit 1 ;;
esac

github_api_headers=()
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  github_api_headers=(-H "Authorization: Bearer $GITHUB_TOKEN")
elif [[ -r /run/secrets/github_token ]]; then
  github_token="$(< /run/secrets/github_token)"
  if [[ -n "$github_token" ]]; then
    github_api_headers=(-H "Authorization: Bearer $github_token")
  fi
  unset github_token
fi

latest_asset() {
  local repo="$1" pattern="$2" response url
  if ((${#github_api_headers[@]})); then
    response="$(curl -fsSL "${github_api_headers[@]}" "https://api.github.com/repos/$repo/releases/latest")" || {
      echo "failed to fetch latest release metadata for $repo" >&2
      return 1
    }
  elif ! response="$(curl -fsSL "https://api.github.com/repos/$repo/releases/latest")"; then
    echo "failed to fetch latest release metadata for $repo" >&2
    return 1
  fi
  url="$(jq -r --arg pattern "$pattern" '.assets[] | select(.name | test($pattern)) | .browser_download_url' <<<"$response" \
    | head -n1)"
  if [[ -z "$url" ]]; then
    echo "no release asset matched $repo pattern $pattern" >&2
    jq -r '.assets[]?.name' <<<"$response" >&2
    return 1
  fi
  printf '%s\n' "$url"
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

install_zoxide() {
  curl -fsSL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh -s -- --bin-dir /usr/local/bin
  chmod 0755 /usr/local/bin/zoxide
}

install_atuin() {
  local tmp url atuin_bin
  tmp="$(mktemp -d)"
  url="$(latest_asset atuinsh/atuin "atuin-${atuin_arch}-unknown-linux.*\\.tar\\.gz$")"
  curl -fsSL "$url" -o "$tmp/atuin.tar.gz"
  tar -xzf "$tmp/atuin.tar.gz" -C "$tmp"
  atuin_bin="$(find "$tmp" -type f -name atuin -perm -111 | head -n1)"
  if [[ -z "$atuin_bin" ]]; then
    echo "atuin binary not found in release archive" >&2
    rm -rf "$tmp"
    return 1
  fi
  install -m 0755 "$atuin_bin" /usr/local/bin/atuin
  rm -rf "$tmp"
}

install_antidote() {
  if [[ -d /usr/local/share/antidote/.git ]]; then
    git -C /usr/local/share/antidote pull --ff-only || true
  else
    git clone --depth 1 https://github.com/mattmc3/antidote.git /usr/local/share/antidote
  fi
}

install_lazygit() {
  local tmp url
  tmp="$(mktemp -d)"
  url="$(latest_asset jesseduffield/lazygit "linux_${release_arch}\.tar\.gz$")"
  curl -fsSL "$url" -o "$tmp/lazygit.tar.gz"
  tar -xzf "$tmp/lazygit.tar.gz" -C "$tmp" lazygit
  install -m 0755 "$tmp/lazygit" /usr/local/bin/lazygit
  rm -rf "$tmp"
}

install_delta() {
  local tmp url
  tmp="$(mktemp -d)"
  url="$(latest_asset dandavison/delta "git-delta_[0-9].*_${deb_arch}\.deb$")"
  curl -fsSL "$url" -o "$tmp/delta.deb"
  apt-get update
  apt-get install -y "$tmp/delta.deb"
  rm -rf /var/lib/apt/lists/* "$tmp"
}

install_eza() {
  mkdir -p /etc/apt/keyrings
  wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | gpg --dearmor > /etc/apt/keyrings/gierens.gpg.tmp
  mv /etc/apt/keyrings/gierens.gpg.tmp /etc/apt/keyrings/gierens.gpg
  echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] https://deb.gierens.de stable main" > /etc/apt/sources.list.d/gierens.list
  chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list
  apt-get update
  apt-get install -y eza
  rm -rf /var/lib/apt/lists/*
}

install_sesh() {
  local tmp url
  tmp="$(mktemp -d)"
  url="$(latest_asset joshmedeski/sesh "Linux_${release_arch}\.tar\.gz$")"
  curl -fsSL "$url" -o "$tmp/sesh.tar.gz"
  tar -xzf "$tmp/sesh.tar.gz" -C "$tmp"
  install -m 0755 "$tmp/sesh" /usr/local/bin/sesh
  rm -rf "$tmp"
}

install_starship
install_mise
install_uv
install_zoxide
install_atuin
install_antidote
install_lazygit
install_delta
install_eza
install_sesh
