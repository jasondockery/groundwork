# Groundwork Roadmap

How Groundwork grows from here. `AI_THESIS.md` owns the north star,
`PLAYBOOK.md` owns operational maintenance, and this file tracks the
build-out. AI tools: keep these checkboxes current, and check a box only
after the work is verified, never aspirationally.

## Current execution order

Reconciled 2026-08-10 against `origin/main` at `256ada6`; `v1.14.0` is the
current release tag. Detailed acceptance criteria live in the specs; this list
is only sequence.

1. **Immutable, verified bootstrap releases.** Close the inspect-one-fetch /
   execute-another trust gap with tag-pinned bootstrap assets and published
   SHA-256 verification; keep a clearly separate rolling-`main` contributor
   path.
2. **Machine-readable installed-command receipts.** Add a versioned JSON schema and
   explicit exit-code contract across `update-all`, `groundwork-cleanup`, and
   `groundwork-doctor`, beginning with the structured update receipt below. CI
   validation receipts now establish the operational pattern but are not the
   user-command schema.
3. **Field-prove validator test economics.** Candidate selection, cadence,
   pending-state, wording, status, package-store, and Docker lifecycle matrices
   now use validator-only shell-isolated direct runners and clocks. One named
   hostile group proves the validator's 20-second fixture watchdog; policy
   matrices do not repeatedly pay for process-group polling. Focused suites have
   whole-suite deadlines below their CI safety timeouts; routine `full` has a
   300-second hard deadline with bounded TERM/KILL cleanup. Real time and processes
   remain only for deadlines, signals, escalation, lock contention, descendant
   drain, and process-group disappearance; there is no production timing
   bypass. Keep this open until five representative final-tree receipts establish
   `static` ≤55s, `update` ≤90s, `docker` ≤75s, `platform-macos` ≤15s, and
   `full` ≤270s, or create measured follow-up work for any honest miss.
   The exact-SHA `40fe3f9` hosted receipts established the first accepted
   baseline: static 188s, update 103s, Docker 125s, platform-macos 8s, full
   Linux 175s, and full macOS 304s. Preserve the platform lane and optimize the
   honest misses in measured slices. The first slice replaces the static
   settings editor's fixed PTY sleeps (100s in the accepted local receipt) with
   bounded semantic prompt and completion observation. A clean exact-commit
   Update receipt then measured 240s: its combined watchdog/matrix bucket was
   88s and the real deadline/process-tree group was 59s. Splitting the receipt
   boundary and moving only policy matrices to the shell-isolated direct runner
   reduced the same focused suite to 152s on the modified tree: watchdog 1s,
   read-only matrices 24s, and the retained real runtime group 60s. The suite
   still honestly misses 90s, so keep profiling the remaining real-runtime and
   launcher costs; next profile Docker tidy's real-runtime proof before changing
   it. Do not raise targets or replace runtime contracts with policy-only
   fixtures to obtain green timing.
4. **Fail-closed CI change classification.** Only after suite and receipt
   contracts stabilize: keep every required job visible, widen unknown/shared
   runner/validator/workflow/template changes to all suites, and permit an
   explained no-op only when the classifier explicitly proves a lane irrelevant.
   Then use timing evidence to decide whether PR Docker cache export should move
   to authoritative `main`/nightly seeding.
5. **`groundwork-doctor --performance`** — the bounded one-time snapshot only
   (see "Terminal observability"); not the watcher, status-line, or pane-border
   work yet.
6. **Read-only `groundwork-branches`** — the offline status table only; no
   deletion in the first tranche (see `specs/branch-lifecycle.md`).

Owner action (a human enables this when ready, not code work):

- [ ] Apply + verify branch protection on `main` with **zero** approving reviews
      (see PLAYBOOK → Main Branch Protection), AFTER `ci-gate` has reported
      green on `main` at least once so that single aggregate required context can
      be selected. Individual jobs remain visible for diagnosis. Direct-to-main
      with green CI is the sanctioned solo workflow until then — see PLAYBOOK →
      Working On `main`.

## Developer-tool operability audit

- [x] Manage Yazi's effective Unix/XDG configuration with developer dotfiles
      initially visible, the built-in period toggle intact, exact source
      diff/edit commands, fail-closed conflict handling, atomic apply/removal,
      full ancestor-chain rejection, and macOS/Linux applied parity. Hidden-aware
      `rg`, `fd`, `fzf`, and `eza` surfaces preserve ignores and exclude `.git`.
- [ ] Field-accept Yazi's managed effective configuration on macOS and Linux:
      developer dotfiles visible initially, the built-in period key hiding and
      restoring them, exact ownership/conflict behavior, idempotent reapply,
      and removal of only Groundwork-owned bytes. Static and isolated apply
      proof owns file semantics; a bounded operator receipt owns interactive
      rendering until a supported Yazi automation seam exists. Admitted
      receipts must be schema-validated, exact-clean-source-bound, and recorded
      by digest in `data/yazi-manual-acceptance-receipts.json`; the ledger is
      currently empty, so both platform acceptances remain open.
- [ ] Complete the separately owned machine-readable inventory tranche. It
      must discover every installer seam, retain genuinely package-specific
      ownership prose and dispositions, and bind each evidence claim to behavior
      the referenced command actually exercises. Do not fold the unfinished
      inventory into the urgent Yazi repair.
- [ ] Adopt only a future valid Compass authority-model and operable-tools
      successor in their own projection commit and proof boundary. Superseded
      `043568a`, `681c872`, and `f3e135d` identities remain historical evidence;
      they do not block independent Groundwork commits or releases.

## Review-derived product backlog (2026-07-31)

The automatic-maintenance review also surfaced useful work outside that safety
slice. These items are recorded here so they are neither silently accepted as
done nor lost in review prose.

### Supply chain and releases

- [ ] Publish each supported bootstrap script as an immutable release asset,
      publish its SHA-256 beside it, and document download → verify → execute
      from the same local bytes. Generate the current stable tag in docs rather
      than hand-copying it; retain a separate, explicitly rolling `main` path
      for contributors.
- [ ] After immutable release assets exist, add minimally permissioned,
      SHA-pinned OpenSSF Scorecard and build-provenance workflows. Attest
      immutable assets, run Zizmor against both workflows, and do not add a
      badge until the check is a real maintained gate.

### Agent-readable receipts and validation

- [ ] Extract the duplicated bounded byte-measurement/formatting and
      pending-state primitives into the installed Groundwork library surface.
      Prove launcher/runner/helper install order, direct-command behavior, and
      all rendered profiles before removing local copies; do not create a
      library merely to reduce line count.
- [ ] Specify receipt schema version 1 before adding `--json`: JSON alone on
      stdout, human diagnostics on stderr, stable stage/status enums, byte
      counts or explicit `null`, pending records, start/end times, and final
      exit code. Codify `0` success, `1` incomplete, `64` usage, `75`
      transaction busy, `124` deadline, and `129`/`130`/`143` signals.
- [ ] Add `--json` first to `groundwork-cleanup`, then
      `groundwork-doctor`, then the consolidated `update-all` runner; add
      hostile control-character fixtures so untrusted repository text cannot
      corrupt JSON or terminal receipts.
- [ ] Land and field-prove named validator suites and typed CI receipts:
      `static`, `update`, `docker`, and `platform-macos` own one canonical check
      registry; `full` composes their public CLIs in isolated subprocesses;
      receipts distinguish pass, skip, and fail and bind local proof to an exact
      content fingerprint. Focused CI, native macOS cask proof, exact-ID Docker
      disposal, the aggregate gate, and the nightly/manual Linux-plus-macOS
      matrix are implemented locally. Complete only after one pushed exact-SHA
      CI run and one non-cancelled exact-SHA full run prove the final contract.
- [ ] After Groundwork's receipt schema is field-proven, extract only the
      neutral receipt/fingerprint primitives into a small public shared utility
      repository. Specify compatibility and migration first; keep Groundwork,
      Roost, and renovate-config policies local, do not make renovate-config a
      general tooling package, and do not replace Roost's richer `CiReport`.
- [ ] After one final-tree receipt and one concurrency stress proof establish
      the validator-only clock/runner isolation, add a thin neutral
      multi-repository orchestrator outside these three repositories. It invokes
      Groundwork `full`, Roost `pnpm roo verify`, and
      renovate-config `pnpm verify` concurrently; preserves separate logs and
      statuses; cancels child process groups; aggregates exact-tree or exact-SHA
      identities; and reports wall-clock critical path separately from aggregate
      compute. Target no routine repo proof over five minutes and all three under
      five minutes wall time; treat the first five representative orchestrated
      runs as advisory baseline evidence. Do not use concurrency to conceal
      timing flakiness.
- [ ] Add exact-identity local proof reuse only after the shared contract covers
      repository, content-addressed index and working tree, command arguments,
      relevant configuration, toolchain or lock state, suite version, and
      platform. Keep any future pre-commit path staged-only under 10 seconds and
      pre-push affected-only under 2 minutes; never hide full, Docker, or network
      proof inside a hook.

### Maintenance repair UX

- [ ] After `v1.10.0`, add a manager-scoped repair surface such as
      `groundwork-cleanup --yes --only <homebrew|npm|pnpm>`. Specify and test
      selection, lock, pending-state, receipt, and hostile-argument behavior
      before implementation. The command must validate the manager before any
      side effect, run only that manager, preserve unrelated pending records,
      honor pnpm cadence unless `--force` is also explicit, and never present
      force as the routine retry.

### Discoverability and public proof

- [ ] Replace generic search titles such as “Overview” with standalone,
      outcome-first titles; canonicalize the homepage to one directory URL;
      add authored description overrides for the highest-value pages; and
      generate `og:image:alt` plus page-specific social cards.
- [ ] Generate `SoftwareSourceCode` metadata for the homepage,
      `TechArticle` and `BreadcrumbList` for teaching pages, and `FAQPage`
      only where the rendered page truly contains an FAQ. Keep generated head
      data in `scripts/generate-discovery`, never hand-maintained per page.
- [ ] Decide on a stable custom domain as an owner action. Only after that
      move add root-owned `robots.txt` and root `/llms.txt`; GitHub project
      pages cannot serve either at the domain root, so adding them now would
      be false progress.
- [ ] Produce a short self-hosted terminal demonstration of bootstrap →
      first prompt → `groundwork-help`, with transcript/captions and no
      tracking. Lead the homepage with Groundwork’s standalone outcome; place
      “Roost scaffolds your company’s code; Groundwork scaffolds you” directly
      below as relationship context, not as a dependency.
- [ ] Add a Decisions section to `docs/specs.html` that turns selected specs
      such as storage hygiene into readable essays, and create a distinct
      GitHub social-preview asset.
- [ ] Owner distribution pass after the above proof exists: Show HN,
      r/commandline, appropriate awesome lists, and consistent GitHub/profile
      links. Treat these as human publication choices, never automated repo
      mutations.

### Learning evidence

- [ ] Give each interest track a visible schedule and checkpoints appropriate
      to its actual duration, a definition-of-done checklist, and a short
      self-assessment rubric focused on explaining and verifying agent work.
- [ ] Add one “Verify it yourself” command-and-observation exercise to each
      tool page, generated/audited through the docs coverage model rather than
      pasted mechanically where it teaches nothing.
- [ ] Put a concise “what Groundwork is not” block on the docs homepage so
      readers understand the adult-learning, terminal-foundation, and
      non-gatekeeping boundaries before choosing a track.

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
- [x] Worktrees and parallel agents page (`docs/worktrees.html`): what a
      worktree is, the lifecycle, the surprises (untracked files aren't shared,
      one branch per worktree, `.git` is a file, stale metadata after `rm -rf`),
      and the concurrency model. Every command claim on the page was verified
      against a real throwaway repository, including Git's exact refusal text.
      Groundwork's default is recorded as binding in `AGENTS.md`: single-writer
      mode, read-only reviewers, no nested delegation without owner approval,
      never two concurrent writing agents in one worktree. The rule governs
      concurrency only — owner-directed work still lands the way it always has,
      reviewed uncommitted, with no mandatory branch or PR.
- [ ] Roost's half of the orchestration model (integration owner, lane
      worktrees, declared writable paths) still has to land in Roost's own
      `AGENTS.md` and `playbooks/README.md`. Groundwork describes the shape for
      contrast; it does not bind Roost, and this is not done until Roost says
      so in its own repository.
- [ ] Practice drill: directing a fast model through a spec queue across git
      worktrees, mirroring how Roost runs its implementation queue. The
      worktree page now carries the posture; this is the hours-long drill.
- [x] Key repeat as a setup choice (fast/standard/aggressive, fast default for
      anyone who is ASKED). A config predating the question keeps the legacy
      2/15 on macOS and is left untouched on Linux — "field absent" is not
      consent to a faster keyboard. Not asked on headless hosts, containers, or
      WSL2: key repeat belongs to the machine holding the physical keyboard,
      and there is nothing on the far end of an SSH or `docker exec` session to
      set. macOS applies via `defaults`. Linux applies via GNOME `gsettings`
      (persists) or falls back to `xset` (current session only, reported as
      such, since Groundwork does not own session startup); other compositors
      are told where to set it rather than being silently skipped.
- [ ] Key-repeat receipts still owed: the Linux paths are proven only against
      fixture executables in an isolated environment. Nobody has yet run this
      on a real GNOME session or a real X11 session, and no macOS logout/login
      has confirmed the applied values feel right. Fixture-green is not
      desktop-green.
- [ ] Per-desktop key-repeat adapters (KDE, sway/niri, Hyprland). Until these
      exist, a non-GNOME Wayland user is asked a question Groundwork can only
      answer with instructions, which the prompt now says outright.
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
      `origin/main`), and the `groundwork-configure` re-init wrapper shipped
      (`937ae11`; the reconfigure/regenerate model + source preflight landed in
      `62c30bd`). The first typed terminal receipt and bounded raw Homebrew logs
      now separate current/no-change, maintenance, owner review, preserved
      warnings, failure, and pending repair without hiding unfamiliar upstream
      warnings. Remaining: (a) promote that receipt to the durable structured
      stage schema, add elapsed/degraded facts and exact next actions, and make
      the console concise by default while the complete multi-stage log stays
      available; (b) elapsed-time heartbeat for
      long quiet Homebrew stretches and an `update-all --retry-failed` that
      re-fetches only failed casks at reduced concurrency; (c) required-vs-
      optional package classification with a stable exit contract (required
      failure fails the run; an optional cask failure degrades it); (d) temp-HOME
      + temp-XDG + local-bare-remote chezmoi integration tests (fresh init,
      idempotent re-init, drift does not clobber, run_once / run_onchange
      semantics) and stub-driven update-all failure/retry/hang cases. Keep each
      phase honest: no phase may swallow another tool's warnings, and the raw
      stream stays available under `--verbose`.
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
- [x] `groundwork-github-ssh` shipped (2026-07-26; raised the same day from a
      real field failure: GitHub SSH on port 22 stalled after TCP connect on
      the owner's network while HTTPS and `ssh.github.com:443` worked; the
      review-hardened rewrite landed the same day). `status` /
      `enable-443 [--yes]` / `revert-443 [--yes]`: transport probes that offer
      NO key or agent material (`PreferredAuthentications=none`) under a
      TERM→KILL watchdog, reporting timed-out honestly rather than claiming a
      proven post-connect stall, with authentication checked separately
      through the user's real SSH config (GitHub's success banner arrives
      with a nonzero exit by design); enable only on explicit consent
      (`[y/N]`, `--yes`, non-TTY refuses; never run from bootstrap, apply, or
      update-all); a Groundwork-owned snippet at
      `~/.ssh/groundwork/github-443.conf` that ends in a `Host *` scope reset
      (proven with real `ssh -G` parity: without it the stanza leaks onto the
      rest of the user's config), included via one marked begin/end block at
      the TOP of `~/.ssh/config` (first-value-wins), never ownership of the
      file; `StrictHostKeyChecking yes` with host keys for the
      `[ssh.github.com]:443` identity fetched over TLS from
      api.github.com/meta and required to match the fingerprints published in
      the same metadata, kept in a separate managed known-hosts file so the
      user's is never touched; a transactional enable (stage → backup →
      commit → verify effective values with the real parser → rollback trap
      on any failure) under a lock with post-lock state recheck; a per-field
      SHA-256 receipt under `~/.local/state/groundwork/github-ssh-443/`
      driving byte-exact revert only when config AND backup digests verify,
      surgical block removal otherwise, with user-edited managed files
      preserved as `.user-modified-*`, never deleted; partial/drifted
      installs refuse enable (fail closed, never adopted as baseline) and a
      healthy re-enable reconciles rotated GitHub keys after showing them.
      Fixture suite in `validate-groundwork` covers hostile args, non-TTY
      refusal, fail-closed metadata and fingerprint mismatch, per-port
      verdicts including the field case (22 dead, 443 alive), real `ssh -G`
      semantic parity on a complex config (globals, Include, aliases, Match,
      `Host *`), verbatim preservation, idempotence, key rotation, exact and
      surgical revert, tampered-backup fallback, duplicate-include safety,
      partial-install refusal, and lock contention. Deferred, honestly:
      `--json` output, CRLF-config fixtures, and pty tests for the
      interactive prompt states (the `--yes` and non-TTY contracts are
      fixture-proven; the prompt follows the interactive-cli-ux contract).
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
- [ ] Portable `tmux-behavior` Linux lane. The tmux copy suite is portable —
      tmux is Groundwork's cross-platform workspace layer — but it currently runs
      only inside `platform-macos` because that runner supplies a current tmux
      via Homebrew (the current Ubuntu runner's packaged tmux is below the feature
      floor the runtime contract asserts; the lane should inspect the installed
      version and decide, not rely on that staying true). Add a pinned Linux
      `tmux-behavior` lane (install or a purpose-built container with a supported
      tmux) so the portable copy / selection / history / buffer contract is proven
      on Linux, not just macOS, and test BOTH the minimum supported tmux AND a
      current tmux — that catches an accidental floor increase and a forward-compat
      regression, and both invoke the helper's own `--check-tmux-version` guard so
      the floor stays single-sourced. Keep the Homebrew cask-integrity audit where
      it is, inside `platform-macos`: a separate `homebrew-cask-integrity` check
      would mean a second macOS job (another runner) purely for a more granular
      green, which is not worth the cost — cask integrity legitimately belongs to
      macOS validation. `docker-build` can add a headless no-system-clipboard
      check that a tmux copy still lands in the tmux paste buffer; WSL2 and real
      Ghostty GUI clipboard/trackpad behavior stay periodic real-machine release
      receipts (a headless runner cannot prove them). Use a matrix only where a
      check genuinely needs both platforms.
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
      justified by an incorrect comment and is gone. The official Chrome stable
      and Beta casks genuinely ship `sha256 :no_check` (Google's updater owns
      the binaries): both stay OUT of the checksum-safe Brewfile. The profile
      renders the exact selected set into `Brewfile.browser`, the bounded lane
      installs it only after the checksummed bundle succeeds, and failure makes
      the next apply retry. Current/work select stable; preview selects Beta and
      retains stable as a fallback. The obsolete setup opt-in remains ignored
      compatibility input rather than a rendering failure.
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
- [ ] Complete the shared Renovate system acceptance contract: keep this
      repository's dependency-surface inventory machine-checked, accept the
      daily runner, weekly routine update/branch window, and effective five-day
      behavior on supported timestamped update surfaces from retained evidence;
      keep pins, digests, and manual lanes bound to their inventory controls; and
      require one eligible Groundwork PR with current artifacts and green CI.
      The canonical matrix and owner-gated canary live in
      `renovate-config/specs/renovate-system-acceptance.md`; a green runner scan
      is execution evidence only.
- [x] Dependabot version updates removed (`dependabot.yml` deleted, its PR
      closed) and Dependabot security-update PRs disabled; alerts stay on
      as Renovate's data source (2026-07-03).
- [x] Code scanning enabled via CodeQL default setup (2026-07-03).
- [x] Secret scanning with push protection confirmed enabled.
- [x] Security-PR handling reconciled to the shared preset (2026-08-13):
      vulnerability alerts bypass routine schedule, maturity, and rate limits,
      while automerge stays disabled and a human reviews and merges after
      required CI. This supersedes the 2026-07-04 automerge decision; shared
      policy lives in `renovate-config` (`PLAYBOOK.md`, Dependency Updates).
- [x] `workflow-lint` CI job added: zizmor (pedantic) audits the workflows,
      mirroring roost's job; existing findings fixed in the same change
      (2026-07-04). That original five-check layout was superseded on 2026-08-02
      by focused `static-linux`, `update-contract-linux`,
      `docker-contract-linux`, and `platform-macos` lanes plus the existing
      security/image lanes and final `ci-gate` (`PLAYBOOK.md`, CI Checks).
      Making only `ci-gate` required is the pending branch-protection owner
      action (`PLAYBOOK.md`, Main Branch Protection).
- [x] Shell-quality gate unified and pinned (2026-07-25): `scripts/lint-shell`
      runs `bash -n` + pinned shfmt + pinned ShellCheck over every tracked or
      non-ignored untracked Bash file; the validator's `static`/`full` suites and
      their CI lanes delegate to it. Tools are resolved by
      `scripts/ensure-shell-tools`
      (checksum-verified, cached, Intel/Arm × Linux/macOS), pinned in
      `tools/shell-tools.env`, and bumped by `scripts/update-shell-tool-pins`
      (deliberately not Renovate-auto-managed). See `PLAYBOOK.md`, Shell quality
      gate.
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
- [ ] Close the container lane's remaining unverified installs (reviewed
      2026-08-04). Everything around them is pinned — base image by digest,
      ShellCheck/shfmt by version plus per-arch sha256, casks under
      `--require-sha` — so these are the weakest link in the one environment
      `AI_THESIS.md` names as a first-class target:
      - `docker/install-headless-tools.sh` installs starship, mise, and uv via
        unpinned `curl … | sh`, and the `Dockerfile` fetches chezmoi the same
        way. No version pin, no checksum.
      - `install_antidote` clones `main` at `--depth 1`; `install_eza` fetches
        its apt signing key from a `main` branch URL. Both are mutable refs.
      - `download_release_asset` resolves `releases/latest`, so two builds of
        the same Dockerfile and context can install different versions.
      Needs a pin-plus-checksum store and a refresh command in the shape of
      `tools/shell-tools.env` + `scripts/update-shell-tool-pins`; picking
      versions by hand here would be inventing values, so it is tracked rather
      than half-done.
- [x] Cut the first tagged release with user-facing notes — shipped as
      v1.0.0 (the bootstrap + update path had already survived all three
      user surfaces, so v0.x was skipped).
- [ ] First eligible self-hosted Renovate PR reviewed, green in Groundwork CI,
      and merged; record it as consumer-compatibility evidence rather than
      inferring success from the shared runner receipt.
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
showed the result planned to upgrade `google-chrome` — one of the browser casks
`scripts/audit-brew-casks` deliberately keeps out of the checksum-safe
Brewfile. The safety
flag is a failure policy, not a candidate filter, so widening scope that way
either aborts the run or drags an excluded cask back under Homebrew management.
The lesson is recorded in `skills/system-update-orchestration`.

Do this work under `skills/safe-mutating-cli` and
`skills/system-update-orchestration`, red-proving every branch.

- [x] Homebrew ownership model (2026-08-04): Groundwork-declared packages only.
      The runner parses the exact formula/cask set from the rendered checksum-
      safe Brewfile before metadata refresh and reuses it for retry. Unmanaged
      Homebrew software and the vendor-updated Chrome browser lane are excluded.
- [x] Parse arguments before mutation in both launcher and directly invocable
      runner; `--help` reaches no sync, apply, or update command.
- [x] Reject unknown options and unexpected positional arguments in both layers;
      an apparent scope flag can never fall through to an ordinary refresh.
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
- [ ] **pnpm/Node ownership — the first instance of this class. Repository work
      landed 2026-07-27; NOT yet migrated on a live machine, so this stays open
      until the receipts exist.** Groundwork shipped a global `pnpm = "latest"` through mise,
      which competed with the pnpm every repository pins in `packageManager`.
      PATH order decided the winner silently: a newer pnpm meeting an older pin
      self-managed a download of it, nested Turbo/package-script children
      re-resolved bare `pnpm` from PATH and could land elsewhere, and the
      standalone mise build carries its OWN Node, tripping `engines.node` while
      the correct Node was on PATH. No error named any of it — an interactive
      shell, an agent shell, and CI simply disagreed. Ownership is now **mise
      owns Node; Corepack owns pnpm**, selecting each repo's pinned version.
      Shipped: `pnpm` removed from the managed mise tools plus
      `node.corepack = true`; a pinned Corepack in
      `~/.local/share/groundwork/node-toolchain.env` (Node 25 dropped the
      bundled copy, so the pin is required, not decorative); an every-apply
      converger (`run_after_15-pnpm-corepack.sh`) that installs Corepack into
      the ACTIVE Node with `--install-directory`, proves a **bare** `pnpm` on
      the prospective PATH, and only then removes the mise pnpm — restoring it
      and saying what it cannot restore if the proof fails;
      `groundwork-doctor --node-toolchain`; and a validator fixture proving a
      nested package script resolves the same pnpm and Node as its parent (and
      that a competing pnpm it builds itself still shadows, so the fixture
      cannot pass while the model is broken). The doctor also reports a
      configured pnpm global-tool directory outside PATH and routes project
      tools to devDependencies while personal cross-project CLIs use mise's
      `npm:` backend through an unmanaged `conf.d` file.
      Still required before this closes: the live migration on a managed
      machine, plus receipts for `groundwork-doctor --node-toolchain`, the full
      validator, bare `pnpm roo verify`, `lefthook run pre-commit`, and
      parent/child Node+pnpm paths. Also unproven: the Node 25+ path (no Node 25
      install exists here to exercise `node.corepack = true` followed by the
      pinned userland Corepack install) — it is designed and pinned, not
      demonstrated.
- [ ] Generalize the doctor's pnpm provenance logic to the other managed
      commands. `--node-toolchain` now resolves mise shims through
      `mise which`, collapses candidates to distinct OWNERS (a shim and the
      binary it dispatches to are one authority, not two), and classifies by
      structural path before content — a compiled pnpm contains the string
      "corepack" in its embedded JS, so a naive content grep reports a
      standalone binary as Corepack-backed. Those three rules are what the
      generic shadowed-install report above needs; lift them rather than
      re-deriving them per tool.

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

## Herdr/tmux multiplexer acceptance

Groundwork supports four explicit states: Herdr, tmux, both with Herdr primary,
or neither. Source fixtures prove package/config selection, ownership-safe apply
and removal, and no automatic nesting on macOS and Linux. Keep this audit open
until the installed runtime behavior is exercised on both supported platforms.

- [x] Fresh-install selection, legacy-tmux preservation, Homebrew selection,
      ownership-safe Herdr config, explicit integration lifecycle, completion,
      launcher, docs, and hostile source/render fixtures.
- [ ] macOS manual acceptance with a Homebrew Herdr install: launch, active
      config warning check, detach/reattach with a live process, Claude/Codex
      hook install/status/uninstall, server-restart recovery, choice changes,
      and removal without deleting sessions or user-owned config.
- [ ] Linux manual acceptance on one supported Homebrew bottle architecture
      with the same matrix. Record exact Herdr/Homebrew/OS versions and keep the
      result platform-scoped; source rendering alone is not runtime parity.
- [ ] Promote the manual runtime checks into a bounded automated lane only when
      Herdr exposes a stable noninteractive acceptance seam. Do not add a second
      package source or an unbounded pseudo-terminal driver just to claim it.

## Terminal copy model: Ghostty + tmux coherence (Slice B)

Full design in `specs/terminal-copy-model.md`: keyboard-first, mouse-assisted —
one documented owner for selection/history/search/copy per context (Ghostty
outside tmux, tmux inside), the mouse a convenience, not a second workflow.
Implement under `skills/terminal-interaction`.

- [x] Owner approved the product decisions (2026-07-23); implemented and merged
      (`859dcfe`, review-hardened in `8d7e517`).
- [x] tmux: drag-release quick-copy (amended 2026-07-26 — the original
      persistent-selection decision silently broke drag-then-Cmd+C; keyboard
      copy mode and Shift+drag unchanged), conditional right-click (hint in shell
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
- [ ] Finish the teaching surface: `tmux.html` (copy-model section, now
      including drag-release quick-copy and its conditionality inside
      mouse-aware apps), the cheat sheet, a practice copy drill, and
      `claude.html` (the `Ctrl+O` → `[` transcript route, which is the correct
      way to copy a conversation out of a self-redrawing TUI) are done;
      keyboard, command-line, troubleshooting, setup, and game-dev-learn
      Module 5, plus the full competency gates A/B, remain. Those pages carry no
      copy-model content today — they are unwritten rather than stale, so no
      reader is currently being taught the superseded model.
- [ ] **Owner: physical Ghostty drag→clipboard smoke** for the amended
      drag-release decision (2026-07-26). Fixtures now prove the binding, that
      the tmux paste buffer receives the selected text, that copy mode exits,
      and that a server carrying the OLD unbind converges on reload — but no
      headless run can prove the macOS clipboard actually receives a physical
      drag, or that `Shift`+drag still reaches Ghostty while an app requests
      mouse reporting. Smoke matrix: ordinary shell prompt; Claude Code default
      renderer; Claude Code fullscreen; Neovim or lazygit; and `Shift`+drag in
      each mouse-aware case. Until it runs, `specs/terminal-copy-model.md`
      records the physical smoke as pending, not shipped.
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
      Redact command arguments that may hold secrets. Add a bounded Docker
      subsection only when a backend is installed: identify the active Docker
      Desktop or Colima backend, whether its VM is running, configured CPU and
      memory, observed VM/swap pressure, and daemon disk summary. For work
      profiles, name `colima stop` when the VM is idle; for personal profiles,
      document Docker Desktop resource-limit review. Never rewrite backend VM
      settings until a stable vendor-supported configuration surface exists,
      and measure before changing `mountInotify`, tmux history, or VM defaults.
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
