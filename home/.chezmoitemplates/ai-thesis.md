# AI-Native Groundwork — North Star

Groundwork is an AI-native Mac, Linux, and headless developer environment. It installs the tools a developer may want and teaches the fundamentals that stay useful when tools change: the shell, Git, project instructions, verification, and how to direct and supervise AI agents so the human remains the senior partner rather than a rubber stamp.

Editors, multiplexers, launchers, and browsers are options to choose from, not tests of whether someone is doing development correctly. The terminal is foundational because it is the shared operating language between developers and agents: it keeps work fast, inspectable, reproducible, and easy to verify.

## Operating Principles

These govern every page and every change, whether a human or an agent makes it.

1. Every tool page earns its place by answering at least one of two questions: how does an agent use this, or how does this help a human direct, inspect, or verify an agent's work? If neither applies, the page is a foundation, reference, or candidate for removal.
2. Interface tools such as editors, multiplexers, launchers, and browsers are presented as choices, not required curriculum. No page should imply someone is wrong for choosing VS Code over Neovim, tabs over tmux, or another capable tool over the local default.
3. Lead with the workflow and the why. Keystrokes, flags, package names, and config details are the how; they come after the reason they matter.
4. Anything new must state how it serves directing or supervising agents, or be explicitly labeled foundational. If it can do neither, it does not ship as part of an AI-native environment.

## Working Agreement

For any agent making changes in this repo:

- Read this north star before broad docs, onboarding, tooling, or agent-instruction changes.
- Plan, then implement, then verify. State the plan before substantial edits; after editing, run the relevant check and report what ran.
- Make minimal, targeted changes. Do not refactor unrelated code, and never drop existing functionality when editing a file.
- Preserve good existing content. Improve framing and navigation before deleting material that still helps learners.
- Prefer repo skills for repeated workflows such as validation, docs alignment, chezmoi changes, and macOS defaults.
- Never write secrets, tokens, private handles, private affiliations, or machine-specific values into tracked files; use templates, ignored local files, or environment variables.
