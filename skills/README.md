# Skills

Skills are optional, on-demand procedures for repeated agent workflows.

Use a skill when all of these are true:
- The workflow happens often.
- The steps are specific enough to execute.
- The finish line can be verified.
- Keeping the procedure out of `AGENTS.md` makes the default context smaller and clearer.

Do not use a skill for general preferences such as code style, safety rules, commit format, or "run tests." Those belong in `AGENTS.md`.

Good candidates:
- Create and verify a document, slide deck, or spreadsheet from a template.
- Run a release process with exact checks and handoff steps.
- Triage a support issue using a known evidence-gathering flow.
- Audit documentation against `AI_THESIS.md` after broad docs or onboarding changes.
- Audit a Groundwork-managed config change across source files, applied files, and live terminal bindings.
- Validate a Groundwork release: render chezmoi templates, check generated scripts,
  inspect public-repo hygiene, and verify the bootstrap path from a clean clone.

Before adding a skill, ask whether a normal doc page, script, or test would solve the problem better.
