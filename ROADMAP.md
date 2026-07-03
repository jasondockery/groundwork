# Groundwork Roadmap

How Groundwork grows from here. `AI_THESIS.md` owns the north star,
`PLAYBOOK.md` owns operational maintenance, and this file tracks the
build-out. AI tools: keep these checkboxes current, and check a box only
after the work is verified, never aspirationally.

## Learning path (the product)

- [ ] Overview arc reviewed and complete: what AI-native development is, the
      vibe-to-agentic arc, and why the fundamentals matter (reading, not
      setup).
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

- [x] Renovate configured: hosted app, `renovate.json`, operating notes in
      `PLAYBOOK.md`.
- [x] Repo is public; the release checklist became recurring hygiene
      (`PLAYBOOK.md`, Public Repo Hygiene).
