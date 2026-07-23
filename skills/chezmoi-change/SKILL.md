---
name: chezmoi-change
description: Safely edit and verify Groundwork-managed chezmoi files. Use when changing shell, tmux, Git, editor, app, Brewfile, helper scripts, or any file that maps from the Groundwork source tree into a user's home directory.
---

# Chezmoi Change

Use the visible checkout as the source of truth. Never hand-edit the applied copy under `$HOME` and call the task done.

## Ownership Model

Pick the pattern before editing. These are the only patterns this repo uses; do not invent new ones.

- **Fully managed (the default).** Groundwork owns the whole file and updates propagate on `chezmoi update`. Users customize with `chezmoi edit --apply <target>` or a fork. Use for single-file configs: starship, ghostty, mise, `~/.claude/keybindings.json`.
- **Managed base + unmanaged local overlay.** For files users tweak constantly, the managed file sources an ignored `*.local` file last so personal choices win: `~/.zshrc.local`, `~/.gitconfig.local`, `~/.config/tmux/tmux.local.conf`. If a managed file needs a personal layer, add an overlay hook; never tell users to hand-edit the managed target.
- **`modify_` merge script.** For files an app also writes to (Karabiner), merge Groundwork's keys into the app's existing JSON on every apply. Never replace the whole file.
- **Never `create_` seed-once files.** A `create_` target is written only if absent and never updated again: it hides drift from `chezmoi diff`, never receives upstream improvements, and forces users to hand-edit the applied copy — the exact habit this repo forbids. If a file seems to want seeding, it should be fully managed or left unmanaged.

## Workflow

1. Identify the managed source path:
   - `~/.zshrc` -> `home/dot_zshrc.tmpl`
   - `~/.gitconfig` -> `home/dot_gitconfig.tmpl`
   - `~/.config/<name>` -> `home/dot_config/<name>`
   - `~/.local/bin/<name>` -> `home/dot_local/bin/executable_<name>`
   - `~/Library/...` -> `home/Library/...`
2. Edit only the source file, or use `chezmoi edit <target>`.
3. Render or diff before claiming done:
   - Use `chezmoi diff` for broad changes.
   - Use `chezmoi --source "$PWD" execute-template < path.tmpl` for a focused template check.
   - Use `bash -n`, `zsh -n`, or the relevant parser on rendered scripts/configs.
4. If practical and low-risk, run a targeted `chezmoi apply <target>` or inspect the generated target.
5. Run `scripts/validate-groundwork` before commit or release-sized changes.

## Configuration Interview

Changes to `home/.chezmoi.toml.tmpl` or the stored init/config contract also load
`skills/interactive-cli-ux` — the interview is a user-facing prompt flow.

Behavior that governs the interview (from chezmoi's source and reference):

- `prompt*Once` reuses a value already present in `chezmoi.toml`, so a plain
  `chezmoi init` asks nothing once a full run has saved answers.
- `chezmoi init --prompt` forces the `prompt*Once` functions to ask again even
  when values exist — but it does NOT seed the current stored value as the
  default. Each prompt shows the TEMPLATE's default, which may differ from the
  saved answer, so pressing Enter through the interview can reset choices (an
  existing `personal-preview` back to `personal-current`, `work` back to
  `false`). Describe it as "replays the full interview using template defaults;
  review every question and inspect the diff before applying" — never as a safe
  one-key reconfirm. `--promptDefaults` and the `--promptString`/
  `--promptChoice`/`--promptBool` pairs are for testing or controlled
  automation, not a casual reconfigure path. Manual `chezmoi.toml` editing is an
  advanced fallback. The safe SELECTIVE reconfigure (current answer as the
  default, change only chosen fields) is `groundwork-configure`, not raw
  `--prompt`.
- A choice prompt on a TTY is a type-to-match field, not a navigable list. A
  keystroke that keeps the text a valid prefix of some choice is accepted with no
  visible confirmation; a unique abbreviation auto-submits instantly with no
  Enter; an ambiguous-but-valid prefix plus Enter neither submits nor shows an
  error (chezmoi validates but does not render the validation error); a keystroke
  that matches no choice is dropped. So choice VALUES must not share a long
  prefix — prefer a numbered menu mapped to the stored values.
- A cancelled Bubble Tea prompt is carried as an error on a ZERO process exit
  status, and chezmoi's order is clone/init source -> generate config -> apply.
  So exit-zero never means "the interview completed", and raw `chezmoi init
  --apply` cannot promise "cancellation left no partial state" (a source clone
  and a partially generated config can precede a later cancel). Distinguish these
  outcomes explicitly: no partial CANDIDATE config; no destination apply before
  approval; possible pre-existing source-clone state; config changed but apply
  failed; config and apply both complete.

Cancellation-safe reconfigure transaction (the pattern `groundwork-configure`
must follow — key-presence alone is NOT a valid postcondition, because on an
existing install every key was already present before a cancelled run).
Generating a config ALSO writes chezmoi's persistent-state DB, so a temp config
path is not enough isolation:

1. Render THIS invocation's candidate with a fully isolated environment — a temp
   config path, temp persistent-state, temp cache, and the KNOWN existing
   Groundwork source (so the preview neither clones nor mutates source state), no
   apply hooks, no destination apply:
   `chezmoi --persistent-state <tmp-state> --cache <tmp-cache> --source <existing>
   init --config-path <tmp-config>`.
2. Require a complete, valid candidate actually produced during this invocation
   (not the pre-existing file).
3. Diff the candidate against the current config and show it.
4. Atomically install the candidate only after explicit confirmation.
5. Run `apply` separately and report an apply failure distinctly from a config
   failure.

Any interview change must:

- Preserve existing `[data]` keys and every valid stored value.
- Keep choice labels separate from stored values, and normalize the DUAL return
  domain: on a fresh or `--prompt` run a numbered menu returns `1`/`2`/`3`/`4`,
  but on an ordinary existing-config run `promptChoiceOnce` returns the stored
  value (`personal-preview`, ...) directly. Accept both and normalize to exactly
  one stored value. On a forced re-prompt, map the current valid stored preset to
  the numbered default so Enter does not silently reset it. Cover this with a
  table-driven fixture.
- Test these states with an isolated temporary `HOME` and chezmoi config dir:
  fresh config; existing config with no forced prompts (reuse); `chezmoi init
  --prompt` (re-interview); every choice and its default; EOF; cancellation
  before config generation; and cancellation during a later apply step.
- Verify no partial candidate config is ever presented as a successful
  completion.
- Prefer deterministic chezmoi prompt flags for most fixtures; include at least
  one real pseudo-TTY test for key behavior, asserting the actual installed
  behavior rather than a diagnosis.
- Also fix, in the same tranche (or file an explicit remediation checklist), the
  existing template prompts that already break this contract: the bool prompts
  that spell out `y/t = yes, n/f = no` parser internals instead of a clean
  `[y/N]`, and the raw `promptChoiceOnce` password-manager prompt. A mandatory
  skill must not leave the repo's own shipped interview violating it.

## Guardrails

- Keep `.chezmoiroot` as `home`.
- Do not edit generated files under `$HOME` except as a temporary diagnostic.
- Only automate settings backed by stable files, templates, documented macOS defaults, or vendor-supported CLIs. For app-owned databases, cloud sync stores, Keychain state, secrets, and per-device shortcut/display state, document the vendor sync/export path instead of writing hidden internal files.
- Do not remove first-run backup/restore coverage when changing managed files.
- Report any apply step not run, especially for macOS settings or app databases.
