---
name: performance-sensitive-change
description: Design or review work that may affect user latency, startup, build, test, CI, deployment, CPU, memory, storage, network, cloud resources, artifact size, or dependency weight. Use before adding caches, concurrency, background work, large data movement, services, or performance budgets.
---

# Performance-sensitive change

1. State the user or developer outcome and the cost surface before proposing an
   optimization.
2. Measure a representative baseline. "Slow" and "large" are hypotheses until
   measured; record environment and cache state.
3. Remove unnecessary work first: duplicated computation, redundant proof,
   avoidable data movement, unused dependencies, repeated builds, and oversized
   artifacts.
4. Run work at the cheapest correct boundary. Keep filtering, sorting,
   aggregation, projection, and pagination with the owner of remote or
   potentially unbounded data; render bounded results at the client.
5. Bound time, retries, concurrency, processes, memory, disk, requests, records,
   and output where applicable. Separate hard deadlines, stall observation,
   performance budgets, and outer safety envelopes.
6. Add a cache, queue, service, abstraction, provider, or infrastructure only
   after evidence shows the simpler path cannot meet the requirement. State
   invalidation, failure, cleanup, and removal conditions.
7. Re-measure the exact changed path and its correctness proof. Keep the added
   complexity only while the result earns its operational and cognitive cost.
8. Treat a budget regression as engineering work. Do not obtain green merely by
   raising the budget or deleting proof.

Report before and after measurements, the affected identity, resource tradeoffs,
and what remains unmeasured.
