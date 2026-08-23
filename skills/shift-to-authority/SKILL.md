---
name: shift-to-authority
description: Move reusable cross-repository concerns to the canonical authority whose declared scope and lifecycle can maintain them. Use for substantial engineering reviews, field failures, cross-repository coordination, and release, projection, or adoption handoffs.
---

# Shift to Authority

Move a recurring standard, contract, implementation, or proof requirement from
consumers to the canonical owner best positioned to maintain it.

Before classifying or reporting, load the projected `authority-policy.json` and
`authority-registry.json`. Treat the policy as normative for terms, scopes,
states, relationships, review classes, and new-authority prerequisites. Treat
the registry as authority-owned candidate and issuance truth. Do not copy those
tables into product policy.

Validate a consumer reconciliation against one complete projected authority in
one dependency-free command. For adopted records, provide a repository-scoped
`GH_TOKEN` or `GITHUB_TOKEN` with Actions read, Checks read, Contents read, and
Metadata read access. The fixed GitHub Actions adapter retrieves the prior
reconciliation, commit tree, exact run attempt, job, check/app, artifact,
archive, and receipt itself and fails closed when provider evidence is
unavailable or exceeds a bounded deadline:

```bash
node .compass/check-authority-record.mjs \
  --projection-root . \
  --consumer-root . \
  --reconciliation-path <repository-relative-consumer-record>
```

Direct consumers create and own their reconciliation record from
`consumer-reconciliation.schema.json`. The single invocation derives policy,
registry, and receipt from that root, runs full projection-integrity
verification, and cross-binds the candidate, issued state, relationship,
seven-dimensional identity, consumer state, and authenticated hosted evidence.
Caller-supplied or preexisting receipt bytes are diagnostic only. A projected
registry never supplies a shared consumer state, and Compass's observational
`consumers.json` never substitutes for a consumer reconciliation record.

Finalize adoption in two phases. First commit the canonical record at
`pending-adoption` with complete local reconciliation, the exact authority
relationship, and a record-level snapshot of the hosted-proof contract; run the
required hosted gate at that commit. The consumer-level contract remains the
default for newly pending candidates. The later record may change that candidate only by adding
the final `pending-adoption` to `adopted` transition and hosted evidence. The
validator retrieves the prior file from the provider-proven commit at the same
repository-relative path and requires the consumer identity, contract,
relationship, authority identity, local reconciliation, and prior transition
history to match. A later change to the consumer-level default does not rewrite
or invalidate the candidate's historical snapshot.

## Decide and repair

Repair an urgent local defect immediately. The repair may implement the
smallest safe behavior, but it must not establish a competing shared authority.
Shift to Authority must not launder, delay, or block that repair.

Ask whether the concern recurs, affects multiple or generated consumers, fits
an existing authority's declared scope, is stable rather than experimental,
and can be tested generically at that layer. Compass candidates must remain
independent of product, framework, provider, and deployment choices. Importance
or reuse within one existing authority does not create a candidate; when that
authority owns every finding, report `none` and keep the work there.

Do not strand qualifying generic doctrine as independently maintained consumer
policy. Do not move product APIs, routes, framework or library choices,
provider adapters, supported-platform mechanics, generated implementation,
dependency automation, or deployed acceptance outside the authority that owns
that layer. A new authority requires every prerequisite in the normative policy
and an explicit owner decision; nomination never creates a repository.

## Advance and issue

Follow the lifecycle from the normative policy. Keep authority candidate state
and each consumer's state in different records. An issued candidate must bind
the concrete projected path, schema, and repository of its containing receipt.
The canonical validator derives that receipt's exact seven-dimensional identity
from the single projection root. It cross-binds that identity to each direct
consumer reconciliation. For GitHub Actions it also binds the provider-reported
commit tree; fixed app identity; exact run, attempt, job, and check; one uniquely
named `{runId}`/`{attempt}` artifact created during that job; downloaded byte
count and digest; and the parsed hosted receipt. The candidate also records
completed authority incorporation and reconciliation. Ordered
transition history preserves prior states; the current record never pretends a
historical nomination is current.

When an issued candidate carries immutable authority epochs, source may contain
one final `pending-containing-receipt` epoch because it cannot embed its own
future artifact digest. That source state is not consumable as issued. After
the exact artifact receipt exists, derive the external issued-epoch record with:

```text
node .compass/check-authority-record.mjs \
  --projection-root . \
  --print-authority-epoch-resolution <sta-candidate-id>
```

The command binds the sequence, invariant, canonical skill path and digest, and
complete containing artifact identity. Direct consumer records bind that
resolved sequence and exact identity. The next authority source archives the
derived issued identity before adding another pending epoch; it never rewrites
earlier epochs.

The hosted receipt is produced before artifact upload. It contains only
precomputable consumer, run, job/check, artifact-name, receipt-path, and result
fields. The provider-assigned artifact ID plus archive and receipt digests belong
only in the post-run adopted reconciliation.

Consumer movement is prohibited until an issued identity-bound handoff exists.
Silence, dirty working bytes, another consumer's result, or a mechanically green
identity on an adoption hold is not acceptance or adoption. Before adopted
proof exists, call the local record a consumer reconciliation record. Only a
complete cross-bound adopted record is adoption evidence. Once adopted,
reconcile provisional duplicated policy locally.

Treat every `historical-not-adoptable` registry hold as immutable diagnostic
history only. A source-code defect requires a source-wide hold keyed by
repository, commit, tree, and fingerprint; reject every receipt for that source,
including unseen variants. Bind the repository to the authority's canonical
policy repository. Preserve every known seven-dimensional receipt as observed
evidence beneath that hold and reject duplicate observations; keep the required
observation array empty when the defect predates any receipt. Use an
exact `artifact-receipt` hold only for an artifact- or receipt-local defect; it
must not widen to other receipts for the same source. Require a later successor
to record every known affected source and observed identity before handoff.

## Report

Emit exactly one `Shift to Authority candidates` field for the review classes
listed in the normative policy. Small reviews and ordinary status messages do
not require the field. When none qualify, emit only:

```text
Shift to Authority candidates:
- none
```

For candidates, generate the current field list from the projection instead of
copying a template:

```text
node .compass/check-authority-record.mjs \
  --projection-root . \
  --print-review-template
```

Never combine `none` with candidates. Preserve the stable `sta-...` ID and
record honest local repair and local reconciliation status.

## Reconcile relationships

Every actual consumer owns one record conforming to the projected consumer
schema. A direct relationship binds the exact Compass identity. A relationship
through another authority requires its complete registry and receipt bundle via
one repeated `--upstream-projection-root <root>` argument per intermediary,
binds that upstream authority's exact identity and Compass-policy repository,
and does not claim direct Compass adoption. A caller-created self-signed
intermediary is invalid. A truly inapplicable relationship gives an exact
reason. Deferred work requires the schema's owner-bound disposition and never
claims adoption or conformance.
Each repeated `--upstream-projection-root` adds one unique intermediary in
command order. The canonical validator resolves governed roots before rejecting
canonical duplicates, rejects symlink aliases, and accepts at most eight, so
intermediary validation remains explicitly bounded.

The projected JSON Schemas validate portable structure. The projected
executable is the normative semantic validator for transition order, sequence,
terminal state, authority binding, and hosted provenance. One absolute deadline
covers the complete provider validation, including pagination and body reads.
Authenticate each unique exact hosted-evidence bundle once per invocation, then
validate every candidate's transition and receipt binding independently against
that authenticated result. Any evidence mutation is a distinct bundle and must
fail closed unless it independently proves the complete contract.

Hatch relates to Compass through Roost, not by direct Compass projection.
