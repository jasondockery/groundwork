# syntax=docker/dockerfile:1.7
FROM ubuntu:26.04@sha256:b7f48194d4d8b763a478a621cdc81c27be222ba2206ca3ca6bc42b49685f3d9e

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
    zsh git curl wget ca-certificates locales sudo unzip tar gzip xz-utils gnupg \
    tmux neovim ripgrep fd-find bat fzf jq shellcheck build-essential \
  && ln -sf "$(command -v fdfind)" /usr/local/bin/fd \
  && ln -sf "$(command -v batcat)" /usr/local/bin/bat \
  && locale-gen en_US.UTF-8 \
  && rm -rf /var/lib/apt/lists/*

COPY docker/install-headless-tools.sh /tmp/install-headless-tools.sh
RUN --mount=type=secret,id=github_token bash /tmp/install-headless-tools.sh && rm /tmp/install-headless-tools.sh

ARG USER=dev
ARG USER_UID=1000
ARG USER_GID=$USER_UID
RUN set -eux; \
  if getent group "$USER_GID" >/dev/null; then \
    existing_group="$(getent group "$USER_GID" | cut -d: -f1)"; \
    if [ "$existing_group" != "$USER" ]; then groupmod -n "$USER" "$existing_group"; fi; \
  else \
    groupadd --gid "$USER_GID" "$USER"; \
  fi; \
  if getent passwd "$USER_UID" >/dev/null; then \
    existing_user="$(getent passwd "$USER_UID" | cut -d: -f1)"; \
    if [ "$existing_user" != "$USER" ]; then userdel -r "$existing_user" 2>/dev/null || userdel "$existing_user"; fi; \
  fi; \
  useradd --uid "$USER_UID" --gid "$USER_GID" -m -s /usr/bin/zsh "$USER"; \
  echo "$USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$USER"; \
  chmod 0440 "/etc/sudoers.d/$USER"

USER $USER
WORKDIR /home/$USER
RUN mkdir -p /home/$USER/.config/chezmoi
ENV PATH=/home/$USER/.local/bin:/home/$USER/.cargo/bin:/home/$USER/.local/share/mise/shims:$PATH

RUN sh -c "$(curl -fsSL https://get.chezmoi.io)" -- -b /home/$USER/.local/bin
COPY --chown=$USER:$USER . /opt/groundwork
COPY --chown=$USER:$USER docker/chezmoi.headless.toml /home/$USER/.config/chezmoi/chezmoi.toml
RUN chezmoi --source /opt/groundwork apply

CMD ["zsh"]
