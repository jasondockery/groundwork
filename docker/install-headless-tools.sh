#!/usr/bin/env bash
set -euo pipefail

arch="$(uname -m)"
case "$arch" in
  x86_64) release_arch="x86_64"; deb_arch="amd64" ;;
  aarch64|arm64) release_arch="arm64"; deb_arch="arm64" ;;
  *) echo "unsupported arch: $arch" >&2; exit 1 ;;
esac

latest_asset() {
  local repo="$1" pattern="$2" url
  url="$(curl -fsSL "https://api.github.com/repos/$repo/releases/latest" \
    | jq -r --arg pattern "$pattern" '.assets[] | select(.name | test($pattern)) | .browser_download_url' \
    | head -n1)"
  if [[ -z "$url" ]]; then
    echo "no release asset matched $repo pattern $pattern" >&2
    return 1
  fi
  printf '%s\n' "$url"
}

install_starship() {
  curl -fsSL https://starship.rs/install.sh | sh -s -- -y
}

install_mise() {
  curl -fsSL https://mise.run | sh
  ln -sf /root/.local/bin/mise /usr/local/bin/mise
}

install_uv() {
  curl -fsSL https://astral.sh/uv/install.sh | sh
  ln -sf /root/.local/bin/uv /usr/local/bin/uv
  ln -sf /root/.local/bin/uvx /usr/local/bin/uvx
}

install_zoxide() {
  curl -fsSL https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | sh
  ln -sf /root/.local/bin/zoxide /usr/local/bin/zoxide
}

install_atuin() {
  curl --proto '=https' --tlsv1.2 -LsSf https://setup.atuin.sh | sh
  ln -sf /root/.atuin/bin/atuin /usr/local/bin/atuin
}

install_antidote() {
  git clone --depth 1 https://github.com/mattmc3/antidote.git /usr/local/share/antidote
}

install_lazygit() {
  tmp="$(mktemp -d)"
  url="$(latest_asset jesseduffield/lazygit "linux_${release_arch}\.tar\.gz$")"
  curl -fsSL "$url" -o "$tmp/lazygit.tar.gz"
  tar -xzf "$tmp/lazygit.tar.gz" -C "$tmp" lazygit
  install -m 0755 "$tmp/lazygit" /usr/local/bin/lazygit
  rm -rf "$tmp"
}

install_delta() {
  tmp="$(mktemp -d)"
  url="$(latest_asset dandavison/delta "git-delta_[0-9].*_${deb_arch}\.deb$")"
  curl -fsSL "$url" -o "$tmp/delta.deb"
  apt-get update
  apt-get install -y "$tmp/delta.deb"
  rm -rf /var/lib/apt/lists/* "$tmp"
}

install_eza() {
  mkdir -p /etc/apt/keyrings
  wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
  echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" > /etc/apt/sources.list.d/gierens.list
  chmod 644 /etc/apt/keyrings/gierens.gpg /etc/apt/sources.list.d/gierens.list
  apt-get update
  apt-get install -y eza
  rm -rf /var/lib/apt/lists/*
}

install_sesh() {
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
