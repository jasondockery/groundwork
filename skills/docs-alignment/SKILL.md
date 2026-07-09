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
5. Pages meet readers where they are, assuming nothing about background: terms defined once and a first successful path for those who need it, a skimmable fast path (workflow, why, config) for readers who already know the basics, and the overview -> quick wins -> substantial practice progression respected.
6. Page titles, social titles, nav labels, and compact UI copy use calm product punctuation such as `Page · Groundwork`; avoid em dashes, double hyphens, and hyphen runs as generic separators outside literal command syntax.
7. Existing useful learner content is preserved unless the user explicitly asks to remove it.
8. Learner-facing pages follow the Teaching Structure below: concrete story before abstraction, interleaved try-it-now drills, terms defined at first use, destructive-sounding defaults disarmed with precision, resource ladders instead of piles.

## Teaching Structure

How Groundwork pages teach (decided 2026-07-09, first applied on `docs/git.html`):

1. **Concrete before abstract (concreteness fading).** Open with a true, specific story the reader already participates in — Groundwork itself, the page they are reading, a repo they cloned — and derive the general model from the story. Prefer real public referents ("Jason's laptop") over role words ("the maintainer") until the role has been defined.
2. **Explain, show, try — interleaved.** Every concept section ends with a short "Try it now" drill exercising exactly what was just taught, on something the reader already has. Never bunch drills into one Practice block at the end of a page: practice that is not adjacent to the concept does not happen.
3. **Define terms at first use, in-sentence,** then use them freely ("Jason, who created and maintains Groundwork (in Git terms, its maintainer)").
4. **Precision disarms fear.** Any default, flag, or command that sounds destructive (prune, force, hard, clean) must state exactly what it does and does not touch, adjacent to where it appears — including an explicit "never your X".
5. **Resource lists are ladders, not piles.** Order external resources by reader level (first hour → second stage → reference), say who each rung is for, and never lead with the most authoritative source just because it is authoritative.

## Discoverability

Discovery artifacts are generated, never hand-edited: `scripts/generate-discovery` derives every page's meta description (search snippet), `docs/sitemap.xml`, and `docs/llms.txt` from the pages themselves, and `validate-groundwork` fails when they are stale. Two consequences for authors:

- The lead paragraph IS the search snippet and the AI-tool routing description. Write the first ~155 characters of every `p.lead` to stand alone: what the page is, for whom, in plain words a searcher would use.
- After adding or retitling a page, run `scripts/generate-discovery` and commit the regenerated artifacts with the page.

## Change Pattern

Prefer small edits:

1. Strengthen the lead paragraph or first callout.
2. Add one AI-native bridge paragraph where the tool's purpose is unclear.
3. Move or reword over-prescriptive claims into optional/tool-choice language.
4. Add links to `editors-ai.html`, `agents.html`, `workflow.html`, or `AI_THESIS.md` when they reduce drift.
5. Run `scripts/validate-groundwork`.

Report pages changed, the alignment issue fixed, and validation results.
