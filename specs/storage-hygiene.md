# Storage Hygiene: what cleans automatically, what stays owner-run

Status: Homebrew cleanup shipped in v1.8.0; npm verify, the pnpm tidy
command, and the doctor's storage report are implemented on `main` and ship
with the next release cut. This spec records the ownership decisions so
future cleanup work extends them instead of re-deriving (or contradicting)
them.

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
| Homebrew old versions, locks, download cache | automatic in `update-all` | `brew cleanup --prune=all` after `autoremove`; receipt + pending marker on failure |
| npm cache | automatic in `update-all` | `npm cache verify` (npm's own conservative GC), run from `$HOME`; `npm cache clean --force` stays owner-run |
| pnpm stores | owner-run | `groundwork-pnpm-store-tidy` (dry-run default, `--yes` acts via `pnpm store prune` only) |
| Docker | owner-run | `groundwork-docker-tidy` (label-scoped), `groundwork-docker-cache-tidy` (daemon-wide) |
| Xcode device support / simulators | report only | doctor `--storage` points at Xcode Settings > Components and `simctl delete unavailable` |
| Legacy `~/.nvm` | report only | doctor `--storage` names the intent (mise owns Node) and defers the live-owner question to `--node-toolchain` |
| Parallels / VMs | report only | doctor `--storage` points at Parallels' own Reclaim; Groundwork never touches VM files |
| Project caches (`.turbo`, `node_modules`, `dist`, `target`) | out of scope | each repository's own clean command |

## Decisions worth remembering

- **Corepack selects pnpm per repository**, so there is no machine-wide
  "active" pnpm store. Commands say "selected here" and "other generation",
  print the selection context before acting, and never delete a store
  directory — an old generation may be selected by a repository that has not
  been checked yet.
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
- **Aliases deduplicate by canonical path; symlinks are never skipped as
  such.** Two names for one store report once; a symlink to a distinct store
  is a real generation (the mise `lts` lesson). The selected store is
  reported directly whatever its name — a custom store-dir need not match
  the `v*` layout sibling discovery assumes.
- **npm resolves one way everywhere**: mise-managed npm first, PATH npm
  second, from `$HOME` — `update-all` and the doctor size and maintain the
  same cache, and the doctor names which provider answered.
- **Read-only paths never download a package manager.** The doctor and the
  tidy dry run query `pnpm store path` with `COREPACK_ENABLE_NETWORK=0` and
  report "unavailable offline" honestly. `--yes` is explicit consent, so it
  may let Corepack fetch the selected pnpm.
- **Machine maintenance runs from `$HOME`.** The npm stage `cd`s home first so
  a repository's mise config or project `.npmrc` is never consulted. The cd
  neutralizes directory-based file lookup only: `npm_config_*` environment a
  shell exported still applies, deliberately — separating a project's ambient
  exports from the user's own configuration is not this stage's call.
- **Failed measurements are never healthy.** An unmeasurable size reports as
  unavailable and skips threshold judgment; a partial total is reported
  incomplete, not summed and blessed.
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
| doctor `--storage` | fixture-proven read-only + real-machine run; reporting only |

## Deferred, deliberately

- **`--yes` does not require a `packageManager` pin.** `pnpm store prune` is
  non-destructive to projects whichever generation is selected, and requiring
  a pin would block the primary use — a machine-wide tidy run from `$HOME`.
  Revisit only if pruning ever becomes selective.
- **No generalized per-stage pending marker.** The Homebrew cleanup marker
  exists because that run *continues* past the failure; every other required
  stage fails the run loudly at the point of failure. A failed npm verify
  therefore leaves no durable state (and no doc claims it keeps reminding) —
  recorded as the follow-up shape `update-all-pending stage=… status=…` if a
  second continue-past-failure stage ever appears.
- **Shared size helpers stay duplicated** (runner, doctor, tidy each carry
  ~25 lines of `du -sk` + formatting). A sourced lib would add an
  install-order dependency the self-contained runner deliberately avoids.
  Revisit at a fourth copy.
- **No `groundwork-xcode-tidy` / `groundwork-worktree-tidy` commands yet**;
  the doctor report covers the need until acting on those areas is designed.
