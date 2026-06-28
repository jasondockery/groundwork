FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
    zsh git curl wget ca-certificates locales sudo unzip tar gzip xz-utils gnupg \
    tmux neovim ripgrep fd-find bat fzf jq build-essential \
  && ln -sf "$(command -v fdfind)" /usr/local/bin/fd \
  && ln -sf "$(command -v batcat)" /usr/local/bin/bat \
  && locale-gen en_US.UTF-8 \
  && rm -rf /var/lib/apt/lists/*

COPY docker/install-headless-tools.sh /tmp/install-headless-tools.sh
RUN bash /tmp/install-headless-tools.sh && rm /tmp/install-headless-tools.sh

ARG USER=dev
RUN useradd -m -s /usr/bin/zsh "$USER" \
  && echo "$USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$USER" \
  && chmod 0440 "/etc/sudoers.d/$USER"

USER $USER
WORKDIR /home/$USER
RUN mkdir -p /home/$USER/.config/chezmoi
ENV PATH=/home/$USER/.local/bin:/home/$USER/.cargo/bin:/home/$USER/.local/share/mise/shims:$PATH

RUN sh -c "$(curl -fsSL https://get.chezmoi.io)" -- -b /home/$USER/.local/bin
COPY --chown=$USER:$USER . /opt/groundwork
COPY --chown=$USER:$USER docker/chezmoi.headless.toml /home/$USER/.config/chezmoi/chezmoi.toml
RUN chezmoi --source /opt/groundwork apply

CMD ["zsh"]
