---
name: terminal-program-ux
description: Designs and verifies how terminal programs interact with people: prompts, confirmations, choices, progress, privilege requests, terminal ownership, and non-interactive runs. Use when adding or changing any prompt, --yes/--no-input path, spinner or heartbeat, sudo/pkexec/run0/admin request, child-process handoff, migration offer, or installer/updater output in any language. Not for shell syntax, quoting, or portability (use shell-script-change), not for adopting or configuring a developer tool (use developer-tool-change), and not for terminal emulator or multiplexer setup.
---

# Terminal program UX

The contract for any program a person runs in a terminal. Keep product-specific
commands and numeric budgets in the product repo; this skill sets the rules.

Keep TTY ownership, prompt contracts, privilege asks, and non-interactive runs
here. Load `developer-tool-change` when adopting or configuring the tool
itself. Load `inclusive-product-foundation` to classify the surface. Load
`accessible-product-development` for color, contrast, and motion. Load
`inclusive-content-design` for prompt copy. Apply those procedures without
copying them here.

## 1. Decide the mode before the first prompt

| Situation | Behavior |
|---|---|
| TTY on stdin and stderr | May prompt. Show the default. |
| `--no-input` | Never prompt. A missing answer is an error that names the flag to pass. |
| `--yes` | Accept confirmations only. Never grants auth, never migrates, never deletes beyond what was named. |
| No TTY (pipe, cron, CI) | Same as `--no-input`, or take a documented safe default. |

Never hang waiting for input that cannot arrive. Fail fast and print the exact
flag or command that would have answered the question.

## 2. Prompt contract

- Precedence: flag > config > prompt > built-in default.
- Show the default capitalized (`[y/N]`). Destructive actions default to no.
- Numbered choices for more than two options; accept the number or the name.
- Re-ask on invalid input with the reason; do not silently pick a default.
- EOF (Ctrl+D) means "no answer": take the safe default or fail with the flag.
  Ctrl+C means "stop now": clean up, exit 130.
- Scale friction to danger: mild (one file) may skip the prompt; moderate
  (a directory, a remote change) prompts and offers `--dry-run`; severe
  (a whole remote app or dataset) asks the user to type the thing's name.

## 3. Offer, don't force, migrations

Detect the current setup and the preferred one, then offer. Say what data is
kept, what could go wrong, and how to undo. Default is keep. `--yes` never
migrates; only an explicit `--migrate=<id>` does. Remember a decline so the
offer does not nag. `--dry-run` lists the plan and changes nothing. With no
TTY or `--no-input`, print the migration id and the exact command; do not
migrate.

## 4. One writer per terminal

- Announce before handing the TTY to a child (editor, pager, package manager,
  password prompt). Give the child the foreground process group. Print nothing
  while the child owns it. Summarize after.
- Progress and heartbeats go to stderr. No animation without a TTY; print a
  plain line per step instead.
- Restore terminal modes, cursor, and the foreground process group on every
  exit path, including signals.

## 5. Privilege

- Plan without privileges. Ask only when a privileged change is pending.
- Say why before asking (`sudo -p "..."`). One ask per trust boundary.
- Authorize with a real command (`sudo /usr/bin/true`), not `sudo -v`.
- A credential keepalive is an owned child, killed on exit, and is revoked
  before any third-party code runs.
- No terminal: use the platform's graphical or session agent, or fail with the
  exact command to run by hand.
- Refuse to run the whole tool as root unless there is an explicit opt-in.
- Never pipe, echo, log, or store secrets.

## 6. Output

- Data on stdout, messages on stderr.
- Honor `NO_COLOR` (any non-empty value), `FORCE_COLOR`, and `TERM=dumb`.
  Never carry meaning in color alone.
- An error says what failed, what is true now, and the exact retry command.

## 7. Verify in a pseudo-terminal

Test each prompt in a pty, not just with piped input:

1. Fresh state, default accepted.
2. Existing value kept.
3. EOF at the prompt.
4. Ctrl+C at the prompt (exit 130, terminal restored).
5. Invalid entry, then a valid one.
6. No TTY (`</dev/null`, piped stdout) with and without `--no-input`/`--yes`.
7. A child sitting at a password prompt: nothing else writes to the screen.
8. Ctrl+C during a spinner (exit 130, terminal restored).

## Done when

- The mode table holds for every new or changed prompt.
- The pty cases above pass and are in the repo's test suite.
- Errors and the no-TTY path print a runnable next command.
