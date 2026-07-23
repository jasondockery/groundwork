# Interactive CLI UX and the chezmoi Interview

Status: draft, not implemented. `skills/interactive-cli-ux` is the procedure an
agent follows; `skills/chezmoi-change` (Configuration Interview section) covers
the template specifics. This spec is the acceptance contract they point at.

## Problem

Field-hit 2026-07-22: on `chezmoi init`, choosing the starting profile felt
broken — the user reported that typing part of `personal-preview` did nothing and
the default was taken. The symptom is real; the exact keystroke sequence is not
pinned without a pty against the installed version (an ambiguous but valid prefix
like `pers` stays in the field and should not submit the default while present).
Two underlying problems, both confirmed against chezmoi's source
(`internal/cmd/prompt.go`, `internal/chezmoibubbles/choiceinputmodel.go`):

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

### Numbered menu (not a prompt split)

Present a numbered list (1 Personal current — recommended, 2 Personal preview, 3
Work managed, 4 Disposable experimental) and map the digit to the existing stored
value. Each choice is one keystroke with no shared prefix, and every stored
contract is preserved. Do NOT split preset into separate role/posture prompts:
`work` is already its own answer and a work machine only DEFAULTS to
`work-managed` (the user can override), so deriving role from `work` would
silently drop that override, and existing configs already store the full
`profile_preset`. Keep `profile_preset`, `environment_role`, `release_posture`,
and every reader unchanged.

Normalize the DUAL return domain: a fresh or `--prompt` run yields `1`–`4`, but an
existing-config run has `promptChoiceOnce` return the stored value
(`personal-preview`, …) directly — accept both and map to one stored value. On a
forced re-prompt, map the current stored preset to the numbered default so Enter
never resets it. Cover with a table-driven fixture.

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

- [ ] Numbered profile menu + dual-domain normalization + forced-reprompt default
      mapping + table-driven fixture.
- [ ] `groundwork-configure`: show current answers, change only chosen fields
      (current answer as default), explain consequences, render candidate, preview
      `chezmoi diff`, apply after confirmation. Document `chezmoi init --prompt` as
      the built-in full re-interview (with the template-defaults warning) and
      manual editing as the advanced fallback.
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
