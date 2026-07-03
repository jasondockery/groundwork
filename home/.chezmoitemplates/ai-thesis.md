# AI-Native Groundwork: North Star

Groundwork is an AI-native development foundation for Mac as the primary desktop, Linux/WSL terminal workflows, and headless agent/container environments. It installs the tools a developer may want and teaches the fundamentals that stay useful when tools change: the shell, Git, project instructions, verification, and how to direct and supervise AI agents so the human remains the senior partner rather than a rubber stamp.

Editors, multiplexers, launchers, and browsers are options to choose from, not tests of whether someone is doing development correctly. The terminal is foundational because it is the shared operating language between developers and agents: it keeps work fast, inspectable, reproducible, and easy to verify.

## Who Groundwork is for

Groundwork is for adults starting real development, especially people who have never coded before: career changers, people returning to technical work, and retirees or later-in-life beginners who want to build seriously. It is equally useful to working developers and teams adopting an AI-native workflow.

It is deliberately not a children's "learn to code" introduction. There is already an abundance of material aimed at getting young kids into web development, and Groundwork is not that. It assumes an adult who is willing to put in real hours and wants a foundation that treats them as a capable beginner, not a child, and never talks down to them.

## How people learn here

Groundwork is a progressive path, so a newcomer is never dropped into the deep end and a committed learner is never held back. It runs in three phases:

1. **Overview.** First, understand the landscape: what AI-native development is, the arc from vibe coding toward agentic engineering, and why the fundamentals matter. This phase is reading, not setup (the Overview, "Why Groundwork," "The path," and the vibe-to-agentic pages).
2. **Quick wins.** Next, a few short practice steps that produce something real fast, because early momentum is what keeps an adult beginner going (Getting started and the first practice drills).
3. **Substantial practice.** Then, for those who want it, deep, hours-long deliberate practice that builds genuine muscle memory. The interest tracks are week-long, ten-to-twelve-hour-a-day builds, currently a browser first-person shooter, a Unity first-person shooter, a web project, an app, and a generative-media pipeline.

The tracks are thin branches on a shared spine: the same shell, Git, project-instruction, verification, and agent-direction skills underneath, pointed at whatever a learner finds exciting enough to practice for a week.

Groundwork is the trailhead and first stretch, not the summit. It will not make someone an agentic engineer by itself; that takes years of judgment, design practice, review, security awareness, and taste. What it does is show the arc, set up the environment, and give learners their first serious practice aimed in the right direction.

## The Roost sibling

Groundwork has a sibling project, Roost: an AI-native platform monorepo that scaffolds an organization's code, process, and knowledge (shared packages, CI/CD gates, specs, repo governance, and agent rules). The division of labor is simple: Groundwork scaffolds the people, meaning their environment, fundamentals, and agent-direction skills, while Roost scaffolds the place they work. The shared verb is the positioning line: Roost scaffolds your company's code; Groundwork scaffolds you. They share one way of working: what Groundwork teaches a learner by practice (verify before claiming done, the human owns Git, direct agents deliberately), Roost encodes as machinery (CI gates, hooks, and enforceable rules). Each stands alone; neither requires the other.

## Operating Principles

These govern every page and every change, whether a human or an agent makes it.

1. Every tool page earns its place by answering at least one of two questions: how does an agent use this, or how does this help a human direct, inspect, or verify an agent's work? If neither applies, the page is a foundation, reference, or candidate for removal.
2. Interface tools such as editors, multiplexers, launchers, and browsers are presented as choices, not required curriculum. No page should imply someone is wrong for choosing VS Code over Neovim, tabs over tmux, or another capable tool over the local default.
3. Lead with the workflow and the why. Keystrokes, flags, package names, and config details are the how; they come after the reason they matter.
4. Anything new must state how it serves directing or supervising agents, or be explicitly labeled foundational. If it can do neither, it does not ship as part of an AI-native environment.
5. Meet adult beginners where they are. Write for a capable adult who may be new to development: define terms once, give a first successful path quickly, then offer substantial practice for those who want depth. Never gatekeep by prior experience, and never talk down.

## Working Agreement

For any agent making changes in this repo:

- Read this north star before broad docs, onboarding, tooling, or agent-instruction changes.
- Plan, then implement, then verify. State the plan before substantial edits; after editing, run the relevant check and report what ran.
- Make minimal, targeted changes. Do not refactor unrelated code, and never drop existing functionality when editing a file.
- Preserve good existing content. Improve framing and navigation before deleting material that still helps learners.
- Prefer repo skills for repeated workflows such as validation, docs alignment, chezmoi changes, and macOS defaults.
- Never write secrets, tokens, private handles, private affiliations, or machine-specific values into tracked files; use templates, ignored local files, or environment variables.
