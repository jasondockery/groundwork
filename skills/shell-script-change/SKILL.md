---
name: shell-script-change
description: Writes and reviews bash, zsh, POSIX sh, and small Python helper scripts for portability, safety, idempotency, and testability. Use when creating or editing .sh, .bash, or .zsh scripts, installers, updaters, bootstrap scripts, or Python invoked from shell, or when choosing shell versus Python. Not for how prompts, privilege requests, and progress look to a person (use terminal-program-ux), and not for adopting or configuring a developer tool (use developer-tool-change).
---

# Shell script change

Load `developer-tool-change` when adopting or configuring a developer tool.
Load `terminal-program-ux` when the script prompts, requests privilege, or
shows progress. Keep shell syntax, quoting, portability, and language
selection here.

## 1. Pick the language and target first

- Write the target shell and minimum version at the top of the script
  (shebang plus a comment). Examples: `#!/bin/sh` for anything piped from
  `curl | sh`; `#!/usr/bin/env bash` with "bash 3.2+" if it must run on
  stock macOS.
- Bash 3.2 has no associative arrays, no `mapfile`/`readarray`, and no
  `${v,,}`/`${v^^}`; all arrived in bash 4.0.
- BSD and GNU `sed`, `stat`, `date`, `readlink`, `mktemp` differ. Use the
  portable form or detect the variant once. Prefer a temp file and `mv`
  over `sed -i`.
- When the script needs data structures or non-trivial control flow, write
  Python instead.
- Do not source bash helpers into zsh. Run them as a separate process with a
  declared shebang.

## 2. Fail loudly and on purpose

Use strict mode (`set -eu`, plus `-o pipefail` where supported) **or** explicit
checks, and know where `set -e` does not fire: inside `if`/`while` conditions,
left of `&&`/`||`, in functions called from those, and in command
substitutions in older shells. `pipefail` turns `cmd | head` into a SIGPIPE
failure. `local var=$(cmd)` and `export var=$(cmd)` hide the command status;
declare first, then assign.

## 3. Quote and pass arguments safely

- Quote every expansion: `"$var"`, `"$@"`, `"$(cmd)"`.
- Build argument lists as arrays in bash, as `set --` in POSIX sh. Never
  build a command string and `eval` it.
- Put `--` before user-supplied paths or patterns.
- Exit codes: 0 ok, 1 general failure, 64 usage error, 126 found but not
  executable, 127 not found, 130 interrupted.

## 4. Leave the system consistent

- `trap cleanup EXIT` (plus INT/TERM in POSIX sh) removes temp files and
  stops children.
- Temp files from `mktemp` in the target's directory; write there, then
  `mv` over the target so readers never see a half file.
- Re-running must be safe: check before creating, appending, or linking.
  A second run with no changes should change nothing and say so.

## 5. Keep children non-interactive

A child that waits for input hangs the script. For unattended paths:

- stdin from `/dev/null` unless the child must talk to the person.
- `GIT_TERMINAL_PROMPT=0`, `DEBIAN_FRONTEND=noninteractive`, `PAGER=cat`,
  `GIT_PAGER=cat`, `CI=1` where the tool honors it.
- A timeout on every network or external call (`curl --max-time`,
  `timeout` where present).

## 6. Python called from shell

- `subprocess.run([...], check=True, timeout=...)` with a list. No
  `shell=True`.
- Start a new process group (`start_new_session=True`) only on purpose,
  and then signal the group on timeout.
- Exit with the same codes as section 3.

## 7. Gates before review

1. A shell syntax check matching the declared target (`sh -n`, `bash -n`, or
   `zsh -n`) on every changed script.
2. The shell linter, formatter, and test runner the repository already uses,
   with versions pinned in the product repository. Do not introduce a new
   checker through this change.
3. At least one run in a pty for any script that prompts.

## Done when

- Target shell and minimum version are declared.
- Gates pass on the changed files.
- A second run is a no-op, and Ctrl+C mid-run leaves no temp files.
