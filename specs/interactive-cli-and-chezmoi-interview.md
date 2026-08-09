# Interactive CLI UX and the chezmoi Interview

Status: partially implemented (2026-08-09, local review tranche). Shipped on
`origin/main`: the guarded `groundwork-configure` transaction (`937ae11`). This
tranche removes mutable release posture and Xcode beta from bootstrap and makes
the settings editor their canonical owner. Open: the remaining raw-interview
prompt remediation (bool prompts still spell out `y/t = yes, n/f = no`; the
password-manager prompt) and the full interactive test matrix — see the
checklist. `skills/interactive-cli-ux` is the procedure an agent follows;
`skills/chezmoi-change` (Configuration Interview section) covers the template
specifics. This spec is the acceptance contract they point at.

## Problem

Bootstrap questions establish facts required to render a usable machine.
Release posture and beta-channel adoption are mutable preferences: forcing them
into `chezmoi init` teaches users that they must reinitialize Groundwork to
change them and makes the first-run interview grow whenever a preference is
added. `groundwork-configure` already provides the safe selective transaction
existing users need, so preference ownership belongs there.

Historical field-hit 2026-07-22: the former starting-profile question also felt
broken because chezmoi's `promptChoice` is a type-to-match field rather than the
menu users expected. Two underlying behaviors were confirmed against chezmoi's
source (`internal/cmd/prompt.go`,
`internal/chezmoibubbles/choiceinputmodel.go`):

1. `promptChoice` is a type-to-match text field, not a navigable menu. On a TTY, a
   keystroke that keeps the text a valid prefix of some choice is accepted with no
   visible confirmation; a unique abbreviation auto-submits instantly with no
   Enter; an ambiguous-but-valid prefix plus Enter neither submits nor renders the
   validation error; a keystroke matching no choice does not submit. No arrow-key
   list, no numbers, no visible selection — the modern installer convention (gum,
   fzf, @clack, enquirer) users expect is absent; a chezmoi limitation to work
   around.
2. Our own values defeat the matching chezmoi does have. `personal-current` and
   `personal-preview` share a nine-character prefix, so nothing is unique until
   the tenth character, while `work-managed` and `disposable-experimental` submit
   on a single letter. Selection effort is wildly uneven, and the long shared
   prefix reads as "it ignored me".

Re-running a plain `chezmoi init` does not re-ask (once-semantics: it reuses any
field already saved). The built-in way back is `chezmoi init --prompt`, which
forces `prompt*Once` to ask again — but it replays using the TEMPLATE's defaults,
NOT the current stored answers, so pressing Enter through it can reset choices (an
existing `personal-preview` back to `personal-current`, `work` back to `false`).
Present it as "replays the full interview using template defaults; review every
question and inspect the diff before applying", never a safe one-key reconfirm.
`--promptDefaults` and the `--promptString`/`--promptChoice`/`--promptBool` pairs
are for testing or controlled automation. Manual `chezmoi.toml` editing is an
advanced fallback. The safe SELECTIVE reconfigure (current answer as the default)
is `groundwork-configure`.

## Decisions

### Bootstrap establishes the machine; configure owns preferences

`chezmoi init` asks only for bootstrap-critical facts such as work/headless
status, identity, code root, package-manager integration, and selected large
toolchains. A fresh install derives a stable `profile_preset`,
`environment_role`, and `release_posture` from those facts without asking a
second stable-versus-preview question. Existing valid stored values are carried
forward unchanged on every regeneration.

`groundwork-configure` is the canonical interactive settings surface for
mutable preferences, including independent `environment_role` and
`release_posture` values plus dependent Xcode `beta`. It uses the same preview,
confirmation, compare-before-swap, backup, and apply transaction as other saved
settings. Xcode beta is visible only while Xcode is enabled; disabling Xcode
stages `beta=false` in the same receipt, while returning Xcode to its original
value removes only a dependency-created beta change. `profile_preset` remains
bootstrap history rather than a live master switch. `groundwork-profile set
current|preview` is a narrow power-user shortcut that delegates to that
transaction; it is not a second writer. A confirmed transaction runs `chezmoi
apply` and reconciles the selected desired state immediately; `update-all` owns
subsequent upgrades and maintenance. `groundwork-doctor` reports the current
posture, and help searches for `beta` or `preview` point to
`groundwork-configure`.

The first apply prints one informational notice: Groundwork defaults to stable
channels, the current posture, and the command for changing it later. This is
communication, not a recurring permission prompt.

### Cancellation-safe reconfigure transaction

chezmoi carries a cancelled Bubble Tea prompt as an error on a ZERO exit status,
so exit-zero never means "completed" — and key-presence is NOT a valid
postcondition, since on an existing install every key was already present.
Generating a config also writes chezmoi's persistent-state DB, so a temp config
path alone is not isolation. The transaction:

1. Render the candidate with a fully isolated environment — temp config path, temp
   persistent-state, temp cache, KNOWN existing source (no clone, no source
   mutation), no apply hooks, no destination apply:
   `chezmoi --persistent-state <tmp-state> --cache <tmp-cache> --source <existing>
   init --config-path <tmp-config>`.
2. Require a complete, valid candidate produced THIS invocation (not the
   pre-existing file).
3. Diff the candidate against the current config and show it.
4. Atomically install only after explicit confirmation.
5. Run `apply` separately; report an apply failure distinctly from a config one.

Distinguish the outcomes: no-partial-candidate / no-apply-before-approval /
possible-source-clone / config-ok-apply-failed / complete.

### Prompt contract

Follow `skills/interactive-cli-ux`: tiered by prompt type (universal / boolean /
choice / overwrite / required-string / sensitive); labels separate from stored
values; numbered choices, no shared-prefix auto-submit; invalid input does not
submit and is explained; cancellation before mutation, truthfully reported;
non-TTY never hangs; reconfigure precedence puts an explicit interactive answer
above the stored value.

## Implementation checklist

- [x] Preserve existing profile/posture storage and derive a stable fresh-install
      default without a release-preference prompt (local review tranche).
- [x] Make `groundwork-configure` the canonical owner of release posture and
      Xcode beta; make `groundwork-profile set` delegate to it; report posture in
      doctor/help/first-run surfaces (local review tranche).
- [x] `groundwork-configure`: show current answers, change only chosen fields
      (current answer as default), render candidate, preview `chezmoi diff`, apply
      after confirmation, with an atomic lock + compare-before-swap promotion
      (`937ae11`). `chezmoi init --prompt` is documented as the advanced full
      re-interview in `troubleshooting.html`/`setup.html`.
- [ ] Every choice prompt states its behavior (unique-prefix auto-submits, bare
      Enter takes the named default, Ctrl+C cancels). Bool prompts already name
      the default; choice prompts must too.
- [ ] Remediate the existing template's own violations in the same tranche (or
      file an explicit checklist): bool prompts that spell out `y/t = yes, n/f =
      no` parser internals instead of a clean `[y/N]`, and the raw
      `promptChoiceOnce` password-manager prompt.
- [ ] Optional navigable menu only where a TTY allows and only with a tool proven
      present (pure-shell numbered fallback at first boot; gum later); always keep
      the plain prompt correct.
- [ ] Tests (isolated temp HOME + config/state dirs): fresh; existing-reuse;
      `--prompt`; every choice and default; EOF; cancel before config generation;
      cancel during apply; one real pty test asserting the installed behavior.
