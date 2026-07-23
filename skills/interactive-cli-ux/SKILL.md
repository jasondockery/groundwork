---
name: interactive-cli-ux
description: Design and verify user-facing terminal prompts, menus, confirmations, overwrite choices, and non-interactive input paths so they are predictable, keyboard-complete, and safe by default. Use when adding or changing any prompt, menu, overwrite choice, reconfiguration interview, or input flow in a Groundwork command, installer, or chezmoi template.
---

# Interactive CLI UX

A prompt is a contract with a human under time pressure. Most prompt bugs are not
crashes; they are a person confidently picking the wrong thing, or believing the
tool ignored them. Groundwork's own `chezmoi init` shipped this exact failure:
two choices (`personal-current`, `personal-preview`) hid behind a nine-character
shared prefix, so a type-to-match field appeared to do nothing until the tenth
keystroke. Design prompts so the failure is impossible, not merely documented.

If the prompt also mutates machine state (deletes, overwrites, installs), load
`skills/safe-mutating-cli` as well. If it edits a chezmoi-managed file, load
`skills/chezmoi-change`.

## Universal contract (every prompt)

- **Clear action and scope.** The question states what happens and to what.
- **Cancellation before mutation.** Authorization prompts occur before the
  mutation they gate. Ctrl+C stops all subsequent effects and truthfully reports
  any effect that already occurred before the prompt — a prompt shown after an
  earlier step cannot retroactively promise "no mutation". Esc cancels only when
  the specific TUI explicitly supports it (plain shell prompts do not universally
  treat Esc as cancel). A cancelled prompt is never treated as completed — verify
  the postcondition or return a conventional cancellation status such as 130.
- **Visible invalid-input feedback.** An unrecognized entry does not submit and
  produces a visible reason, then re-prompts; it never silently disappears or
  falls through to a default. (Some libraries — e.g. Bubbles — retain the text
  and store a validation error the host fails to render; reproduce the exact
  installed-version behavior in a pty rather than assuming it is "dropped".)
- **No accidental mutation on EOF or missing input.** EOF (closed stdin) is a
  distinct case from Ctrl+C and must not select a destructive or scope-widening
  option.
- **Explicit non-TTY behavior.** With no TTY, the flow fails fast or takes
  documented defaults; it never blocks waiting for input a headless run cannot
  give. A documented `--non-interactive` mode never prompts and fails if a
  required answer is absent.
- **Precedence.** For a plain command: explicit CLI flag > config > prompt >
  built-in default. For a command whose purpose is to EDIT existing state (a
  reconfigure/interview), an explicit answer must override the stored value:
  explicit non-interactive CLI answer > explicit interactive answer > current
  stored value offered as the default > built-in default. Non-overridable safety
  or organization policy is a separate, higher layer.
- **Stream hygiene.** Prompts go to the controlling terminal or stderr;
  machine-readable output on stdout stays clean.
- **Accessible.** Keyboard-complete, understandable without color, honors
  `NO_COLOR`. Color is emphasis, never the only signal.

## Boolean confirmations

- Use the conventional visible form `[y/N]` or `[Y/n]`, capital for the default.
- Accept parser synonyms (`y`/`yes`/`t`/`true`/`1`, `n`/`no`/`f`/`false`/`0`)
  invisibly — do NOT list them in the prompt text.
- A destructive choice defaults to no.

## Choice menus

- Show numbered human **labels**; map the number to the internal/stored value
  yourself. Never make the user type a stored token verbatim.
- Do not rely on abbreviation matching, and never on a choice input that
  auto-submits when the typed text becomes a unique abbreviation (it breaks when
  two choices share a long prefix). One keystroke per choice.
- Name the default visibly.

## Overwrite / scope-widening choices

- `overwrite one`, `overwrite all`, `skip`, and `abort` are explicit numbered
  choices, never abbreviations.
- "All" states its exact scope, and preferably the count, before selection.
- "All" applies only to the current invocation unless persistence is separately
  and explicitly requested.
- A scope-widening choice is never the default.
- Show a diff or affected-path summary before an overwrite.

## Required strings

- Say the value is required.
- Validate and explain any rejection.
- Do not invent a default just to satisfy a contract — a required name, email,
  or path may legitimately have no default.

## Sensitive input

- Never echo, log, persist in shell history, place in command arguments/argv, or
  include in receipts.
- Prefer a system credential facility or pinentry where applicable.

## States to test

Treat these as separate, independently tested states — a prompt that works on a
fresh run routinely breaks on re-run, EOF, or interruption:

- Fresh input (no prior value).
- Existing value present (reuse, or clearly offer to change, per intent).
- Forced re-prompt (the tool's documented "ask again" path).
- Interrupted run (Ctrl+C) before any mutation — leaves no partial state.
- EOF / closed stdin — distinct from Ctrl+C, no accidental mutation.
- Invalid entry — visible explanation, then re-prompt.
- Non-TTY / piped input — no hang.

Prefer deterministic prompt flags or fixtures for most cases; include at least
one real pseudo-TTY (pty) test for the interactive key behavior that flags
cannot exercise. Assert the tool's actual behavior — do not codify a diagnosis
you have not reproduced in a pty against the installed version.

## Verify

- Exercise each state above; do not claim a prompt is fixed from the fresh-run
  path alone.
- Run `scripts/validate-groundwork` for changes that touch shipped commands or
  templates.
- Report which states were exercised by real pty and which by flags/fixtures — a
  proof must not claim more than it ran.
