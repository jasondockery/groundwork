---
name: ai-backend-change
description: Govern replaceable AI workload implementations with explicit capability, identity, fallback, privacy, evaluation, rollback, and removal evidence. Use when adding, evaluating, selecting, routing, replacing, upgrading, or removing a model, inference backend, adapter, fallback, model artifact, or generated AI integration.
---

# AI backend change

Apply `ai-workload-policy.json` as the normative contract. Keep product code on
named workload and capability contracts; do not create a vendor-named shared
abstraction or a universal lowest-common-denominator client.

Load `shift-to-authority`, `dependency-change`, `privacy-by-design`,
`secure-by-design`, `performance-sensitive-change`, and
`verification-selection`. When a user-facing UI or CLI is affected, also load
the applicable accessibility, internationalization, and content skills. Use
their procedures without copying them here.

## Change the selection

1. Name the stable product workload and enumerate every required capability,
   including unsupported behavior that must fail planning or startup.
2. Record the accepted selection for each affected environment and hardware
   class. Keep model, backend, optional adapter, locality, and fallback policy
   observable. Treat mutable aliases as discovery inputs, not accepted identity.
3. Add a new model or backend as `candidate` without changing the accepted
   selection or default. Discovery automation may nominate but never promote.
4. Bind exact model, artifact or hosted identity, provenance, license, model
   card, advisory state, privacy boundary, runtime, adapter, platform, and
   evaluation receipt. Never auto-download large weights; disclose transfer,
   disk, RAM, VRAM, and removal effects before explicit selection.
5. Prove adapter conformance to the named workload capabilities. Provider or
   protocol compatibility alone is insufficient. Fail closed on missing tool,
   modality, structured-output, streaming, cancellation, timeout, health,
   offline, or context behavior.
6. Evaluate representative workloads and platforms. Record task success, tool
   reliability, output and failure behavior, p50 and p95 latency, resource use,
   cost, privacy and retention, license and provenance, offline behavior, and
   full rollback and removal.
7. Obtain owner review before moving `candidate` to `accepted` or `default`.
   Promote per workload; different workloads may keep different selections.
8. Default fallback to none. A local-to-hosted or processor-to-processor
   fallback requires explicit product policy, applicable privacy review,
   observable effective selection, and fail-closed boundaries.
9. Prove complete removal: an unselected adapter, backend, or model leaves zero
   dependency, configuration, credential, workflow, download, runtime,
   persistent, or network footprint. Preserve exact rollback and removal
   receipts.

## Report

Record the workload and capability contract; previous, candidate, and effective
selections; exact identities; fallback and data boundary; evidence and owner
decision; rollback and complete-removal proof; exact receipts; and unresolved
acceptance boundaries. Use the Shift to Authority review field where its review
class applies. Important implementation findings that remain wholly within an
existing Roost or Groundwork authority correctly report `none`.
