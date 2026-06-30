---
name: validate-groundwork
description: Validate Groundwork before commit, release, public repo publication, or after broad changes. Use when checking chezmoi layout, rendered templates, docs links, secret patterns, and public-repo readiness.
---

# Validate Groundwork

Run the shared validation script first:

```bash
scripts/validate-groundwork
```

This mirrors CI and checks:
- bootstrap shell syntax
- ShellCheck linting for checked-in and rendered shell scripts
- `.chezmoiroot` and `home/` layout
- `AI_THESIS.md` and rendered AI adapter wiring
- rendered `home/run_*.sh.tmpl` scripts
- rendered templated helper executables
- rendered Claude/Codex adapter templates
- static-docs publishing wiring, including required page metadata
- rendered zsh config
- local documentation links
- common secret patterns
- optional local public denylist patterns
- whitespace errors

## Extra Checks For Public Release

Before publishing or flattening history:

1. Inspect status and staged files:
   ```bash
   git status --short --branch
   git diff --stat
   ```
2. Search for generic private terms, credentials, machine-local paths, or unfinished notes:
   ```bash
   rg -n "TODO|FIXME|private|secret|token|password|gmail|icloud|/Users/" .
   ```
3. If you have personal terms that should never be published, put them in a local gitignored file named `.groundwork-public-denylist`, one ripgrep pattern per line, or set `GROUNDWORK_PUBLIC_DENYLIST_PATTERN` before running validation. Do not commit the personal term list.
4. Confirm generated config points at the visible checkout:
   ```bash
   chezmoi source-path
   ```
5. If changing bootstrap, test from a clean temp clone or read the path carefully enough to explain restart behavior.

Report exactly which checks passed and which were skipped.
