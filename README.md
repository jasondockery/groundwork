# Groundwork

An AI-native Mac, Linux, and headless development foundation you can rebuild from scratch.

Groundwork preps the machine and teaches the workflow: bootstrap scripts, dotfiles, keyboard-first terminal habits, agent-ready project scaffolds, and AI-native development docs for learners and teams.

One command provisions a fresh Mac today; Linux/WSL and headless Docker paths share the same terminal layer while skipping macOS-only GUI pieces. The repo slug and product name are **groundwork**.

This repo is the complete, version-controlled source for the setup — every config, script, and install it lays down.

New here? Open `docs/index.html` in a browser. Groundwork explains what each tool and app is, why it's here, how agents fit into daily development, where to practice, and how to follow progressive development paths for Apple apps, web, Rust, Python, ML, and LLMs. `docs/` can also be served with GitHub Pages.

## Supported Platforms

| Platform | Status | What applies |
| --- | --- | --- |
| macOS desktop | Primary | Full terminal layer, Homebrew formulae, casks, App Store apps, selected macOS defaults, browser/app helpers |
| Linux / WSL2 | Terminal layer | zsh, Git, tmux, Neovim, shell tools, mise/uv, helper scripts; GUI apps and macOS defaults are skipped |
| Headless / Docker | Terminal layer | Non-interactive shell environment for agents, CI, and disposable dev containers; no GUI apps |

Groundwork uses one chezmoi source tree with a `headless` flag plus `.chezmoi.os` to render the right profile.

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

That script installs every Brewfile package, lays down all configs, and runs the setup scripts. Re-run later with `chezmoi update` (pull + apply) or `chezmoi apply` (apply local source).

Advanced users can override the clone URL, for example when using SSH:

```bash
GROUNDWORK_REPO_URL=git@github.com:jasondockery/groundwork.git bash /tmp/bootstrap-mac.sh
```

## Updating Later

`chezmoi update` runs `git pull` from this repo and applies the result. The public repo does not require GitHub login for normal pulls.

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
| Work machine? | `true` gates personal apps and Docker Desktop off this Mac |
| Headless / server profile? | `false` by default. Set `true` for containers, servers, and agent boxes with no GUI apps |
| GitHub username | Your own — sets your git identity, separate from the `jasondockery` repo address used for cloning |
| Name | git commits |
| Personal git email | |
| Work git email | blank if none |
| Code directory | default `~/code` |
| Reset existing configs? | `false` by default. Set `true` on an already-used Mac if old Neovim, tmux, zsh completion, or plugin state may compete with this setup. Moved aside to `~/.local/state/groundwork/reset/latest` |
| Password manager | `1password` / `bitwarden` / `none` |
| SSH signing key | the **public** key; blank to skip commit signing |
| Obsidian vault name | folder in iCloud Drive/Obsidian; default `my_obsidian_vault`, blank to skip |

## Finish-up checklist (the manual residue macOS requires)

- [ ] **Karabiner** — System Settings → Privacy & Security: approve **Input Monitoring** and the driver/**system extension**. (Enables Caps Lock = Esc/Ctrl.)
- [ ] **tmux** — open tmux, press `Ctrl+a` then `Shift+I` to install plugins (TPM). Plugins live under `~/.config/tmux/plugins/`; resurrect snapshots live under `~/.local/share/tmux/resurrect/`.
- [ ] **Apple Developer / Xcode** — for app signing, install Xcode if needed, open Xcode → Settings → Accounts, and sign in with the Apple Developer account. Let Xcode manage certificates/provisioning profiles when possible. Do not put certificates, provisioning profiles, or `.mobileconfig` profiles in dotfiles.
- [ ] **Password manager** — sign in, then turn on its SSH agent. Bitwarden: Settings → enable SSH agent. 1Password: Settings → Developer → Use the SSH agent. A signing key set above then signs your commits.
- [ ] **Bitwarden as default autofill (everywhere)** — the desktop app + CLI install automatically; the rest is one-time toggles macOS and iOS won't let a script set. Open the Bitwarden app and sign in first, or it won't appear as a provider.
  - **macOS + Safari**: System Settings → General → **AutoFill & Passwords** → turn **on** Bitwarden and turn **off** Passwords (iCloud Keychain). That makes Bitwarden the system provider Safari and apps use.
  - **Chrome / Dia** (Chromium): install the Bitwarden extension from the Web Store, sign in, pin it. Chrome's built-in manager is already disabled by the setup script (confirm at `chrome://policy`); for Dia, turn its built-in off in settings.
  - **Zen** (Firefox-based): install the Bitwarden add-on from addons.mozilla.org, sign in, then Settings → Privacy & Security → uncheck **Ask to save logins and passwords**.
  - **iOS / iPadOS**: install Bitwarden from the App Store and sign in, then Settings → General → **AutoFill & Passwords** → enable Bitwarden, disable Passwords. (Not a Mac — chezmoi can't set this one.)
- [ ] **Obsidian** — your vault lives at `iCloud Drive/Obsidian/<name>`. Right-click the folder → **Keep Downloaded** (or System Settings → iCloud → turn off "Optimize Mac Storage") so files stay local. Vim mode is enabled by Groundwork Obsidian defaults, so <kbd>Esc</kbd>, <kbd>j</kbd>/<kbd>k</kbd>, and normal-mode editing work in notes too. After first launch, **restart Obsidian once** so the auto-installed plugins load, then add your Claude API key (or local Ollama URL) to Smart Connections and Whisper. For AI chat over your notes, point Claude Code at the vault folder.
- [ ] **Ollama** (local AI) — launch Ollama once so it auto-starts on login (serves `localhost:11434`), then `ollama pull nomic-embed-text` for Smart Connections embeddings. In Smart Connections, pick the local Ollama embedding model; point Whisper at the local endpoint if you want speech fully offline too.
- [ ] **Raycast** — this is the app that should take over **⌘Space** from Spotlight. System Settings → Keyboard → Keyboard Shortcuts → **Spotlight** → change "Show Spotlight search" to ⌥Space (or uncheck it), then set Raycast's hotkey to ⌘Space (its onboarding offers to handle this). Run `raycast-extensions --open` to open the recommended Raycast Store entries: Browser Bookmarks, Anybox, Browser Tabs, GitHub, Homebrew, and VS Code/Cursor project openers. Turn on the built-ins Clipboard History, Window Management, Snippets, Calculator. For bookmark search, install Browser Bookmarks and enable Zen, Chrome, Dia, Safari, or whichever browsers you use in its Select Browsers setting. For live tab search, use Browser Tabs for Safari/Chromium-family browsers; Zen is Firefox-based, so treat Anybox plus Browser Bookmarks as the reliable cross-browser layer. If Raycast Settings only shows Anybox under **Applications**, the Anybox extension is not installed yet; run `raycast-extensions --tier core --open` or `open 'raycast://extensions/anybox/anybox?source=webstore'`. Copy the API key from **Anybox app → Preferences → General**. In Raycast Settings, expand the Anybox extension and select the **Search Links** command itself; its command preferences have the API Key field. Then set aliases/hotkeys for Search Links and Save Current Tab. Set window hotkeys for left half, right half, maximize, restore, and move to next display. Then create **Quicklinks** for daily links (`chatgpt`, `claude`, `work-mail`, `home-cal`…), prefixing `work-`/`home-` for your two contexts. chezmoi installs Raycast but does not reliably own its internal hotkey/extensions database — to reproduce a setup on another Mac, use Settings → Advanced → **Export** to a `.rayconfig` and **Import** it there.
- [ ] **Raycast AI** — optional. Do not enable it just to use this setup; launcher, clipboard, window management, Quicklinks, browser bookmarks, and Anybox search all work without Raycast AI. Turn it on later if you want to type questions to Claude/GPT/Grok from Raycast. The cleanest path is Raycast Pro: use Quick AI from the root search, AI Chat for conversations, AI Commands on selected text, and the model picker when you want Claude vs OpenAI vs Grok. The no-subscription path is bring-your-own-key extensions for ChatGPT, Claude, and Grok; run `raycast-extensions --tier ai --open` to find those Store entries.
- [ ] **BetterDisplay** — open it once, keep the menu-bar icon on, favorite the resolutions you actually use, and test brightness/DDC controls on external monitors. Teams should buy Pro licenses when relying on Pro or business-use features.
- [ ] **Anybox** (Mac App Store) — paid app, so open the **App Store** and buy/Get it once per Apple Account; the `mas` line only keeps it updated afterward. Pro/lifetime is worth it here: unlimited saved links and larger Anydock profiles make Anybox the durable link library instead of browser bookmarks. Run it as a **menu-bar icon** (not the floating Anydock), set **Quick Link** keywords for daily links, copy the API key for Raycast, and use **Anydock profiles** for the work/home split. Syncs via iCloud.
- [ ] **Default browser** — run `defaultbrowser` (no args) to list installed browsers, then `defaultbrowser zen`, and confirm the macOS dialog.
- [ ] **Zen sync** — Settings → Sync, sign in with a Mozilla account: bookmarks, history, logins, and open tabs sync across Macs. Note **Spaces (workspaces) don't sync** — recreate them per machine. chezmoi writes `zen.workspaces.wrap-around-navigation=false` into each Zen profile's `user.js`, so Space navigation stops at the first/last Space instead of wrapping around; restart Zen if it was already open.
- [ ] **Browser extensions** — run `browser-extensions` to see the Groundwork-managed list for Zen, Chrome, and Dia. Use `browser-extensions --browser zen --tier core --open` for the daily-driver baseline: password manager, uBlock, Anybox, and Obsidian Web Clipper. Use `browser-extensions --browser chrome --tier dev --open` when setting up testing/devtools. Browser extensions save/capture pages into Anybox and Obsidian; Raycast Store extensions make bookmarks, tabs, and Anybox searchable from Raycast. Privacy.com is included as a vetted service link, not a verified current browser extension.
- [ ] **Codex desktop app** (optional) — download from OpenAI or run `codex app`. (The Brewfile installs the Codex CLI, not the app.)
- [ ] **Work Mac only** — start the Docker daemon: `colima start`.

## Work vs personal

One repo, both machines. The `work` flag (answered at init) gates the work Mac:

- **Off work:** Claude Code, Codex, Cursor, OpenCode, Zed, Obsidian, Dia, Karabiner, Docker Desktop. (Chrome + Zen install on both machines.)
- **On work:** Docker becomes Colima + the Docker CLI (license-free). Confirm your employer permits the AI tools before enabling them there.

## Daily use

```bash
groundwork-help                     # show Groundwork commands, aliases, keys, and helper scripts
groundwork-help update              # filter the command catalog
scripts/validate-groundwork         # validate the repo before commit/release
browser-extensions --open       # open vetted browser add-ons for Zen/Chrome/Dia
raycast-extensions --open       # open recommended Raycast Store entries
chezmoi diff                 # preview pending changes before applying
chezmoi apply                # apply source -> home
chezmoi update               # git pull + apply
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
docs/                                  # this Groundwork (open docs/index.html)
scripts/validate-groundwork                # local validation mirrored by CI
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
    tmux/tmux.conf                     # tmux
    starship.toml                      # prompt
    mise/config.toml                   # runtime / tool versions
    karabiner/karabiner.json           # keyboard
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
