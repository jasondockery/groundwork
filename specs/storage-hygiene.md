# Storage Hygiene: what cleans automatically, what stays owner-run

Status: Homebrew cleanup shipped in v1.8.0; npm verify, the owner-run pnpm
tidy, and the doctor's storage report shipped in v1.9.0. The next
release makes supported pnpm pruning automatic on a durable cadence and adds
the consolidated `groundwork-cleanup` surface. This spec records the ownership
decisions so future cleanup work extends them instead of re-deriving (or
contradicting) them.

## The rule

`update-all` may automatically run **supported, bounded maintenance
operations** — the owning tool's own command, whose removal scope is
understood, whose removed state is reproducible, and which preserve
user-requested packages and user data — with a measured receipt. How
aggressive each one is is per-tool policy, stated below: npm `verify` is
conservative GC; `brew cleanup --prune=all` is deliberately aggressive but
bounded to reproducible state. Everything else is either an owner-run command
with an explicit consent flag, or a read-only report. Groundwork never
automatically removes user-requested formulae or casks, user data, VM files,
browser/application state, or repository-local project output. Within that
boundary, `brew autoremove` may remove orphaned dependencies no requested
package needs, and owner-confirmed commands may prune shared reproducible
stores — the guarantee is exactly as wide as the executable behavior, no
wider.

## The lanes

| Area | Lane | Mechanism |
| --- | --- | --- |
| Homebrew orphaned dependencies | automatic in `update-all` | `brew autoremove` after a successful upgrade (removes formulae no requested package depends on) |
| Homebrew old versions, locks, download cache | automatic in `update-all` | `groundwork-cleanup --yes` runs `brew cleanup --prune=all` after `autoremove`; consolidated receipt + per-stage pending record on failure |
| npm cache | automatic in `update-all` | `npm cache verify` (npm's own conservative GC), run from `$HOME`; `npm cache clean --force` stays owner-run |
| pnpm selected stores | automatic when due in `update-all` | `groundwork-cleanup --yes` consumes strict live canonical `groundwork-repos --strict --no-cache list` discovery, accepts exact repository pins only, resolves offline, and prunes standard or explicitly trusted stores on one machine-wide cadence |
| Package-manager report / exceptional pass | advanced | `groundwork-cleanup` is read-only; `--yes` runs due supported maintenance; `--yes --force` ignores pnpm cadence for eligible candidates and succeeds as a no-op when none exist; `--yes --clear-pending <stage>` acknowledges one intentionally unrepairable reminder without running cleanup |
| Whole pnpm store generations | report / owner-confirmed | unmatched real `v<major>` directories are reported for review and never raw-deleted; symlinks are reported but not followed |
| Docker ephemeral scratch resources | automatic in `update-all` | `groundwork-docker-tidy --automatic` uses canonical managed code and a verified local endpoint to enumerate only aged opted-in images and exited containers, re-check them, and remove by explicit ID; direct repair is `--yes`; no broad prune |
| Docker legacy tagged validation images | report / owner-confirmed | `groundwork-doctor --docker` reports old unlabeled test/review/verify/spike tags; it excludes `groundwork:latest` and never deletes |
| Docker stopped containers, dangling images, builder cache | owner-run | `groundwork-docker-cache-tidy` is daemon-wide, dry-run by default, and never invoked by `update-all` or an agent |
| Docker volumes | out of scope | never removed by Groundwork; a dangling volume can be the only copy of a database |
| Xcode device support / simulators | report only | doctor `--storage` points at Xcode Settings > Components and `simctl delete unavailable` |
| Legacy `~/.nvm` | report only | doctor `--storage` names the intent (mise owns Node) and defers the live-owner question to `--node-toolchain` |
| Parallels / VMs | report only | doctor `--storage` points at Parallels' own Reclaim; Groundwork never touches VM files |
| Project caches (`.turbo`, `node_modules`, `dist`, `target`) | out of scope | each repository's own clean command |

## Decisions worth remembering

- **Corepack selects pnpm per repository**, so there is no machine-wide
  "active" pnpm store. Automatic maintenance consumes the same live canonical
  discovery as repository navigation, with its cache disabled: false `.git`
  markers are rejected through read-only Git inspection, worktree policy is
  honored, hooks/fsmonitor are disabled, and no discovery cache is written.
  Every configured root must exist and each `find` traversal must finish
  successfully; partial output is discarded and acting mode records incomplete
  pnpm inventory without touching a store.
  Exact stable `packageManager` pins are resolved with Corepack networking
  disabled. Integrity suffixes are accepted, but prerelease pins are
  review-only for unattended maintenance. Ambient HOME selection is
  report-only, never an automatic fallback.
- **The automatic store root is allowlisted.** Standard pnpm roots are
  accepted. A custom parent becomes automatic only through an explicit
  `trusted_pnpm_store_root` entry in `repos.conf` or its local overlay. The
  configured root must be absolute after supported home expansion, so its
  meaning cannot change with the launch directory, and the selected store must
  be one direct `v<major>` child. Different majors
  selecting one canonical store make it review-only. Same-major selectors
  deterministically use the highest exact pin and the report lists all
  repositories sharing that store. Immediately before mutation, Groundwork
  passes the accepted parent explicitly with `pnpm --store-dir`; repository
  workspace configuration therefore cannot redirect the revalidation or prune
  after discovery.
- **Cadence is machine-wide and advances on successful no-op.** pnpm
  maintenance is due when no success exists, the machine-wide success is at
  least 30 days old, resolved automatic stores exceed 20 GiB and the last
  attempt is at least 7 days old, or a prior pnpm repair is pending. Pending
  repair overrides the retry floor. A newly discovered store can therefore
  inherit the existing machine-wide cadence; this simpler contract is
  deliberate, and the exact candidates remain visible in every report.
  Cadence reads the epoch stored inside its state file, not filesystem mtime,
  so backup restoration or copying cannot silently move the next due date.
  `--yes --force` advances no pnpm state when there is no eligible candidate;
  that is a successful no-op unless an existing pnpm pending record still
  requires repair.
- **Recovery guidance preserves the default boundary.** A later `update-all`
  is the normal retry for pending maintenance. `groundwork-cleanup --yes`
  retries maintenance without repeating upgrades and still honors pnpm
  cadence; `--yes --force` exists only to ignore that cadence deliberately.
  Neither route expands automatic cleanup into project data or whole-store
  retirement. A direct cleanup invocation owns its recovery footer. When the
  helper borrows the runner's existing transaction lock, it leaves generic
  recovery guidance to the runner so one invocation prints the hierarchy once.
- **Selection provenance is truthful, and a valid pin is enforced.** The tidy
  prints the nearest *observed* `packageManager` declaration when one applies
  (parsed with jq — repo-standard, Brewfile-shipped, `/usr/bin/jq` on current
  macOS; without jq the source is honestly "not determined", never guessed),
  and says plainly when none does, when it names npm/yarn, or when it is
  malformed (`pnpm@`, `pnpm@11`, `pnpm@garbage` are malformed, not weaker
  pins; the `+sha512…` integrity suffix is stripped before comparison). A
  valid pin that disagrees with the pnpm that actually resolved is launcher
  drift: the dry run warns, `--yes` refuses. `--yes` also re-queries
  `pnpm store path` and `pnpm --version` immediately before pruning and
  refuses if either moved after the report.
- **Discovery does not depend on the launcher.** The doctor sizes the known
  pnpm store roots (`$PNPM_HOME/store`, `~/Library/pnpm/store`,
  `~/.local/share/pnpm/store`) without executing pnpm, so old stores are
  found even when the selected pnpm is uncached offline or pnpm was removed;
  selection labeling is a separate, network-disabled query. Sibling `v*`
  discovery runs only under recognized generation roots — a custom store-dir
  never causes v-named siblings of an arbitrary parent to be misclassified.
- **Selected aliases deduplicate by canonical path.** Two accepted names for
  one selected store report once, and a selected store is reported directly
  whatever its original name. Unmatched-generation review is narrower: it
  inspects only real `v<major>` directories directly under a trusted root,
  reports symlinks without following or measuring them, and ignores malformed
  names.
- **npm resolves one way everywhere**: mise-managed npm first, PATH npm
  second, from `$HOME` — `update-all` and the doctor size and maintain the
  same cache, and the doctor names which provider answered.
- **Read-only and automatic paths never download a package manager.** The
  doctor, tidy dry run, and automatic cleanup discovery/prune path set
  `COREPACK_ENABLE_NETWORK=0`. An uncached repository pin becomes review
  guidance; maintenance never surprises the user with a package-manager
  download merely to clean a store.
- **Machine maintenance is single-writer.** `update-all`, its freshly applied
  runner, and direct `groundwork-cleanup --yes` share one atomic lock directory
  with PID, operation, start time, and token. Live owners fail a second run
  fast; dead owners are reclaimed. A freshly exec'd runner keeps the launcher's
  PID and adopts ownership of the same token. Only a direct cleanup child may
  borrow that lock, and it never releases the runner's transaction. Young
  incomplete lock metadata gets a short creation grace; old incomplete,
  dead-owner, and reused-PID locks are reclaimed only after the complete
  observed PID, start time, operation, token, and process-start snapshot is
  rechecked. Process start is recorded and compared under the `C` locale;
  failure to observe it aborts acquisition and removes the new empty lock.
- **The v1.9 handoff bootstraps the new lock dependency.** The v1.9 launcher
  synchronizes source and target-applies only the fresh runner. If that runner
  finds no lock library, it first confirms the supported platform, then
  target-applies and verifies only the synchronized lock helper with scripts
  excluded. Current launchers always target-apply and verify both runner and
  lock helper, so future lock changes govern the same invocation.
- **Every failure is durable.** Per-manager files record Homebrew/npm/pnpm
  outcomes. The runner records `maintenance-helper` before invoking the helper,
  retains it for a missing or early-crashing helper, and clears it when either
  the helper succeeds or a more precise manager record exists. Direct cleanup
  writes each due manager's incomplete-intent record before its first mutation
  and clears it only after final measurement and receipt, so even an untrappable
  termination cannot turn "started" into "proven complete." If a manager was
  intentionally removed, the owner may use
  `groundwork-cleanup --yes --clear-pending <stage>` to clear only that
  reminder; no cleanup is claimed, and a timestamped audit note remains.
- **Untrusted records fail closed.** Repository discovery uses NUL-delimited
  filesystem input and refuses canonical paths containing any C0 terminal
  control or DEL. The public list contract is tab-delimited, and terminal
  receipts must also be safe from escape injection. `packageManager`, pnpm
  version, and store output containing those controls are review-only rather
  than serialized into internal records.
- **Maintenance children have no interactive input.** Every bounded child gets
  `/dev/null` as stdin, and the pnpm candidate loop owns a separate descriptor.
  A package manager cannot consume the remaining store records and silently
  skip later candidates.
- **Observation and mutation cancellation share one bounded contract.**
  Discovery, package-manager path queries, and byte measurements preserve HUP,
  INT, and TERM as 129, 130, and 143 before any maintenance mutation begins.
  Every bounded process group receives TERM, a short grace, then KILL if the
  child or a descendant resists. The process group remains authoritative after
  its leader exits, so a background child cannot outlive the advertised
  deadline and turn a partial command into success. Signal handlers are
  installed before launch. Production polls once per second; the broad fixture
  matrix uses the minimum accepted 0.05-second value while dedicated heartbeat
  and deadline cases retain one second. The installed override is constrained
  to 0.05–1 second, so it cannot make a deadline sleep for an unbounded interval
  or create a busy loop. After KILL, the whole group must be observed gone;
  otherwise status 125 aborts later mutation.
- **Machine maintenance runs from `$HOME`.** The npm stage `cd`s home first so
  a repository's mise config or project `.npmrc` is never consulted. The cd
  neutralizes directory-based file lookup only: `npm_config_*` environment a
  shell exported still applies, deliberately — separating a project's ambient
  exports from the user's own configuration is not this stage's call.
- **Failed measurements are never healthy.** An unmeasurable size reports as
  unavailable and skips threshold judgment; a partial total is reported
  incomplete, not summed and blessed. Homebrew and npm cache queries run from
  `$HOME`; relative values resolve against that same boundary, and multi-line,
  control-bearing, or otherwise unsafe values are not measured. The pre-mutation
  intent remains pending throughout post-mutation bookkeeping; an observed
  measurement interruption replaces it with the more precise fact that the
  command ended but its final receipt did not complete.
- **Independent maintenance survives a later upgrade-lane failure.** Required
  update failures still make the final transaction nonzero and withhold its
  success timestamp, but a failed mise lane does not suppress supported
  Homebrew/npm/pnpm maintenance after Homebrew itself completed successfully.
- **Storage is not in the default doctor run.** `du` over VM bundles and
  simulator trees can take minutes; the default run prints a pointer to
  `--storage` instead.
- **Thresholds are policy**: Homebrew cache warns above 2 GiB
  (`GROUNDWORK_STORAGE_BREW_WARN_GIB`), pnpm stores above 10 GiB
  (`GROUNDWORK_STORAGE_PNPM_WARN_GIB`), npm cache above 5 GiB
  (`GROUNDWORK_STORAGE_NPM_WARN_GIB`). Change them here and in the doctor
  together.

## Proof levels (per AGENTS.md, a proof claims only what it ran)

| Piece | Proof |
| --- | --- |
| Homebrew cleanup | fixture-proven + real-machine receipt (12.5 GB reclaimed, 2026-07-29) |
| npm verify stage | fixture-proven (mise-owned and PATH npm, failure, `$HOME` neutrality) |
| pnpm store tidy | fixture-proven (hostile args, dry-run, receipt, offline refusal, symlink alias) |
| automatic package-manager maintenance | fixture coverage committed for hostile args, stable exact pins, terminal controls, absolute trusted roots, canonical Git discovery, trusted/custom/conflicting stores, deterministic selectors, cadence/high-water/forced no-candidate no-op/pending override, exec lock adoption and nested borrowing, stale/incomplete/reused lock recovery, observation signal propagation, resistant process-tree cancellation, and helper/per-manager repair; post-review full matrix awaits CI |
| doctor `--storage` | fixture-proven read-only + real-machine run; reporting only |

## Deferred, deliberately

- **The single-directory tidy remains owner-confirmed without requiring a
  pin.** `groundwork-pnpm-store-tidy --yes` is an explicit diagnostic action
  for the current directory. The automatic multi-repository path is different:
  it requires exact pins and trusted roots before a store becomes a candidate.
- **Per-stage pending state is now required.** Homebrew, npm, and pnpm are
  independent maintenance lanes. A failure records
  `~/.local/state/groundwork/update-all-pending/<stage>`, later lanes continue,
  and a successful retry clears only its own record. The update transaction
  exits nonzero and withholds its success timestamp while any required
  maintenance remains incomplete.
- **Shared size helpers are temporarily duplicated** across cleanup, doctor,
  and the single-directory tidy. The old “self-contained runner” justification
  no longer applies: cleanup is now an installed command and the update lock
  establishes an installed library surface. Extraction still needs explicit
  install-order and rendered-consumer proof, so it is tracked in the roadmap
  instead of being folded into this safety patch without those fixtures.
- **No `groundwork-xcode-tidy` / `groundwork-worktree-tidy` commands yet**;
  the doctor report covers the need until acting on those areas is designed.
