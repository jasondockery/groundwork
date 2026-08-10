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

## Web user experience

For applicable public web surfaces, distinguish four kinds of evidence:

- **Core Web Vitals field SLO:** at the 75th percentile, evaluated separately
  for mobile and desktop, target LCP at or below 2.5 seconds, INP at or below
  200 milliseconds, and CLS at or below 0.1.
- **Lab measurement:** reproducible pre-release or exact-deployment evidence.
  It predicts and diagnoses behavior but is not real-user field evidence.
- **FCP and TTFB diagnostics:** 1.8 seconds or less is the good FCP target;
  0.8 seconds or less is a useful TTFB guide. Neither is a Core Web Vital, so a
  diagnostic miss does not independently redefine an otherwise accepted user
  experience.
- **Build and resource budgets:** deterministic shift-left regression guards.
  Derive byte, request, route, and client-execution limits from a measured
  product or framework baseline. Compass does not impose one universal
  JavaScript-byte budget.

Measure exact deployed routes before claiming deployed performance. Add field
monitoring after sufficient traffic exists; lack of pre-launch RUM is not a
reason to fabricate field acceptance.

Reviewed 2026-08-10 against the current
[Core Web Vitals guidance](https://web.dev/articles/vitals),
[FCP guidance](https://web.dev/articles/fcp), and
[TTFB guidance](https://web.dev/articles/ttfb).

Report before and after measurements, the affected identity, resource tradeoffs,
and what remains unmeasured.
