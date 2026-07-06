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
- [ ] Groundwork Twelve: revisit week content and time estimates after the
      first real learners run it end to end.
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
      operating notes in `PLAYBOOK.md`. Dependency Dashboard live (issue
      #5); the ubuntu 26.04 bump is queued there under the cooldown.
- [x] Dependabot version updates removed (`dependabot.yml` deleted, its PR
      closed) and Dependabot security-update PRs disabled; alerts stay on
      as Renovate's data source (2026-07-03).
- [x] Code scanning enabled via CodeQL default setup (2026-07-03).
- [x] Secret scanning with push protection confirmed enabled.
- [x] Security-PR automerge enabled, aligned with roost (2026-07-04) — the
      earlier difference was drift, not policy; shared policy for the
      future `renovate-config` preset (`PLAYBOOK.md`, Dependency Updates).
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
- [ ] Cut v0.1.0 — first tagged release with user-facing notes.
- [ ] First Renovate PR reviewed and merged.
- [x] Repo is public; the release checklist became recurring hygiene
      (`PLAYBOOK.md`, Public Repo Hygiene).
