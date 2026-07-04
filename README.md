# Groundwork

[![CI](https://github.com/jasondockery/groundwork/actions/workflows/ci.yml/badge.svg)](https://github.com/jasondockery/groundwork/actions/workflows/ci.yml)
[![Pages](https://github.com/jasondockery/groundwork/actions/workflows/pages.yml/badge.svg)](https://github.com/jasondockery/groundwork/actions/workflows/pages.yml)

An AI-native development foundation for Mac, Linux/WSL, and headless agent workspaces.

Built and maintained by [Jason Dockery](https://www.linkedin.com/in/jasondockery/) ([GitHub](https://github.com/jasondockery)).

Groundwork combines a reproducible development setup with a learning path for the fundamentals that stay useful when AI tools change: the shell, Git, project instructions, verification, and how to direct and supervise AI agents while the human remains the senior partner.

It installs the tools a developer may want, but the tools are not the point. Editors, multiplexers, launchers, and browsers are choices. The durable skill is learning how to make work observable: know where files live, read the diff, run the checks, understand what changed, and keep agent-assisted development accountable.

macOS is the primary desktop target. Linux, WSL, and headless containers share the same terminal layer so the workflow remains usable in local shells, CI, servers, and disposable agent environments. Native Windows is not a separate target; use WSL2 for the Unix development environment.

This repo is the complete, version-controlled source for the setup, docs, validation, and project scaffolds.

## Who It's For

Groundwork is for adults starting real development, especially people who have never coded before: career changers, people returning to technical work, and later-in-life beginners who want to build seriously. It is equally useful for working developers and teams adopting an AI-native workflow.

It treats beginners as capable adults. It gives a first successful path quickly, then offers substantial practice for people willing to put in real hours. It is deliberately not a children's learn-to-code introduction.

## How People Learn Here

Groundwork is a progressive path. You do not have to do everything, and you can go as deep as you want:

1. **Overview.** Understand AI-native development, the arc from vibe coding toward agentic engineering, and why fundamentals matter before setup begins.
2. **Quick wins.** Provision a machine and do short practice steps that produce something real fast, because momentum matters.
3. **Substantial practice.** Spend focused time on week-long tracks: a browser first-person shooter, a Unity first-person shooter, a web project, an app, and a generative-media image/video pipeline.

The tracks are branches on one shared spine: shell, Git, project instructions, validation, and agent-direction skills underneath whichever domain makes someone excited enough to practice.

Groundwork is an on-ramp, not the whole road. It will not turn someone into an agentic engineer by itself; it gives the big picture, the working environment, and the first serious reps so learners know what they are aiming toward.

New here? Read the public docs at <https://jasondockery.github.io/groundwork/> or open `docs/index.html` locally from a checkout.

## Supported Platforms

| Platform | Status | What applies |
| --- | --- | --- |
| macOS desktop | Primary | Full terminal layer, Homebrew formulae, casks, App Store apps, selected macOS defaults, browser/app helpers |
| Linux / WSL2 | Terminal layer | zsh, Git, tmux, Neovim, shell tools, mise/uv, helper scripts; GUI apps and macOS defaults are skipped |
| Headless / Docker | Terminal layer | Non-interactive shell environment for agents, CI, and disposable dev containers; no GUI apps |
| Native Windows | Use WSL2 | Groundwork is Unix-shell-oriented. Install WSL2/Ubuntu, keep projects in the WSL filesystem, and use the Linux terminal layer there |

Groundwork uses one chezmoi source tree. `.chezmoi.os` skips macOS desktop apps on Linux/WSL, and the `headless` flag is reserved for explicit server, CI, and container profiles. The public docs version of this split lives in `docs/platforms.html`.

Headless Docker quick start:

```bash
docker build -t groundwork .
docker run -it --rm groundwork
```

## AI-native by default

Groundwork treats AI as part of the development environment, not as a sidecar. The terminal, tmux, Neovim, Git, Raycast, Anybox, and the docs are arranged around a repeatable human-in-the-loop workflow:

1. Start from a real project folder with clear `AGENTS.md` instructions.
2. Ask an agent to inspect, plan, edit, test, or explain.
3. Review the diff yourself before keeping changes.
4. Run the repo's validation commands.
5. Capture durable lessons in docs, skills, or the knowledge wiki.

Terminal-first is the interface; AI-native is the workflow. Agents operate through files, shell commands, Git diffs, project instructions, and verification steps, so the keyboard-first tooling is here to make supervising that work fast and teachable.

The long-term direction lives in one canonical file: [`AI_THESIS.md`](AI_THESIS.md). Agent adapters, docs, and skills should reference that file instead of restating the thesis in parallel.

## Important — opinionated Mac setup

This repo is not a passive app installer. It is an opinionated development environment and it changes the Mac it runs on: shell config, Git config, terminal/editor/tmux settings, VS Code settings, Homebrew packages, selected macOS defaults, Finder behavior, keyboard repeat behavior, browser/developer preferences, and app-specific setup where macOS allows it.

On first apply, the setup creates a focused backup at `~/.local/state/groundwork/backups/latest` before changing managed files and macOS defaults. Restore with:

```bash
groundwork-restore
```

That restore is intentionally scoped: it restores the managed config files and macOS defaults this repo snapshots. It does **not** uninstall apps, undo Homebrew upgrades, reverse manual permissions, or replace Time Machine.

During `chezmoi init`, existing Macs are also offered an optional clean start for common conflict zones. Say **yes** only when you want old terminal/editor/tmux state moved aside before this setup applies. The moved files go to `~/.local/state/groundwork/reset/latest`; they are not deleted.

## Start Here

On a fresh Mac, run the bootstrap script. It is the source of truth for new-Mac setup and is safe to re-run after fixing any failure.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/jasondockery/groundwork/main/bootstrap-mac.sh)"
```

Want to inspect it first?

```bash
curl -fsSL https://raw.githubusercontent.com/jasondockery/groundwork/main/bootstrap-mac.sh -o /tmp/bootstrap-mac.sh
less /tmp/bootstrap-mac.sh
bash /tmp/bootstrap-mac.sh
```

That script installs every Brewfile package, lays down all configs, and runs the setup scripts. Re-run later with `chezmoi update` (pull + apply) or `chezmoi apply` (apply local source). Those commands sync configuration; they do not upgrade already-installed tools to newer upstream releases.

Advanced users can override the clone URL, for example when using SSH:

```bash
GROUNDWORK_REPO_URL=git@github.com:jasondockery/groundwork.git bash /tmp/bootstrap-mac.sh
```

## Updating Later

`chezmoi update` runs `git pull` from this repo and applies the result. If the repo changes an install hook, such as the Brewfile bundle, that hook can add newly declared tools; it still does not chase newer Homebrew or mise releases for tools already installed. The public repo does not require GitHub login for normal pulls.

Run `update-all` when you want a visible, batched refresh of Groundwork, Homebrew packages/casks, mise-managed tools such as Node LTS, and Homebrew-managed AI tools such as Codex and OpenCode. Claude Code stays on its vendor-supported latest channel. Upgraded tools take effect at your next shell prompt, even in already-open terminals. The shell prints a gentle reminder when that refresh has gone stale; set `GROUNDWORK_UPDATE_REMINDER=0` in `~/.zshrc.local` to silence it.

## Customizing Without Forking

Groundwork is a shared base with a personal layer. Put small personal preferences in local override files that Groundwork intentionally loads last:

```bash
~/.zshrc.local
~/.gitconfig.local
~/.config/tmux/tmux.local.conf
```

Setup choices live in `~/.config/chezmoi/chezmoi.toml`; re-run `chezmoi init` or edit that file, then `chezmoi diff` and `chezmoi apply`. For the full model, open `docs/customizing.html`.

> **Pre-release macOS:** if you're on a beta/just-released macOS, Homebrew may not have bottles for a few formulae and will build them from source (slow) or skip them. `brew bundle` continues past failures, so skim the output and `brew install <formula>` anything that didn't land.

If you use GitHub for your own projects, authenticate the Mac as the person using it:

```bash
gh auth status               # confirm it's the Mac user's GitHub account
gh auth switch               # choose another already-authenticated account
gh auth login --git-protocol https
gh auth setup-git --hostname github.com
```

SSH is fine if you already manage multiple GitHub accounts with `~/.ssh/config`. If a clone was pointed at the wrong remote, point it back at the public HTTPS URL:

```bash
git -C "${GROUNDWORK_DIR:-$HOME/code/groundwork}" remote set-url origin https://github.com/jasondockery/groundwork.git
```

> The gh credential helper is baked into `home/dot_gitconfig.tmpl`, so it survives every apply. Running `gh auth setup-git` alone isn't enough on its own — `~/.gitconfig` is chezmoi-managed, so without the template change the next `chezmoi apply` would overwrite it.

## You'll be asked (once)

Stored in `~/.config/chezmoi/chezmoi.toml`; re-run with `chezmoi init`.

| Prompt | Notes |
| --- | --- |
| Is this a work machine? | `no` by default. `yes` gates personal apps and Docker Desktop off this Mac |
| Is this a server/CI Mac with no desktop apps? | Mac only. `no` by default. Most Macs should press Enter; `yes` skips Raycast, browsers, Obsidian, App Store apps, and macOS defaults. Linux/WSL skip macOS desktop apps by OS |
| What is your GitHub username? | Your own — sets your git identity, separate from the `jasondockery` repo address used for cloning |
| What name should Git use for commits? | Your human name in commit metadata |
| What personal email should Git use for commits? | Your personal commit email |
| What work email should Git use? | blank if none |
| Where should projects live? | default `~/code` |
| Reset old terminal/editor/tmux state before applying? | `no` by default. Use `yes` on an already-used Mac if old Neovim, tmux, zsh completion, or plugin state may compete with this setup. Moved aside to `~/.local/state/groundwork/reset/latest` |
| Which password manager should Groundwork configure for SSH + git signing? | `1password` / `bitwarden` / `none` |
| What SSH public key should Git use for signing? | the **public** key; blank to skip commit signing |
| What should the Obsidian vault be named? | folder in iCloud Drive/Obsidian; default `my_obsidian_vault`, blank to skip |
| Install optional Unity game development tools? | `no` by default. Use `yes` to install Unity Hub and C# VS Code extensions for the Unity FPS track |
| Install Xcode for native Apple/iOS development? | `no` by default. Use `yes` to attempt the App Store Xcode install for signing, simulators, SwiftUI/iOS/macOS builds, or Unity Apple-platform builds |

## Finish-up checklist (the manual residue macOS requires)

These are the one-time steps macOS or the app vendor should own: account sign-in, App Store purchases, permission prompts, secrets, per-device hotkeys, display IDs, and cloud sync. Groundwork manages stable file/plist-backed defaults; the README keeps the operational checklist, and the linked docs carry the longer context.

- [ ] **Karabiner** — System Settings → Privacy & Security: approve **Input Monitoring** and the driver/system extension. Enables Caps Lock = Esc/Ctrl. See `docs/keyboard.html`.
- [ ] **Apple Developer / Xcode** — optional and large. If you enabled the Xcode setup option, Groundwork attempts the App Store install; if it does not go through, get Xcode from the Mac App Store manually. Then open Xcode once, accept first-launch setup/license prompts, sign in at Xcode → Settings → Accounts, and let Xcode manage certificates/profiles. Never put certificates, provisioning profiles, or `.mobileconfig` profiles in dotfiles. See `docs/macos.html`.
- [ ] **Password manager** — sign in, enable the SSH agent, and confirm signed commits work. See `docs/apps.html` and `docs/git.html`.
- [ ] **Bitwarden as default autofill** — make Bitwarden the source of truth for macOS, browsers, and mobile autofill. See `docs/apps.html`.
- [ ] **Obsidian** — open the vault, keep it downloaded, restart once for plugins, and configure Smart Connections, Whisper, and Ollama only if you use AI over notes. See `docs/apps.html` and `docs/knowledge.html`.
- [ ] **Ollama** (local AI) — optional local service for embeddings and note helpers; launch it once so it serves `localhost:11434`, then run `ollama pull nomic-embed-text`. See `docs/apps.html`.
- [ ] **Raycast** — make it your **⌘Space** launcher, run `raycast-extensions --open`, set the core window/clipboard/bookmark/Anybox shortcuts, then use Raycast Cloud Sync or export/import for reproduction. See `docs/apps.html` and `docs/macos.html`.
- [ ] **Raycast AI** (optional) — leave it off unless you want Claude/GPT/Grok from Raycast. The launcher, clipboard, windows, Quicklinks, and Anybox search work without it. See `docs/apps.html`.
- [ ] **BetterDisplay** — optional display preset and external-monitor control layer; open it once, keep the menu-bar icon on, favorite the resolutions you use, and test brightness/DDC controls. See `docs/macos.html`.
- [ ] **Anybox** (Mac App Store) — paid link library; buy/Get it once per Apple Account, run it as a menu-bar app, add a few typed Quick Link keywords, and paste its API key into the Raycast extension. See `docs/apps.html`.
- [ ] **Default browser** — run `defaultbrowser` to list installed browsers, then `defaultbrowser zen`, and approve the macOS confirmation; keep Chrome for testing. See `docs/apps.html`.
- [ ] **Zen sync** — sign in with Firefox Sync for bookmarks/history/logins/open tabs; recreate Spaces per machine. See `docs/apps.html`.
- [ ] **Browser extensions** — run `browser-extensions` to list the managed add-ons, or `browser-extensions --browser zen --tier core --open` to open the core Zen set. See `docs/apps.html`.
- [ ] **Codex desktop app** (optional) — download from OpenAI or run `codex app`. (The Brewfile installs the Codex CLI, not the app.)
- [ ] **Learning tracks** — the browser/Three.js FPS track starts at `docs/game-dev.html` and needs no Unity install. If you enabled `game_dev`, open Unity Hub, install the latest Unity 6 LTS editor, add the WebGL module, then follow `docs/game-dev-unity.html`. The web, app, and image/video tracks live at `docs/web-dev.html`, `docs/app-dev.html`, and `docs/gen-media.html`.
- [ ] **Work Mac only** — start the Docker daemon: `colima start`.

## Work vs personal

One repo, both machines. The `work` flag (answered at init) gates the work Mac:

- **Off work:** Claude Code, Codex, Cursor, OpenCode, Zed, Obsidian, Dia, Docker Desktop. (Chrome, Zen, Karabiner, Raycast, BetterDisplay, and core terminal tools install on both machines.)
- **On work:** Docker becomes Colima + the Docker CLI (license-free). Confirm your employer permits the AI tools before enabling them there.

## Daily use

```bash
groundwork-help                     # show Groundwork commands, aliases, keys, and helper scripts
groundwork-help update              # filter the command catalog
scripts/validate-groundwork         # validate/lint the repo before commit/release
browser-extensions --open       # open vetted browser add-ons for Zen/Chrome/Dia
raycast-extensions --open       # open recommended Raycast Store entries
chezmoi diff                 # preview pending changes before applying
chezmoi apply                # apply source -> home
chezmoi update               # git pull + apply managed config
update-all                   # visible refresh for Groundwork, brew, mise, and agents
chezmoi edit ~/.zshrc        # edit a managed file at its source
chezmoi cd                   # shell into the source repo to commit/push

new-project myapp            # scaffold AGENTS.md + .agents/ + vendor symlinks in a repo
new-wiki ~/code/notes        # scaffold an LLM knowledge wiki repo
```

> If `chezmoi apply` says **"run chezmoi init first,"** the config template (`.chezmoi.toml.tmpl`) changed. Run `chezmoi init` (it only regenerates the config and won't re-ask questions you've already answered), then `chezmoi apply`. This is expected after pulling changes that touch the prompts or defaults.

Capturing what you install over time:

```bash
brew bundle dump --file=~/.config/homebrew/Brewfile --describe   # snapshot brew
code --list-extensions > ~/vscode-extensions.txt                 # snapshot VS Code, then: chezmoi add ~/vscode-extensions.txt
# global node CLIs: add  "npm:<pkg>" = "latest"  to ~/.config/mise/config.toml
```

## What's where

Groundwork is a normal visible project checkout, defaulting to `~/code/groundwork`. The `.chezmoiroot` file tells chezmoi that only `home/` maps into your home folder. Everything outside `home/` is repo documentation, scaffolding, or project tooling.

```text
.chezmoiroot                           # points chezmoi at home/
AI_THESIS.md -> home/.chezmoitemplates/ai-thesis.md
                                       # canonical AI-native north star
bootstrap-mac.sh                       # new-Mac bootstrap script
AGENTS.md                              # operational agent instructions for this Groundwork repo
.claude/skills -> ../skills            # project-skill discovery, canonical files stay in skills/
.codex/skills -> ../skills             # same canonical skills tree for tools that support it
skel/llm-wiki/                         # the `new-wiki` knowledge-base scaffold
docs/                                  # documentation source, published to the public site
scripts/validate-groundwork                # local validation + ShellCheck linting mirrored by CI
home/
  .chezmoitemplates/ai-thesis.md       # one source for the AI-native thesis rendered into adapters
  .chezmoi.toml.tmpl                   # the init prompts + per-machine data
  dot_zshrc.tmpl                       # zsh config and aliases
  dot_gitconfig.tmpl                   # git config (incl. the gh credential helper)
  dot_zsh_plugins.txt                  # antidote plugin list
  dot_claude/CLAUDE.md.tmpl            # Claude Code adapter: shared thesis + Claude-only notes
  dot_codex/AGENTS.md.tmpl             # Codex adapter: shared thesis + Codex-only notes
  dot_config/
    ghostty/config                     # terminal
    tmux/tmux.conf.tmpl                # tmux
    starship.toml                      # prompt
    mise/config.toml                   # runtime / tool versions
    karabiner/modify_karabiner.json    # keyboard rule merged into Karabiner's app-owned JSON
    homebrew/Brewfile.tmpl             # everything Homebrew installs
  dot_local/bin/executable_new-project # per-repo AGENTS.md + .agents/ scaffolder
  dot_local/bin/executable_groundwork-help # installed command catalog helper
  dot_local/bin/executable_raycast-extensions.tmpl
                                      # Raycast Store extension checklist helper
  dot_local/share/groundwork/commands.tsv  # source for groundwork-help
  dot_local/share/groundwork/raycast-extensions.tsv
                                      # source for raycast-extensions
  vscode-extensions.txt.tmpl           # VS Code / Cursor extension list
  Library/.../Code/User/               # VS Code settings + snippets
  run_*.sh.tmpl                        # install/setup scripts, run in numeric order
```

In short: managed configs live under `home/dot_config/`; the `home/run_` scripts do installs and machine setup; global AI standards are in `AGENTS.md`; and `new-project` (installed to `~/.local/bin`) scaffolds per-repo AI guides.
