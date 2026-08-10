# Skills

Skills are optional, on-demand procedures for repeated agent workflows.

Compass owns the projected shared skills named by `.compass/receipt.json`.
Their regular files are receipt-bound and checked by
`.compass/check-projection.mjs`; do not edit them independently or maintain a
second inventory here. Groundwork owns the remaining skills in this directory
and may narrow or extend a shared procedure for its product, platform, and
repository commands.

Use a skill when all of these are true:
- The workflow happens often.
- The steps are specific enough to execute.
- The finish line can be verified.
- Keeping the procedure out of `AGENTS.md` makes the default context smaller and clearer.

Do not use a skill for general preferences such as code style, safety rules, commit format, or "run tests." Those belong in `AGENTS.md`.

## Tool Metadata

`SKILL.md` is the single source for what a skill does, when it should trigger, and how an agent should run it.

Some skills may include tool-specific metadata such as `agents/openai.yaml`.
Compass-managed metadata stays byte-identical to its receipt. For a
Groundwork-owned skill, that file is optional Codex UI chrome only: keep it
limited to `interface.display_name`, and put descriptions, prompts, invocation
guidance, and procedure steps in `SKILL.md` so every tool sees them.

Do not copy `skills/` into `.agents/`, `.claude/`, `.codex/`, or another vendor
folder. Those repository-owned discovery paths point at the combined `skills/`
tree with symlinks; Compass-managed files and directories themselves remain
regular, non-symlink entries.

Good candidates:
- Create and verify a document, slide deck, or spreadsheet from a template.
- Run a release process with exact checks and handoff steps.
- Triage a support issue using a known evidence-gathering flow.
- Audit documentation against `AI_THESIS.md` after broad docs or onboarding changes.
- Audit a Groundwork-managed config change across source files, applied files, and live terminal bindings.
- Validate a Groundwork release: render chezmoi templates, check generated scripts,
  inspect public-repo hygiene, and verify the bootstrap path from a clean clone.

Examples of Groundwork-local workflows:
- `docker-lifecycle`: classify local Docker builds, make proof images clean up
  in the same session, and preserve the machine-wide cleanup boundary.

Before adding a skill, ask whether a normal doc page, script, or test would solve the problem better.
