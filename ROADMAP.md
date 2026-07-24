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

- [ ] Update-orchestration slice (designed 2026-07-19 from a real noisy
      `update-all` transcript; the first tranche — drift preflight that
      stops before apply when no terminal can answer, the full apply and
      install hooks moved under the verified fresh runner, karabiner
      ownership, brew repair with a real outcome contract, targeted serial
      re-fetch of failed downloads, no-op chatter removal — shipped on
      `origin/main`). Item (c) below, the `groundwork-configure` wrapper, also
      shipped (`937ae11`). The
      remaining slice: (a) a phase-status summary at the end of every
      `update-all` — completed / degraded / failed per stage, what to run
      next, and a full log captured to `~/.local/state/groundwork/logs/`
      with only concise output on the console by default; (b) elapsed-time
      heartbeat for long quiet Homebrew stretches and an
      `update-all --retry-failed` that re-fetches only failed casks at
      reduced concurrency; (c) a `groundwork-configure` wrapper that owns
      the re-init UX — show current answers, explain new questions and their
      consequences, preview the resulting diff, then apply — so no user ever
      needs to reason about raw `chezmoi init` semantics; (d) required-vs-
      optional package classification with a stable exit contract (required
      failure fails the run; an optional cask failure degrades it);
      (e) temp-HOME + temp-XDG + local-bare-remote chezmoi integration tests
      (fresh init, idempotent re-init, drift does not clobber, run_once /
      run_onchange semantics) and stub-driven update-all failure/retry/hang
      cases. Keep each phase honest: no phase may swallow another tool's
      warnings, and the raw stream stays available under `--verbose`.
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
- [ ] Shell runtime adoption receipts (docs label these provisional until this
      lands; on Ubuntu/WSL2 `--revert` restores the recorded previous shell,
      commonly bash — not `/bin/zsh`): the validator drives
      `groundwork-shell-adopt` against fixtures (fake brew prefix, chsh, dscl,
      /etc/shells), which proves the logic but not real account records.
      Collect one receipt each on a fresh Apple Silicon Mac, an Intel Mac
      (`/usr/local` prefix), native Ubuntu and Ubuntu WSL2 (Linuxbrew
      `/home/linuxbrew/.linuxbrew` prefix), covering: migration from the OS
      shell, a second run (no duplicate `/etc/shells` line, no re-chsh),
      existing terminals versus new ones, `--revert` back to the recorded previous shell,
      Homebrew temporarily unavailable, and `update-all` actually upgrading
      the managed zsh. Also confirm `groundwork-doctor --shell` detects a
      login-shell/current-process mismatch on a real machine.
- [ ] tmux-copy-last release receipts: the validator drives the helper
      against a scripted tmux server, which proves selection logic but not
      real environments. Collect one receipt each on macOS, native Linux,
      and Ubuntu WSL2: prefix+Y after a completed command, during a running
      command (must copy the previous completed one), in an ssh pane
      without OSC 133 marks (must refuse with guidance), and in a terminal
      without clipboard support (tmux buffer still works; note the
      clipboard is best-effort by design).
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
- [x] mise release cooldown (2026-07-14): `update-all` now runs `mise upgrade
      --minimum-release-age 5d`, the same 5-day floor the shared
      `renovate-config` preset applies to repo dependencies. It filters
      floating versions (`node = "lts"`, `pnpm = "latest"`) and exempts
      explicitly pinned ones, which is the escape hatch for a security fix
      that must land immediately. A mise too old to enforce the floor FAILS
      CLOSED: the runtime stage is skipped, the run exits nonzero, and no
      success timestamp is written — a policy that steps aside whenever it
      cannot be enforced is not a policy.
- [x] Homebrew checksum policy (2026-07-14): casks must carry a checksum at
      INSTALL as well as upgrade. `brew bundle` runs under
      `HOMEBREW_CASK_OPTS=--require-sha` (the user's own cask options are
      preserved, never replaced), and `update-all` runs `brew upgrade
      --require-sha` with no `--greedy` of any kind. Verified against the real
      inventory rather than assumed: every cask in the Brewfile is versioned
      and checksummed, the AI CLIs included — `claude-code@latest` is a faster
      release CHANNEL, not Homebrew's `version :latest` (which would force
      `sha256 :no_check`), so no unchecked "fast lane" exists and no
      `groundwork-ai-update` split is warranted. `--greedy-latest` was a no-op
      justified by an incorrect comment and is gone. The one cask that genuinely
      ships `sha256 :no_check` is google-chrome (Google's updater owns the
      binary): it is OUT of the Brewfile, installed only by an explicit
      setup-time consent prompt (default no), only after the checksummed bundle
      succeeds, and its failure is a real failure so the next apply retries.
      `scripts/audit-brew-casks` enforces both invariants across every
      conditional profile (work, password manager, game-dev) and self-audits
      the exception — it is a required macOS CI job, not a manual habit.
- [ ] Homebrew release-age floor (the one real remaining gap): Homebrew has no
      `minimumReleaseAge` equivalent, so formula/cask upgrades still take
      whatever is published — including the deliberately fast
      `claude-code@latest` channel. Checksums are enforced (above), but a
      compromised-yet-correctly-signed release is not delayed. Decide whether
      an age floor is even the right control here (versus pinning to the
      stable `claude-code` cask), and if so, evaluate a release-date source —
      Homebrew's API does not reliably expose per-version dates, so this needs
      building. Keep `docs/dependencies.html` accurate about which paths are
      age-gated and which are only checksum-gated.
- [ ] `groundwork-doctor` — untrusted Homebrew taps module: Homebrew now
      enforces tap trust by default, and untrusted taps degrade loudly or
      quietly depending on the path — broad operations (upgrade, bundle)
      warn that a tap was skipped, while directly requesting one of its
      formulae fails explicitly. Either way a tool from an untrusted tap
      stops updating (seen 2026-07-13 on the work machine with
      `anomalyco/tap` and a leftover `opencode-ai/tap`). Detect and inform,
      never auto-trust: report the enforcement mode
      (`HOMEBREW_NO_REQUIRE_TAP_TRUST` unset/set), each installed tap's
      trust state across all four scopes (tap, formula, cask, command),
      and name the installed packages that came from each tap. Print exact
      scoped commands (`brew trust --formula <tap>/<formula>` and cask/
      command equivalents). Recommend `brew untap` only after proving no
      installed formula, cask, command, or dependency still belongs to the
      tap. Groundwork's own Brewfile uses only core/cask, so any untrusted
      tap is user-added or leftover — the doctor reports; the owner
      decides.
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

- [ ] Docs sidebar/nav modularity (flagged 2026-07-16): every page in
      `docs/` carries its own copy of the sidebar, and the validator only
      enforces that the copies are byte-identical (active marker aside).
      That guards drift but multiplies every nav edit across ~50 files.
      Make the sidebar a single generated source (one fragment the pages
      are rendered from, or a generator that stamps it into every page)
      with the validator enforcing no-drift against that source. Honest
      status: duplication is guarded today, not modular; no refactor has
      been started.

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

## Bounded, honestly-labeled operations

Carried over from a field-hit in the Roost sibling on 2026-07-19: an unbounded
child process with buffered output sat silent for roughly fifteen hours and was
initially reported as a slow pass. The principles transfer; Roost's TypeScript
runner and its exact timeout values do not. `AGENTS.md` now states the rules —
these are the implementations that make them real.

- [x] Explicit `timeout-minutes` on every CI job (2026-07-20). Previously zero
      jobs declared one, so a hung job burned GitHub's 360-minute default
      before failing. This is last-resort protection, not an operation bound.
- [ ] Audit every finite external operation for a declared deadline,
      cancellation, and recovery command: `brew update`/`install`/`bundle`/
      `upgrade`, `mise install`/`upgrade`, chezmoi init/render/apply, git
      clone/fetch/submodule, release-asset downloads and metadata checks, and
      the macOS defaults pass. Report progress while waiting; a silent wait is
      the failure mode.
- [ ] Build a bounded runner usable from the earliest bootstrap stage. It must
      not assume GNU `timeout`, Homebrew, or Node — none are guaranteed at that
      point — and it must be tested on macOS, where this repo has already been
      bitten by GNU/BSD `stat` differences. Distinguish hard deadline (abort),
      stall threshold (diagnose, do not kill), and performance budget (report).
- [ ] Make a failed or timed-out bootstrap unable to report the machine ready.
- [ ] Validate every rendered profile, not the template source: render each
      supported combination, format it under the target environment, then check
      syntax, package/cask policy, and semantic invariants. Do not rely on byte
      parity across differing formatter configurations, and leave headroom under
      any line limit rather than targeting the cap exactly.
- [ ] Split deterministic profile validation from live Brew/mise smoke. The
      normal gate should use fixture metadata and command construction with no
      live registry dependency; the live lane runs on a schedule or by dispatch
      with explicit deadlines. Do not weaken checksum or supply-chain rules to
      make the live lane faster.
- [ ] Add a raw-byte NUL scan over tracked and non-ignored untracked files
      (shell, chezmoi templates, TOML, Markdown, YAML, extensionless commands).
      A literal NUL makes a file read as binary and vanish from diffs. Use exact
      file-level binary exceptions, not directory exemptions. Verified
      2026-07-20: only `docs/assets/social-card.png` is legitimately binary.
      The scanner must red-prove itself before its result is trusted: a
      temporary positive-control file containing a literal NUL must be detected
      and a text control must not, and the check fails if the positive control
      goes undetected. Enumerate paths NUL-delimited and inspect raw bytes;
      never represent a NUL inside a shell variable or a grep pattern. Verify
      each declared exception still exists, is a regular file, still contains at
      least one literal NUL, and carries a recorded reason. "Still binary" is
      the wrong invariant: a file that stays binary but loses its NUL bytes
      becomes a stale exception that silently widens the guard.
      This requirement exists because a first attempt at this scan on
      2026-07-20 reported 198 of 200 files as containing NUL bytes — the
      pattern had collapsed to the empty string, matching everything.

## update-all: honest scope and receipt

`update-all` upgrades what Groundwork's safe lane covers and leaves
self-updating applications to their vendors — a defensible policy reported
dishonestly. It prints skipped casks and then `Groundwork tools refreshed.`,
which reads as "nothing remains outdated" when three things do. That is the
same class of defect as a piped command reporting exit 0: a receipt claiming
more than the run proved.

A first implementation attempt on 2026-07-20 was reverted before commit. It
combined `--require-sha` with `--greedy-auto-updates`, and a real dry run
showed the result planned to upgrade `google-chrome` — the one cask
`scripts/audit-brew-casks` deliberately keeps out of every Brewfile. The safety
flag is a failure policy, not a candidate filter, so widening scope that way
either aborts the run or drags an excluded cask back under Homebrew management.
The lesson is recorded in `skills/system-update-orchestration`.

Do this work under `skills/safe-mutating-cli` and
`skills/system-update-orchestration`, red-proving every branch.

- [ ] Decide the ownership model and make name, help, implementation, and
      receipt agree: Groundwork-declared packages only, or every eligible
      Homebrew-installed package. An unqualified `brew upgrade` is the latter,
      while the help says the former.
- [ ] Parse arguments before any mutation, in BOTH the launcher and the runner.
      The runner currently has no parser and is documented as directly
      invocable; a direct `--help` must not run `chezmoi apply`.
- [ ] Reject unknown options AND unexpected positional arguments in both layers.
      `update-all --greedy` currently runs an ordinary refresh and silently
      ignores the flag.
- [ ] Add `--include-self-updating-casks` (macOS only; explicit off-platform
      behavior, never a silent no-op). Build an explicit checksummed candidate
      token list; never pass a global greedy flag and expect `--require-sha` to
      filter. Keep `--greedy-latest` and bare `--greedy` banned.
- [ ] Bulk-query cask metadata once (`brew info --json=v2 --cask <tokens...>`)
      rather than one process per token, and record these calls in the
      bounded-operation audit above.
- [ ] Replace the final line with a receipt whose buckets match what was
      established: no-longer-outdated, intentionally excluded (with the specific
      reason: self-updating, no checksum, `:latest`, pinned, disabled), still
      outdated unexpectedly, classification unavailable, receipt incomplete.
      Compare before/after against the exact upgrade scope, never a broader
      `--greedy` view. Never convert an unknown state into "vendor-owned", and
      never let a failed state query become an empty successful one.
- [ ] Label the cask bucket as casks. It is not a receipt for formulae, mise,
      and every other stage; a comprehensive receipt needs structured status
      from each stage and is a larger follow-up.
- [ ] Drop hardcoded vendor claims from help. Checksum and auto-update status
      are per-run facts, not durable documentation.
- [ ] Add reusable fixture helpers so these are cheap to assert repo-wide:
      `assert_command_has_no_side_effects_on_help`,
      `assert_invalid_args_fail_before_mutation`,
      `assert_retry_command_matches_initial_scope`,
      `assert_receipt_contains_incomplete_observation`.

## Detect shadowed installs of Groundwork-managed tools

Field-hit 2026-07-20: a work machine that had installed opencode before
Groundwork kept getting `Error: agent coder not found`. Cause: a pre-Groundwork
Go-era `opencode` binary was earlier on PATH than the Homebrew 1.18 Groundwork
installs, and it read an old-format config whose agents were named `coder`.
Groundwork had done nothing wrong — it installed alongside and never touched the
user's config — but nothing told the user two binaries were competing, so the
error looked like a Groundwork bug.

`groundwork-doctor` cannot currently see this: every probe uses `command -v`,
which returns only the first match.

- [ ] Report duplicate installs of Groundwork-managed tools: run `command -v -a`
      (or `which -a`) per managed command, and when more than one exists, name
      every path, say which one wins, and say which one Groundwork installed.
- [ ] Never auto-remove the other install. A pre-Groundwork binary may be
      deliberate, and deleting it can orphan a configuration the user still
      wants. Report, explain, and let the owner decide — the same rule as
      unmanaged Homebrew packages.
- [ ] Where a shadowed tool has a known legacy config path, name it so the user
      can see their old settings were preserved rather than lost. The old
      opencode used `~/.opencode.json`; the current one uses
      `~/.config/opencode/`, so the two never collide.
- [ ] Cover the reverse case too: a Groundwork-managed command that is missing
      from PATH entirely because another installer removed or shadowed it.

## chezmoi interview UX: navigable choices and re-run clarity

Full design and acceptance contract in
`specs/interactive-cli-and-chezmoi-interview.md` (numbered menu preserving the
stored `profile_preset` contract, `chezmoi init --prompt` template-defaults
warning, cancellation-safe candidate transaction, existing-template
remediation). Procedures: `skills/interactive-cli-ux`, `skills/chezmoi-change`.

- [x] Numbered profile menu + dual-domain normalization + validator fixture
      (2026-07-23, `4bb48df`).
- [x] `groundwork-configure` selective reconfigure — menu, structured receipt,
      candidate diff, confirm, atomic promotion under a lock (2026-07-23,
      `937ae11`). Plus the reconfigure-vs-regenerate model: `update-all` runs a
      source-branch preflight before pull and nudges (never prompts) to
      `groundwork-configure` after a real regeneration (`62c30bd`).
- [ ] Remediate the existing bool/password-manager interview prompts to the UX
      contract (they still spell out `y/t = yes, n/f = no` instead of `[y/N]`).
- [ ] Full interview test matrix (fresh / existing-reuse / `--prompt` / EOF /
      cancel) with one real pty. The numbered-menu and `groundwork-configure`
      flows are covered; the raw `chezmoi init` interview states are not yet.

## Branch lifecycle: groundwork-branches (Slice A)

Full design and acceptance contract in `specs/branch-lifecycle.md` (independent
fact dimensions + disposition, `merged-pr-non-ancestor` over unproven
`squash-merged`, PR-cache contract, default-branch fallback chain,
compare-and-swap deletion, hardened recovery receipt). Implement under
`skills/safe-mutating-cli`; extend `skills/developer-workspace-navigation`.

Immediate relief SHIPPED on `origin/main` (`9fe06b8`): `branch.sort=-committerdate`,
`rerere.enabled`, and the `git branches` / `git gone` / `git recent` aliases,
with the git.html / cheat-sheet / command-catalog docs (`b8fec14`).

- [ ] Read-only offline status table (`--refresh` the only networked action).
- [ ] `plan-clean` / `clean` with race protection and the recovery receipt.
- [ ] Integrate branch health into `groundwork-repos`.

## Terminal copy model: Ghostty + tmux coherence (Slice B)

Full design in `specs/terminal-copy-model.md`: keyboard-first, mouse-assisted —
one documented owner for selection/history/search/copy per context (Ghostty
outside tmux, tmux inside), the mouse a convenience, not a second workflow.
Implement under `skills/terminal-interaction`.

- [x] Owner approved the product decisions (2026-07-23); implemented and merged
      (`859dcfe`, review-hardened in `8d7e517`).
- [x] tmux: persistent mouse selection, conditional right-click (hint in shell
      panes, pane menu on Option+right, forwarded to mouse apps), one native
      OSC 52 path (removed `tmux-yank` + its stale live-server bindings),
      `set-clipboard external`, `allow-passthrough` audited (kept for yazi, now
      pane-scoped via the `y` function), and a safe `prefix+C-y` cwd helper.
- [x] Ghostty settings: macOS `copy-on-select=false` + `selection-clear-on-copy`
      + `mouse-shift-capture=never` + `right-click-action=context-menu` (Linux
      keeps the selection convention); >= 1.3.1 floor; dropped the `term`
      override for `xterm-ghostty`.
- [ ] Migrate the Ghostty source to `config.ghostty`. Deliberately deferred —
      kept `config.tmpl` (same target path) to fix the platform bug without the
      risky legacy-target removal; the migration transaction in the spec is still
      to build.
- [ ] Finish the teaching surface: `tmux.html` (copy-model section), the cheat
      sheet, and a practice copy drill are done; keyboard, command-line,
      troubleshooting, setup, and game-dev-learn Module 5, plus the full
      competency gates A/B, remain.
- [ ] `groundwork-doctor --terminal` receipts. The effective-tmux-server + pty
      copy-model validation harness already ships in `validate-groundwork`; the
      doctor module does not.

## Terminal observability and performance diagnostics

Raised 2026-07-23 from machine-slowdown reports during long agent sessions. The
terminal CHOICE is settled: Ghostty stays the default (native macOS + Linux, text
config, modern protocols, strong tmux compatibility). The gap is EVIDENCE — a
system-wide `CPU 22% · RAM 73%` status bar cannot say whether pressure is
Ghostty, Claude/Node, tmux history, a language server, or total workload. Ghostty
before 1.3 had a real memory leak Claude Code was good at triggering (fixed in
1.3; 1.3.1 fixed a separate macOS mouse regression) — which is exactly why 1.3.1
is the floor and why the doctor must be able to distinguish causes rather than
blame the terminal. Two already shipped (`859dcfe`): dropped the
`term = xterm-256color` override (Ghostty's own `xterm-ghostty` terminfo is
richer; tmux sets `tmux-256color` inside), and lowered `history-limit` 100000 →
50000 as an AI-native scrollback bound.

- [ ] `groundwork-doctor --performance`: a bounded, timestamped snapshot — macOS
      + hardware, Ghostty/tmux/Claude/Codex/OpenCode versions, per-process RSS/CPU/
      threads/uptime for the terminal + tmux server + each agent tree, macOS
      memory pressure + compressed + swap, top-20 by RSS and by CPU, tmux
      history/panes, and any agent process no longer attached to a live pane.
      Redact command arguments that may hold secrets.
- [ ] `groundwork-watch --performance --duration <t> --interval <t>`: an explicit
      temporary recorder to bounded JSONL that stops on its own and prints a peak/
      growth summary (peak pressure, swap delta, largest RSS growth by process,
      orphan-agent count). Far better than remembering Activity Monitor after
      recovery.
- [ ] Status line: replace the raw RAM percentage with macOS MEMORY-PRESSURE
      state (green/warn/red — 73% allocated is not itself a problem), keep CPU and
      battery, add a cached active-agent count and a swap-rising warning, and go
      loud only when action is needed. Cache expensive process-tree walks (15–30s),
      never per-second.
- [ ] `btop` popup on a verified-FREE prefix key (btop is already in the
      Brewfile; `prefix+U` is taken by TPM update, so pick another) with an
      optional filter to Ghostty/tmux/claude/codex/opencode/node/LSP/build
      processes.
- [ ] Pane-border agent markers: a background-descendant count only when nonzero
      and a warning when a pane has orphaned/detached agent descendants — not
      permanent RSS/PID/thread columns that flicker.
- [ ] Document iTerm2 as the macOS DIAGNOSTIC fallback (mature resource monitors;
      attaches to plain tmux without `-CC`, which would hide the tmux skills) and
      kitty as the cross-platform fallback; Ghostty stays the default. Add the A/B
      procedure (quit Ghostty, reattach the same tmux session from iTerm2, compare
      pressure/swap/RSS) and a pre-reboot capture script to troubleshooting.
- [ ] Practice/Twelve: a drill on diagnosing system pressure (memory pressure vs
      raw %, swap, per-process growth, orphan agents) instead of staring at a
      percentage.

## Community showcase for the learning guides (later milestone)

Raised 2026-07-22 against the new FPS learn-dev page
(`docs/game-dev-learn.html`). Worth doing, but it is a real feature — a
discovery source, a scheduled Action, a moderation flow, and an analytics
choice — so it is roadmapped rather than bolted on now, per the substantial-work
rule. The trust-boundary and X-API notes are baked in here so nobody later
reaches for tweet-scraping.

- [ ] Discover projects by GitHub topic (e.g. a `groundwork-fps` topic authors
      opt into), never by scraping social posts. As of 2026-07 the X/Twitter API
      has no free tier and mention-search sits in Enterprise pricing (a
      time-sensitive fact — revalidate when this milestone is picked up rather
      than treating today's pricing as permanent); tweet-scraping stays off the
      table as a discovery source regardless.
- [ ] A weekly scheduled GitHub Action opens a REVIEW PR proposing showcase
      additions; it never auto-publishes. Community-submitted content is
      untrusted by default — the same trust boundary the guide itself teaches —
      so a human approves every entry before it appears on the page.
- [ ] Choose an analytics approach separately and privacy-first (cookie-free,
      e.g. Plausible or GoatCounter) if weekly traffic needs measuring; keep it
      independent of the showcase content pipeline.
