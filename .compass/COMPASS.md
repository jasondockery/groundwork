# Compass

## Simple first

Prefer one excellent normal path, strong defaults, progressive capability, and
small composable parts. Do not add settings, workflows, abstractions, providers,
modes, screens, dependencies, compatibility paths, or services for hypothetical
users. Complexity must be earned by a demonstrated requirement.

Evidence earns complexity; measurement keeps it.

## Foundational identity and reference authority

Foundational identity and reference concepts have one canonical authority.
Preserve these separations:

- Person or organization identity is not an authentication principal.
- A business role is not an authorization grant.
- A canonical entity is not an external or source-system identifier.
- A reference system is not a context-specific selection.
- Foundational authority is not an application-specific convenience model.
- Identity remains separate from mutable names, labels, paths, locations,
  revisions, provider identifiers, credentials, and presentation.

A reference is a context-bound locator that resolves to identity, not a
substitute for identity. Applications must not establish competing generic
people, organization, user, role, or lookup-list foundations after the
corresponding shared capability is selected.

Keep the shared authority technology-neutral. Concrete schemas, persistence,
commands, provider mechanics, and application fields remain with the product
that owns them.

## Optional capability and provider boundaries

Selection is an architectural boundary, not merely a feature flag. An
unselected capability contributes zero implementation dependencies, binaries,
runtime configuration, environment variables, credentials, secrets, workflows,
infrastructure, network requests, persistent data, generated application
authority, installation work, build work, runtime work, or consumer toolchain
requirements.

Capability absence must be observable through construction, distribution,
verification, operation, removal, and recovery. A default, transitive,
generated, dormant, or conditionally unused capability contribution is still a
footprint.

Provider conformance has two independent requirements.

First, an unselected provider contributes zero consumer-owned authority or
behavior: no adapter, configuration, credentials or secrets, workflows,
infrastructure, deployment commands or destinations, network behavior,
persistent state, or consumer-owned imports. A package namespace alone neither
selects a provider nor authorizes its behavior.

Second, a selected provider's governed dependency closure may include
explicitly declared transitive implementation packages even when a package
namespace names another provider. Every such byte remains supply-chain
footprint; it is not zero footprint and does not confer authority for the named
provider.

Bind the complete selected-provider closure to an exact transitive SBOM,
version, digest, license, advisory status, and validation receipt. Prove no
consumer-owned authority or behavior for an unselected provider, no network
requests to it, and no client or SDK code for it in the deployed artifact.
Removing the selected provider removes its complete transitive closure.
Permitted closure changes fail closed until the new closure and deployed bytes
pass the same evidence.

A temporary exception cannot convert either failed provider requirement into
conformance. Changing these semantics requires a new Compass identity and new
consumer projections.

## Proven provider neutrality

A supposedly generic provider seam is provisional until at least two real
implementations prove the common lifecycle.

First-provider mechanics remain provider-owned. Promote only lifecycle
semantics demonstrated by both implementations into shared core, including
selection, operation, failure, replacement, removal, unselected-provider
authority and behavior, and governed dependency closure. Similar names or a
hypothetical second provider are not evidence of neutrality.

## Native hot paths with stable interfaces

Prefer native implementations for measured developer-tooling hot paths while
retaining stable ecosystem-facing interfaces.

Agents make rewrites cheaper. They do not make equivalence cheaper.

Choose an external contract before choosing an implementation. A native
experiment earns adoption only through measured improvement, complete
differential equivalence, provenance-bound distribution, a tested rollback
path, and an explicit accept or reject decision. Consumers own the language,
toolchain, packaging, budgets, and rollout. An unselected source-build
capability must not impose a compiler or language toolchain on consumers. The
projected Compass checker remains dependency-free JavaScript; it is not a
native-rewrite candidate.

## Fast by design

Performance is product behavior. Account for user latency, developer waiting
time, local startup, build and test time, CI and deployment duration, CPU,
memory, storage, network transfer, cloud resources, and dependency weight.
Correct obviously avoidable costs when they are introduced instead of deferring
them to a generic optimization phase.

## Efficient by default

Spend resources in proportion to user value. Avoid duplicated computation,
unnecessary data movement and CI work, redundant builds, oversized artifacts,
gratuitous dependencies, and unnecessary services.

Run work at the cheapest correct boundary. A remote data owner, database, or
search service filters, sorts, projects, aggregates, and pages remote or
potentially unbounded collections. A server or API authorizes, validates, and
exposes a bounded contract. A browser renders that bounded result. Bounded
already-local collections may be manipulated locally when that is simpler.

## Bound the work

Give finite work a defensible bound where applicable: time, retries,
concurrency, processes, memory, disk, pagination, records scanned, network
requests, and artifact or log size. A retry count without a cumulative deadline
is still unbounded. Unbounded work requires explicit justification.

Distinguish a hard deadline, a quiet or stall threshold, a performance budget,
and an outer workflow timeout; they require different responses. Cancellation
owns the complete child or request tree, preserves original failure evidence,
and reports a recovery action.

## Evidence earns architecture

Measure the constraint before introducing a cache, queue, distributed service,
extra infrastructure, abstraction, configuration surface, or provider. Keep
the added mechanism only while evidence shows it earns its operational and
cognitive cost.

## Verification is part of efficiency

Test behavior at its natural execution boundary and use the cheapest reliable
proof that establishes the failure mode. More tests are not automatically
better; each test must justify both the confidence gained and its resource and
time cost.

Preferred boundaries for the current TypeScript and JavaScript ecosystem are:

| Behavior | Preferred proof |
| --- | --- |
| Pure logic or domain behavior | Vitest or an equivalent unit runner |
| Browser-dependent component behavior | Vitest Browser Mode or equivalent real-browser component proof |
| Composed application or user journeys | Playwright or equivalent end-to-end browser proof |
| Shell, CLI, or process behavior | Executable script tests with hostile fixtures |
| YAML, workflows, or configuration | Parser, schema, and semantic or policy checks |
| JSON contracts and configuration | Schema plus semantic contract tests |
| Generated files and templates | Generation plus parity or drift checks |
| Database semantics | Integration at the real relevant database boundary |
| API contracts | Focused contract or integration tests |
| Distributed packages and artifacts | Clean packed external-consumer proof |
| CI/CD | Static validation, repository-command proof, and hosted exact-SHA execution when hosted execution is the acceptance boundary |
| Deployment | Bounded smoke or browser acceptance against the exact deployed SHA |

Equivalent tools are valid when another stack requires them. Do not force every
technology into every repository. A test that exists but is not discovered by
canonical verification is not coverage.

CI and local proof should fail fast, run independent work concurrently, avoid
duplicate proof, reuse trustworthy deterministic computation, use dependency or
affected awareness, cancel obsolete work, and cache only while correctness
remains explicit. Measure suite, job, build, and deploy duration. Do not solve
an economics failure by merely raising a budget. CI minutes and developer
waiting time are finite engineering resources.

Quality moves left until the cheapest reliable boundary owns it. What cannot be
automated remains an explicit human acceptance boundary, not an omitted
requirement or an automated claim that exceeds its evidence.

## Secure by default

Minimize attack surface and privilege. Protect secrets and sensitive data,
validate trust boundaries, prefer verified dependencies and immutable
provenance, and fail closed when a required security control cannot be
established. Keep security mechanisms proportional to the demonstrated threat;
security does not justify speculative architecture.

## Fail explicitly and recover cleanly

Do not silently bypass a policy because it cannot be enforced. Do not mask a
meaningful child, signal, pipeline, or failure status. Cleanup and recovery are
bounded, idempotent where applicable, and preserve the first authoritative
failure.

A field failure is evidence that the earlier proof boundary was incomplete.
Reproduce it cleanly, explain the divergence, repair the cause, shift prevention
to the cheapest reliable earlier boundary, propagate the pattern to generated
consumers, and retain red and green evidence.

## Reproducibility and provenance

Distinguish working-tree proof, exact-commit proof, hosted exact-SHA proof, and
deployed acceptance. No lower level implies a higher one. Distributed and
generated artifacts bind to immutable source identities, include checksums and
provenance, and are proven through the bytes consumers actually receive.

## Owner-controlled working state

The working tree, index, untracked paths, branches, stashes, and history are
owner-controlled state. Whether a change is staged or unstaged does not
establish ownership, task scope, approval, or permission to commit it. A human
may stage or unstage changes for review without transferring authority over
them.

Preserve pre-existing owner state. Do not normalize, stage, unstage, reset,
stash, clean, amend, rebase, or force-push unrelated state. Determine task
ownership from the task's authority and the observed baseline, not from the
index.

When Git mutation is authorized, inspect the complete task diff independently
of staging, stage only task-attributable changes, and avoid broad staging such
as `git add -A` when unrelated state exists. Do not sweep unrelated staged
content into a task commit. If owner and agent changes in the same file cannot
be separated safely, stop for owner direction.

Branch, ruleset, review, required-check, and bypass decisions are owner
authority and are never inferred from technical access. Each repository owns
its autonomy model, including whether an authorized agent may commit and push
or must stop at a review boundary.

## Shared by authority, specialized by ownership

Universal doctrine comes from Compass. Repository-specific architecture,
product behavior, migrations, non-goals, commands, budgets, and procedures stay
owned by the repository. A repository may narrow or extend a shared procedure
for its own domain, but it does not independently redefine the shared rule.

Derived projected bytes are intentional: they make each checkout complete and
offline-capable. Their receipt and drift check preserve Compass as the authority.

## Skill authority and discovery

Compass owns the canonical regular files under `skills/<name>/` and the generic
projection conformance checker. Each repository owns how those canonical skills
are exposed to tool-specific discovery paths. A repository may use a proven
symlink adapter, a generated physical pointer or adapter, or a tool-native
configuration mechanism, provided the adapter contains no independent policy
and repository validation detects discovery or drift failures.

Tool-discovery adapters are outside Compass-managed namespaces and may be
symlinks when repository and tool policy permit them. Compass-managed projected
files and directories remain regular, non-symlink filesystem entries. Prose
that merely mentions a skill is documentation, not mechanical discovery, and
is insufficient for a tool that requires a discovery path or adapter.
