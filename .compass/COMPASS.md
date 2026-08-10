# Compass

## Simple first

Prefer one excellent normal path, strong defaults, progressive capability, and
small composable parts. Do not add settings, workflows, abstractions, providers,
modes, screens, dependencies, compatibility paths, or services for hypothetical
users. Complexity must be earned by a demonstrated requirement.

Evidence earns complexity; measurement keeps it.

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
