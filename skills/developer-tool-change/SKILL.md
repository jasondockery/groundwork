---
name: developer-tool-change
description: Establish operable developer-tool adoption through purpose-aware defaults, supported-platform configuration, safe ownership, effective behavioral proof, rollback, and removal. Use when adding, upgrading, replacing, configuring, or removing a terminal tool, browser, editor, AI runtime, language manager, picker, linter, formatter, Git client, or similar developer tool.
---

# Developer tool change

An executable is not an adopted tool. Prove that the installed version supports
its intended workflows with deliberate defaults, discoverable controls, safe
configuration ownership, effective behavior, recovery, and known limitations.

Load `shift-to-authority`, `dependency-change`, and `verification-selection`.
Load `secure-by-design`, `privacy-by-design`, and
`performance-sensitive-change` when their boundaries apply. Use those
procedures without copying them here.

## Reconcile the tool

1. Create an explicit per-tool mapping from each intended behavior to recovery,
   supported-platform applicability, configuration ownership, and effective
   evidence IDs. Broad inventory prose and executable presence are not proof.
2. Pin the reviewed tool version. Inspect every material upstream default and
   record the review date, source evidence, deliberate disposition, and upgrade
   trigger that invalidates the review. Do not presume a default is suitable.
3. Configure each supported platform through its owning authority. Merge or
   migrate user-owned configuration, or report a conflict; never silently
   overwrite it. Validate every parent component of a user-owned target.
4. Keep discovery purpose-aware. Browsers, managers, pickers, and search expose
   relevant project state through an obvious escape hatch while ordinary search
   respects ignore rules. Broad discovery must never silently broaden a
   destructive operation.
5. Execute the actual user-facing surface in isolated home and configuration
   state. Do not infer behavior from checked-in templates, rendered strings,
   package inventory, or an equivalent raw command. Cover every claimed
   supported platform and clean isolation state on success, failure, and
   signals.
6. Prove safe interaction, interruption, recovery, limitations, and effective
   installed behavior. A formatter or similar tool with no configuration still
   requires an explicit default disposition and behavioral evidence.
7. Prove rollback and race-safe removal. Remove only authority-owned
   configuration and preserve user-owned files and parent paths.
8. Document the intended workflows, material-default decisions, escape hatch,
   platform limits, ownership, evidence, rollback, and removal. Apply the Shift
   to Authority candidate review for the applicable review class; urgent local
   repair never waits for promotion.

## Report

Record the exact tool and version; the per-tool behavior map; reviewed defaults,
date, sources, and invalidation trigger; platforms; configuration ownership and
conflicts; executed evidence IDs; recovery and escape hatch; limitations;
rollback and removal proof; and the Shift to Authority result.
