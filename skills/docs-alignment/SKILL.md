---
name: docs-alignment
description: Audit or update Groundwork documentation so it stays aligned with AI_THESIS.md, especially after broad docs changes, new tool pages, onboarding edits, or changes that might drift toward terminal tooling as an end in itself.
---

# Docs Alignment

Use this skill when auditing or editing Groundwork docs for AI-native product direction.

## Required Source

Read `AI_THESIS.md` first. It is the canonical north star. Do not copy its text into other docs or agent files; reference it and keep changes aligned with it.

## Audit Checklist

For every affected page, classify it:

- **Workflow**: teaches how a human directs, supervises, verifies, or learns with agents.
- **Interface**: teaches a chosen tool such as tmux, Neovim, Raycast, Anybox, VS Code, or a browser.
- **Foundation**: teaches durable basics such as shell, Git, files, paths, testing, or security.
- **Reference**: cheat sheet, command catalog, glossary, installed list, or troubleshooting.

Then check:

1. Interface pages explain how the tool helps a human direct, inspect, or verify agent-assisted work.
2. Foundation pages say why the basics matter in an AI-native workflow.
3. Tool choices are presented as options, not purity tests.
4. Workflow and why come before keystrokes, flags, packages, and config details.
5. Pages meet adult beginners where they are: define terms once, give a first successful path, and respect the overview -> quick wins -> substantial practice progression.
6. Page titles, social titles, nav labels, and compact UI copy use calm product punctuation such as `Page · Groundwork`; avoid em dashes, double hyphens, and hyphen runs as generic separators outside literal command syntax.
7. Existing useful learner content is preserved unless the user explicitly asks to remove it.

## Change Pattern

Prefer small edits:

1. Strengthen the lead paragraph or first callout.
2. Add one AI-native bridge paragraph where the tool's purpose is unclear.
3. Move or reword over-prescriptive claims into optional/tool-choice language.
4. Add links to `editors-ai.html`, `agents.html`, `workflow.html`, or `AI_THESIS.md` when they reduce drift.
5. Run `scripts/validate-groundwork`.

Report pages changed, the alignment issue fixed, and validation results.
