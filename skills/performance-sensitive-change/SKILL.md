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

## Native rewrite procedure

Use this procedure when a measured developer-tooling hot path may move to a
native implementation behind a stable ecosystem-facing interface.

1. Record a representative measured baseline and an explicit accepted cost
   target before selecting the implementation.
2. Freeze the stable external interface before implementation selection so the
   experiment cannot redefine success around its preferred mechanics.
3. Build differential fixtures for stdout, stderr, exit status, file effects,
   signals, timeout, cancellation, and every supported platform. Compare the
   reference and candidate at the same boundary.
4. Measure startup, p50 and p95 wall time, CPU, peak memory/RSS, I/O, artifact
   size, dependency closure/weight, clean and incremental build time, and CI
   duration/cost in a recorded environment and cache state.
5. Bind every prebuilt binary to source, toolchain, target, digest, and
   validation receipt provenance. Verify the bytes consumers actually receive.
6. Impose no consumer compiler or language toolchain unless a source-build
   capability is explicitly selected. Prebuilt use and source-build selection
   are distinct contracts.
7. Retain and test rollback to the reference implementation until equivalence
   and field evidence justify its removal. A build-time switch that is no
   longer exercised is not a rollback path.
8. Record an explicit accept or reject decision for every experiment. Rejection
   removes the experiment's unearned implementation and distribution footprint;
   acceptance records the measurements, equivalence evidence, provenance,
   rollback status, and remaining field boundary.

Agents make implementation work cheaper, but they do not reduce the behavioral,
platform, provenance, or field evidence required for equivalence.

## Web user experience

For applicable public web surfaces, distinguish five kinds of evidence:

- **Core Web Vitals field SLO:** at the 75th percentile, evaluated separately
  for mobile and desktop, target LCP at or below 2.5 seconds, INP at or below
  200 milliseconds, and CLS at or below 0.1.
- **Lab measurement:** reproducible pre-release or exact-deployment evidence.
  It predicts and diagnoses behavior but is not real-user field evidence.
- **Exact interaction-flow evidence:** interactive headers and active regions
  require zero unexpected layout shift in exact lab and user-flow proof across
  loading, hover, focus, current, pending, success, error, and value states.
  Assert bounding-box invariants for every stable control and active region,
  and capture every `LayoutShift` entry, including entries whose
  `hadRecentInput` is true. Exercise representative asynchronous refresh, text
  expansion, and right-to-left presentation instead of inferring stability
  from a page-wide score.
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

Keep field, lab, automated, and manual evidence claims distinct. The public-web
field target remains CLS at or below 0.1 at the 75th percentile, evaluated
separately for mobile and desktop; it does not replace the zero-unexpected-shift
requirement for exact interactive flows.

Reviewed 2026-08-10 against the current
[Core Web Vitals guidance](https://web.dev/articles/vitals),
[CLS optimization guidance](https://web.dev/articles/optimize-cls),
[FCP guidance](https://web.dev/articles/fcp), and
[TTFB guidance](https://web.dev/articles/ttfb).

Report before and after measurements, the affected identity, resource tradeoffs,
and what remains unmeasured.
