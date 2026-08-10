---
name: field-failure-backpressure
description: Repair a defect first observed outside normal local verification and shift prevention to the earliest reliable boundary. Use for failures from hosted CI, another platform, generated consumers, hooks, releases, deployments, cloud environments, or user reports that local proof missed.
---

# Field-failure backpressure

1. Bind the incident to its exact source, environment, run or attempt, and first
   authoritative failure.
2. Reproduce the failure cleanly at the cheapest equivalent boundary. Remove
   stale outputs or caches that could hide the divergence.
3. Explain exactly why normal local proof passed. Treat that divergence as part
   of the defect.
4. Fix the root cause without weakening the policy, assertion, deadline, or
   acceptance boundary.
5. Add prevention at the earliest reliable local boundary. Prove the guard can
   fail before trusting its green result.
6. Propagate a shared pattern to generators, templates, or shared machinery so
   future consumers do not depend on agent memory.
7. Audit sibling applicability read-only and with bounded evidence. Change
   another repository only under its own authorization and review unit.
8. Improve the operational evidence when the original failure was hard to
   diagnose, while keeping reporting unable to change the authoritative result.
9. Record red reproduction and green exact-identity proof in the environment
   that exposed the defect.

Do not call a rerun of the failing source a repair proof. The repaired source
needs its own exact evidence.
