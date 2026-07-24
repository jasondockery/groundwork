# Environment Profiles and Release Posture

Status: partially implemented (2026-07-24, `origin/main`). Shipped:
- profile/posture schema and storage, and the `groundwork-profile` reporting
  command (`f46e3a7`); note `groundwork-profile set` prints a planned migration,
  it does not itself persist the change;
- the numbered-menu interview UX that writes `profile_preset` (`4bb48df`);
- selective editing of the `profile_preset` seed via `groundwork-configure`
  (`937ae11`).
Open:
- first-class, independent editing of `environment_role` and `release_posture`
  (they are stored separately from the preset precisely so they can diverge from
  the seed, but `groundwork-configure` today exposes only `profile_preset`);
- the posture-DRIVEN behavior — `update-all` / the tool catalog selecting
  application release channels by `release_posture` — plus migration and actual
  channel switching.

`AI_THESIS.md` → "Release posture" owns the product stance; this specifies how it
becomes configuration.

Implement under `skills/safe-mutating-cli` and
`skills/system-update-orchestration`.

## Problem

`update-all` today has one behavior for every machine and reports it
dishonestly: it prints skipped casks and then says `Groundwork tools
refreshed.` A user who wants VS Code Insiders, Zen Twilight, or Chrome Beta has
no way to say so, and works around Groundwork on every run.

The temptation is to keep adding flags — `--greedy`, `--include-vendor-casks`,
`--beta`. That produces a command whose behavior nobody can predict and whose
receipt nobody can trust. A reverted attempt on 2026-07-20 demonstrated the
failure mode: `--require-sha --greedy-auto-updates` planned to upgrade
`google-chrome`, the one cask `scripts/audit-brew-casks` deliberately excludes.

The environment should declare its posture once, and `update-all` should read
it.

## Fixed invariants

These are not profile fields. No preset may change them.

1. **AI tool freshness.** Groundwork imposes **no intentional delay** on
   supported AI tools: it targets the newest Groundwork-supported release
   available through the configured official channel whenever `update-all`
   runs. There is no "delayed" mode. This is not permission to fight MDM,
   organization policy, an approved-software list, or a read-only package
   manager — see Precedence. A blocked or unverifiable update is reported
   explicitly, and Groundwork never claims the AI toolchain is current when it
   could not verify that.
2. **Integrity.** `--require-sha` and the `audit-brew-casks` exception registry
   apply in every posture. A preview channel is a different product, not a
   relaxed trust policy.
3. **Supply-chain floors.** pnpm 4 days, Renovate 5 days, mise 5 days. These
   address anonymous instant publish into deep transitive trees, not staleness
   preference. Homebrew applications and AI CLIs carry no floor.
4. **Project pins win.** Release posture governs available workstation tools,
   never repository contracts.
5. **No OS enrollment.** Groundwork records and diagnoses the system channel;
   it never enrolls a machine in an OS beta or downloads one.

## Dimensions

Presets choose starting values. What is **persisted is the concrete choice**,
not the abstract posture, because a posture cannot express "Zen Twilight as my
primary browser and Chrome Beta as my compatibility browser."

```yaml
schema_version: 1

environment:
  role: personal              # personal | managed | disposable
  release_posture: preview    # posture: seeds defaults, does not name a channel

tools:
  primary_editor:
    family: vscode
    variant: insiders
  primary_browser:
    family: zen
    variant: twilight
  compatibility_browser:
    family: chrome
    variant: beta

system:
  declared_channel: developer-beta   # INTENT
  management: user-controlled        # user-controlled | organization-managed
```

Two vocabularies, deliberately separate:

- **Posture** — `current` or `preview`. An attitude that seeds defaults.
- **Variant** — `stable`, `insiders`, `twilight`, `beta`, `dev`, `canary`. A
  real upstream channel named by its vendor.

Collapsing them loses intent: Chrome has Beta, Dev, and Canary, and calling all
three "preview" throws away which one the user picked. Posture selects a default
variant through the catalog; the user may override any single tool without
changing posture.

`system.declared_channel` records **intent**. Detected OS state is a separate
observation made by `groundwork-doctor`, never stored as if Groundwork set it —
Groundwork does not control Software Update enrollment and must not imply it
does.

### Roles

| Role | Environment |
| ---- | ----------- |
| `personal` | The user's own machine; full posture freedom |
| `managed` | Work machine; organization policy outranks posture |
| `disposable` | Rebuildable container or VM; aggressive variants are cheap |

`disposable` is in the v1 schema because the thesis already names containers as
a target and the owner has stated the requirement. Modelling the role is cheap;
building the full container experience is not, and that can follow.

`ci` is deferred until Groundwork actually owns a CI installation path.

### Presets (v1 onboarding)

| Preset | role | posture | |
| ------ | ---- | ------- | --- |
| **Personal Current** | personal | current | **recommended default** |
| **Personal Preview** | personal | preview | |
| **Work Managed** | managed | current | default when `work` is yes |
| **Disposable Experimental** | disposable | preview | |

**Personal Current is the shipped default, and that is not a cautious choice.**
Current AI tools on stable foundations is the configuration that sets an
AI-native developer up to succeed, for two reasons:

1. **The AI layer already supplies the variance.** DORA's 2024 data found
   delivery stability dropping about 7.2% for every 25-point rise in AI
   adoption. A workflow that has taken on that much new variance should not
   also be absorbing pre-release breakage in its browser, editor, and OS.
2. **Agents work better against a documented substrate.** When an agent
   debugs a machine, it reasons from how the tool is documented to behave.
   Preview channels move behavior ahead of its documentation, so the developer
   ends up supervising the agent's confusion instead of the work.

The scarce resource for an AI-native developer is attention. Every preview-
channel breakage spends attention that should have gone to directing agents.
Preview is a first-class, fully supported choice — it is simply not the default,
and it is never a workaround or an integrity bypass.

Preview onboarding confirms **concrete products**, not an abstract switch: the
user sees and approves VS Code Insiders, Zen Twilight, Chrome Beta, and their
system-channel intent individually, because a posture cannot express which of
Chrome's Beta, Dev, or Canary they meant.

There is no "production" profile. Groundwork configures development and
automation environments; production belongs to Roost or the app's deployment
system.

### Precedence

When rules disagree, the higher line wins:

```text
organization / device policy
→ environment-role constraints
→ Groundwork integrity policy (checksums, audit registry)
→ selected tool variant
→ repository version pins   (always authoritative for project runtimes)
```

A managed machine may therefore run behind — but never because Groundwork
imposed a delay.

### Persistence

The profile is machine-local configuration, not tracked project state. It must
be: readable before `chezmoi apply`, schema-versioned, atomically written,
editable without rerunning onboarding, parsed by exactly one implementation, and
recoverable when corrupt. Answers live in the chezmoi config Groundwork already
owns — there must not be one answer in chezmoi and a second copy elsewhere.

## Tool catalog

One canonical record per tool family. Channel variants are **separate products**
with different cask tokens, application bundles, CLI commands, and settings
directories — values that cannot be derived from the token.

The canonical catalog is a **machine-readable, schema-validated file**
(`data/tool-channels.yaml` or equivalent). It is not this document. Any table
here is illustrative or generated; an upstream rename must be one canonical data
edit, not a data edit plus a prose edit that silently drifts.

Shape:

```yaml
families:
  vscode:
    defaults: { current: stable, preview: insiders }
    variants:
      stable:
        cask: visual-studio-code
        app_bundle: Visual Studio Code.app
        cli: code
      insiders:
        cask: visual-studio-code@insiders
        app_bundle: Visual Studio Code - Insiders.app
        cli: code-insiders
```

`defaults` is how a posture becomes a variant, and why posture and variant stay
separate vocabularies: adding Chrome Canary later adds a variant without
touching the profile vocabulary.

### Three owners, not one

"Vendor-owned" is too coarse. Each variant declares:

```text
install_owner        who installs it        (homebrew | vendor | external)
update_owner         who updates it         (homebrew | vendor | organization)
configuration_owner  who owns its settings  (groundwork | user | vendor-sync)
```

Chrome is exactly why: Groundwork may facilitate installation, Google owns
updates, and Groundwork may own a small set of configuration defaults. One field
cannot say that.

### Each GUI variant eventually needs

```text
bundle_identifier              (prefer over literal /Applications paths)
application discovery strategy
native settings directory
coexistence group
installed-version probe
available-version probe
health verification command
platform requirements
```

Values verified 2026-07-20 against Homebrew 6.0.11 during design: `zen@twilight`
installs `Twilight.app` — not "Zen Twilight" — and `zen-browser` still resolves
as an alias to `zen`. Both facts argue for one machine-readable source rather
than literals spread across templates.

Start with families that actually need a decision. Do not model software with
one channel and no ambiguity.

## Vendor identity is preserved

**Groundwork never renames a preview application, symlinks it into a stable
path, or shadows a vendor command.** Doing so breaks code signing, bundle
identity and LaunchServices registration, the vendor's own updater,
side-by-side installation, and rollback.

Concretely: `code` always means Stable and `code-insiders` always means
Insiders, exactly as Microsoft intends. Normalization, if any, happens in
Groundwork's own invocation layer — never in the application bundle.

### Deferred: role-based resolver commands

A `groundwork-editor` / `groundwork-browser` wrapper is a plausible next step
but is **not** in this specification. It adds indirection on the most
critical path a developer has, breaks muscle memory and anything that shells
out to `code`, and introduces a failure point between the user and their
editor. Setting `$EDITOR`/`$VISUAL` to a resolver is the lower-risk half and
can come first if a real need appears. Build the catalog and rendered settings
first; add resolvers when something demonstrably needs them.

## Settings: primary channel only

Rendering shared settings to *every* installed channel doubles the chezmoi
drift surface for a fallback the user rarely opens.

**Only the primary channel receives Groundwork-managed configuration.** A
retained stable fallback is installed but unmanaged. If the user later promotes
the fallback to primary, the profile change plan renders settings then.

Where a family needs channel-specific values, use a common file plus an
overlay, rendered to that channel's native path:

```text
Stable:    ~/Library/Application Support/Code/User/settings.json
Insiders:  ~/Library/Application Support/Code - Insiders/User/settings.json
```

Render real files. Do not symlink two channels to one live file — schemas,
extensions, and migrations differ between them.

Promotion and demotion are explicit, never incidental:

```text
promote a fallback to primary  → preserve its existing user data; show the
                                 Groundwork-managed files that will be written;
                                 merge or replace only per declared ownership;
                                 require confirmation
demote the former primary      → stop managing its settings; preserve its files
                                 and application data; never delete
```

Distinguish an **installed** fallback from a **configured** one from a
**verified** one. An unmanaged stable install is a useful emergency launcher; it
is not a proven equivalent rollback environment.

## Profile changes are planned migrations

Switching posture is a mutating operation and follows
`skills/safe-mutating-cli`: show the plan, mutate only on acceptance.

```text
groundwork-profile show
groundwork-profile set personal-preview      # plan, then confirm
groundwork-profile edit
```

A change must never delete the previous channel automatically, overwrite the
other channel's settings, or alter default-application handlers without showing
it. Switching back retains preview data until the user asks to remove it.

`update-all` gains no new posture flags. Its user-facing surface stays:

```text
update-all
update-all --plan
update-all --help
```

`--plan` does not fit today's launcher, which syncs and applies before the
runner is reached. Informational commands must short-circuit above that
trampoline:

```text
PLAN-001  --plan parses and validates before synchronization or apply.
PLAN-002  A plan performs no persistent machine mutation. Metadata and network
          reads may occur; any unavoidable cache effect is documented.
PLAN-003  --help, invalid arguments, and an invalid profile invoke no git,
          chezmoi, brew, mise, installer, or application-start command.
PLAN-004  --plan does not write the last-update-all timestamp, so it never
          suppresses the stale-refresh reminder.
```

## Update ownership

**Decision: `update-all` updates the software Groundwork declares for the
selected profile — not every package the user ever installed through
Homebrew.**

Today an unqualified `brew upgrade` touches hand-installed packages Groundwork
knows nothing about, which is incompatible with channel-aware, owner-aware
updates and with an honest receipt. Unmanaged packages are reported by
`groundwork-doctor`, never silently mutated.

## Execution model

```text
read persisted profile
→ render the exact Groundwork-owned candidate set from the catalog
→ query installed and available state
→ classify every candidate
→ show the plan when --plan
→ update
→ retry only the same approved candidate set
→ verify essential tool behavior
→ print an evidence-based receipt
```

Receipt categories, per `skills/system-update-orchestration`:

```text
Updated
Already current
Externally managed and verified
Blocked by policy or environment
Attempted but still outdated
Status could not be verified
```

A blocked AI-tool update is reported, never silently absorbed:

```text
Claude Code
  Installed:         2.1.215
  Latest supported:  2.1.218
  Blocked by organization policy.

Groundwork does not claim the AI toolchain is fully current.
```

Exit behavior: a Groundwork-owned update failure is nonzero; invalid arguments
or an invalid profile fail before mutation; an external updater being required
is visible and does not claim fully current; unverifiable status makes the
receipt explicitly incomplete; a device-policy block is reported, never
bypassed.

## Migration for existing installations

Never guess a profile silently. Detect installed channels, recommend the closest
preset, show resulting changes, let the user accept or edit, then persist.

Migration preserves installed applications and their settings. It does **not**
preserve the legacy update scope: today's unqualified `brew upgrade` mutates
software Groundwork never declared, which this specification has decided is
wrong. Leaving existing users on that indefinitely to avoid a prompt would keep
the defect alive forever.

```text
interactive, unmigrated     → show the recommended profile and plan; require a
                              selection before the next MUTATING update
noninteractive, unmigrated  → fail before mutation, naming the exact command
                              that selects a profile
compatibility escape hatch  → owner-approved, visibly deprecated, with a bounded
                              removal date
```

Read-only commands (`--plan`, `--help`, `groundwork-profile show`) keep working
unmigrated.

## Structural guardrails

Enforced by `scripts/validate-groundwork`:

1. Every selected channel resolves to a catalog entry.
2. **At most one** primary variant per logical role. Roles declare whether zero
   is allowed — a headless container has no GUI browser, and a managed machine
   may use an externally supplied editor. Secondary and fallback variants are
   permitted only where the catalog proves coexistence.
3. Conflicting casks cannot be selected together unless coexistence is proven.
4. Every rendered path belongs to the selected variant.
5. Executable templates, scripts, rendered configuration, and application logic
   derive every channel-specific token, bundle identity, command, and path from
   the catalog. Documentation and fixtures may carry examples only through an
   explicit checked exception or generated output. (This document is such an
   exception; its earlier draft asserted the broad rule and then violated it.)
6. Update and retry use the same exact selected token.
7. A profile change is idempotent.
8. Stable fallback is preserved when the catalog says coexistence is supported.
9. An upstream token or bundle rename requires one canonical production-data
   edit. Fixtures, a migration alias, and release notes may also change;
   consumers must derive the value rather than duplicate it in logic.

## Sequence

1. **Done** — guardrail skills committed (`81bb40b`).
2. **Done** — thesis stance + this specification (`bc2ac88`).
3. **Done** — profile schema and persistence for role, posture, and system
   intent, with storage, argument safety, and rendering proven, plus the
   `groundwork-profile` reporting command (`f46e3a7`); the numbered-menu
   interview writes the fields (`4bb48df`). No channel depends on it yet.
4. Machine-readable catalog for vscode, zen, chrome, and AI tools; then enable
   concrete per-tool variant selection and onboarding choices. Render the
   Brewfile from it. Test that channels never replace one another.
5. Migration and profile-changing commands, built on catalog-backed plans —
   migration needs the catalog to map observed casks to known variants.
6. Rebuild `update-all` on explicit candidates with `--plan` and an honest
   receipt. No global greedy flag; no mutation of unmanaged packages.
7. `groundwork-doctor` checks: profile vs installed channels, AI freshness,
   vendor-updater status, policy blocks, unmanaged software, system channel vs
   declared intent.

Hostile fixtures land with each phase, not after. Red-prove every branch.
