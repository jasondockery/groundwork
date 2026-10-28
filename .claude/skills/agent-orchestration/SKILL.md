---
name: agent-orchestration
description: Coordinates several delivery lanes with one coordinator, maker agents in their own worktrees, and one shared independent reviewer, covering lane assignment, maker briefs, supervision through delivery, blocker recovery, merge order, status, session handoff, escalation, reviewer persistence, and model tiers, effort, and plan-aware usage budgets with their evaluation. Use when one session runs or supervises more than one lane, delegates work to subagents, chooses a model tier or reasoning effort for any session, budgets usage against plan limits, replaces a maker or reviewer, or hands a coordinating session to a fresh one. Not for the delivery steps of a single undelegated lane (use independent-code-review and github-delivery-workflow directly), and not for the review procedure itself (use independent-code-review).
---

# agent-orchestration adapter

Load `../../../skills/agent-orchestration/SKILL.md` as the canonical procedure.
This adapter contains no independent policy.
