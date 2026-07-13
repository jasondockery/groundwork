# Groundwork Roadmap

How Groundwork grows from here. `AI_THESIS.md` owns the north star,
`PLAYBOOK.md` owns operational maintenance, and this file tracks the
build-out. AI tools: keep these checkboxes current, and check a box only
after the work is verified, never aspirationally.

## Learning path (the product)

- [ ] Overview arc reviewed and complete: what AI-native development is, the
      vibe-to-agentic arc, and why the fundamentals matter (reading, not
      setup).
- [x] Groundwork Twelve shipped (2026-07-06): the 12-week day-by-day path —
      84 days, weekday hours + Saturday builds, three day modes, agent
      restriction ladder, log-repo + skill-check + agent-examiner
      measurement (`docs/groundwork-twelve.html`). Internal pedagogy label:
      progressive learning.
- [x] Groundwork Twelve log scaffold (2026-07-06): `skel/twelve-log` with
      log/examiner/AGENTS.md templates, wired to the `new-twelve-log`
      helper (mirrors `new-wiki`).
- [x] Groundwork Twelve v2 (2026-07-06): full per-day structure for all 60
      weekdays (drill/new/do/log/agent slots), spaced drill recurrence named
      per day, and learning games woven in as drill alternatives.
- [x] Data & storage foundations page shipped (2026-07-06): relational vs
      document stores, hands-on SQLite and jq, agent-at-data safety rules
      (`docs/data.html`); Week 8 of Groundwork Twelve teaches it.
- [x] Groundwork Twelve v3 (2026-07-06): pace architecture — 12 gate-checked
      stages decoupled from the calendar; steady/committed/immersed paces
      with a pace picker on the page; an immersed-day template (two core
      sessions max, long drill/build/play blocks); per-stage "go deeper"
      content; and agent-as-scheduler (`syllabus.md` +
      `prompts/scheduler.md` in the log scaffold) for arbitrary daily hours.
- [ ] Groundwork Twelve: revisit stage content and time estimates after the
      first real learners run it end to end, at more than one pace.
- [ ] Invent the missing learning games: no good game exists for tmux or for
      agent direction. Prototype an agent-as-game-master terminal quest — a
      `skel/` with AGENTS.md gamemaster rules that generates dungeons
      (folders, files, git states) in a scratch repo and grades solutions.
- [ ] Quick wins: a first successful session plus a couple of short practice
      drills that produce something real fast.
- [ ] Interest tracks: browser FPS, Unity FPS, web project, app, and
      generative media pipeline. Make one track excellent before widening.

## Environment and agent-direction lessons

- [ ] "Keep code out of iCloud, OneDrive, and Dropbox paths" lesson in the
      environment setup docs. A synced folder cost the Roost project a real
      outage; Groundwork teaches the human half, and the roost doctor check
      covers the machine half.
- [ ] Practice drill: directing a fast model through a spec queue across git
      worktrees, mirroring how Roost runs its implementation queue.
- [ ] Verification habits page: what proof to run before claiming done, when
      to run it, and how to read the results.
- [ ] AI-native prompt lesson: why the prompt shows the repo-relative path
      on every line (pasted snippets carry context agents can use), and how
      Claude Code's statusline can run Starship so the agent status bar and
      the shell prompt share one config.
- [x] Project session recipes: sesh config template in the dotfiles
      (`~/.config/sesh/sesh.toml`, prefix T switcher) with per-project
      startup commands (2026-07-04). Follow-up lesson page teaching the
      pattern: repos own commands, your tools own the layout.

## Setup and machine health

- [ ] WSL2 release receipt: emulated WSL fixtures in the validator prove
      detection logic, not real WSL behavior. Each significant WSL-affecting
      change should get a small smoke pass on a real WSL2 Ubuntu LTS:
      install, `chezmoi update`, `update-all` (including an interrupt),
      `code .`, a repo under `~/code`, and a repo under `/mnt/c` rejected by
      `new-project`. Also verify on the real machine: the exact
      `/proc/sys/kernel/osrelease` string classifies as `wsl2` (including
      older `microsoft-standard` kernels without a `WSL2` suffix), a custom
      kernel lands in `wsl-unknown` and `update-all` fails closed before
      touching Homebrew/mise/timestamp, and the actual filesystem type
      reported by `findmnt -T /mnt/c` (expected `drvfs` or `9p`) for the
      mount-guard task below.
- [ ] Mount-backed Windows-drive guard in `new-project` (WSL): the current
      guard canonicalizes `..`/symlinks in existing components and matches
      the default `/mnt/<drive>` automount root lexically. Harden it to
      inspect the actual mount: resolve the nearest existing parent of the
      target, then use `findmnt -T <path> -n -o FSTYPE` (fall back to
      `/proc/self/mountinfo` when findmnt is absent) and reject Windows-backed
      filesystems (`drvfs`, `9p` — confirm exact names on the real WSL2
      receipt first; do not bind names untested). This also covers custom
      automount roots from `/etc/wsl.conf` (`automount.root`, e.g. `/c`)
      and symlinks that point into a Windows mount. Add validator fixtures:
      a fake `findmnt` returning `drvfs`/`9p`/`ext4`, a symlink into the
      rejected mount, and a custom-root path; keep the existing lexical
      tests as the no-findmnt fallback proof.
- [ ] Distro CI coverage: Ubuntu LTS is the primary tested Linux path
      today; Debian stable and Fedora stable are documented as targeted,
      not supported, until this lands. Add container jobs (`debian:stable`,
      `fedora:latest` pinned to the current stable) that install the
      bootstrap prerequisites, run `chezmoi init`/`apply` headless with the
      docker profile answers, and run `scripts/validate-groundwork`.
      `groundwork-distro --family` is the seam for any prerequisite
      differences (apt vs dnf bootstrap hints only — never OS upgrades).
      When a distro's job is green, promote its wording in AGENTS.md and
      docs/platforms.html from "targeted" to "supported"; that promotion is
      part of this task, not a separate cleanup.
- [ ] `groundwork-doctor` — stale distro metadata module on Linux/WSL2:
      `update-all` deliberately never runs `apt`/`dnf`/`pacman` (the OS
      belongs to the distro, not Groundwork); the doctor can detect stale
      package metadata and print the exact recommended command without
      executing it.
- [x] `groundwork-doctor` — command shipped 2026-07-12 with its first module,
      Docker machine health (daemon reachability, log rotation, containerd
      image store, `docker system df`, leftover containers/images/volumes
      with owner-scoped cleanup guidance; read-only throughout).
- [ ] `groundwork-doctor` — competing-app detection (designed 2026-07-12):
      a read-only report of functional conflicts between what Groundwork
      installs and what else is on the machine. Detect and inform, never
      act: the thesis makes tools choices, not purity tests, so the doctor
      never uninstalls, disables, or nags about alternatives — it only
      surfaces collisions the user hasn't discovered yet, each with what
      breaks, the choice, and a docs link. Categories and examples:
      version managers (mise vs nvm/pyenv/asdf/volta shim fights — a real
      one: pyenv upgrading alongside mise on an owner machine, silently),
      launcher hotkey (Spotlight still owning Cmd-Space beside Raycast),
      keyboard remappers (Karabiner vs BetterTouchTool/Hammerspoon ghost
      keystrokes), SSH agents (multiple claimants to SSH_AUTH_SOCK),
      window managers (Rectangle/Magnet/AeroSpace/yabai hotkey overlap),
      shell frameworks (oh-my-zsh remnants double-sourcing beside
      antidote/starship). Runs on demand and once at bootstrap end;
      update-all mentions it only when it finds something — never on
      every apply, or it becomes noise people learn to ignore. Ships
      with a troubleshooting-page section; the existing per-page conflict
      prose (apps.html Spotlight fix, shell.html nvm/pyenv note) links to
      it. Release-affecting when it lands. Sibling note: Roost's doctor
      covers repo/machine checks for its monorepos; this one covers the
      personal machine — same detect-and-inform posture, no shared code
      required.

## Roost integration points (optional on-ramps, not dependencies)

These unlock as the Roost roadmap advances (see roost
`playbooks/x-roadmap.md`). Each stands alone; Groundwork never requires
Roost.

- [ ] Quick-win page: scaffold your own monorepo with `roo init` (after
      Roost Phase 3).
- [ ] Adult-beginner AWS on-ramp: accounts, OIDC versus long-lived keys,
      resource tags, and stages (alongside Roost Phase 4).
- [ ] Full interest track: build and host your own platform on Roost (after
      Roost Phase 5).

## Operations

- [x] Renovate configured: hosted app (Interactive mode), `renovate.json`,
      operating notes in `PLAYBOOK.md`. Migrated 2026-07-08 to the
      self-hosted runner + shared preset in `renovate-config` (hosted app
      retired; dashboard is now issue #6, where the ubuntu 26.04 bump is
      queued under the cooldown).
- [x] Dependabot version updates removed (`dependabot.yml` deleted, its PR
      closed) and Dependabot security-update PRs disabled; alerts stay on
      as Renovate's data source (2026-07-03).
- [x] Code scanning enabled via CodeQL default setup (2026-07-03).
- [x] Secret scanning with push protection confirmed enabled.
- [x] Security-PR automerge enabled, aligned with roost (2026-07-04) — the
      earlier difference was drift, not policy; shared policy now lives in
      the `renovate-config` preset (`PLAYBOOK.md`, Dependency Updates).
- [x] `workflow-lint` CI job added: zizmor (pedantic) audits the workflows,
      mirroring roost's job; existing findings fixed in the same change
      (2026-07-04). CI is now four required checks (`PLAYBOOK.md`, CI
      Checks).
- [x] Versioning decided (2026-07-04): SemVer tags + GitHub Releases,
      v0.x during testing, 1.0.0 when bootstrap + update survive all three
      user surfaces unaided (`PLAYBOOK.md`, Versioning & Releases).
- [x] Headless installer verifies release-asset sha256 checksums where the
      upstream publishes them (atuin, lazygit, sesh); zoxide and delta ship
      none today and are logged as unverified (2026-07-06).
- [ ] Raise the headless installer's supply-chain lane from checksums to
      GitHub artifact attestation (`gh attestation verify`) for upstreams
      that publish attestations (atuin documents this); needs `gh` in the
      build image, so weigh the image-size cost when picking it up.
- [x] Cut the first tagged release with user-facing notes — shipped as
      v1.0.0 (the bootstrap + update path had already survived all three
      user surfaces, so v0.x was skipped).
- [ ] First Renovate PR reviewed and merged.
- [x] Repo is public; the release checklist became recurring hygiene
      (`PLAYBOOK.md`, Public Repo Hygiene).
