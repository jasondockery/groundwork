---
name: concurrent-agent-runtimes
description: Keep concurrent repositories, worktrees, developer tools, and AI agents correct through explicit run-owned runtime identities and isolated resources. Use before starting dev servers, tests, browsers, databases, containers, worktrees, bounded subprocesses, ports, sockets, temporary roots, cloud stacks, or heavy-host scheduling, and before diagnosing another agent or repository's processes.
---

# Concurrent agent runtimes

Assume unrelated repositories, developers, and agents remain active.
Correctness must never require an otherwise idle host. Never stop, reuse,
mutate, or clean up a process or resource the current run does not own.

Load `reviewable-agent-workspaces` to preserve the visible implementation and
disposable proof-worktree boundaries. Load `verification-selection` to select
proof. Apply both without copying their contracts here.

Load the projected `agent-routing-surfaces.json` before routing. Treat it as the
machine-checked inventory of supported and explicitly unsupported tool
surfaces. “All supported tools” prose is not an inventory. Keep policy only in
this skill; instruction pointers and discovery adapters remain route-only.

## Declare and isolate the run

Before starting, declare the repository, worktree, agent or run ID, process or
PID group, ports and database endpoints, IPC or socket names, container and
emulator namespaces, cloud stack or account-local names, and temporary, state,
cache, log, receipt, and artifact roots. Bind every runtime resource to that
repository, worktree, and run identity.

1. Allow predictable ports for intentional interactive services. Automated
   proof allocates or race-safely reserves isolated endpoints and never assumes
   a conventional port or fixed database endpoint is free. Never find a free
   endpoint, release it, and start later. The owning process binds the endpoint
   directly, or a reservation stays held until an identity-bound handoff
   transfers ownership without exposing an allocation race.
2. Start and own every service the run needs. Bind readiness to the spawned
   runtime identity and authenticate that exact run identity; an open port or a
   responsive unrelated listener is not readiness.
3. Scope temporary paths, IPC sockets, mutable state, logs, receipts, artifacts,
   and mutable caches to the run or workspace. Share a cache only under documented
   concurrency and integrity guarantees.
4. Give container projects, networks, and volumes; emulator namespaces; and
   cloud stacks or account-local resources unique names derived from stable
   repository, worktree, and run identity.
5. Keep a resource lease about CPU, memory, or I/O pressure only. A lease never
   establishes correctness or authority over another runtime.
6. Treat frozen or source-clean as a mutation boundary, not a claim that the
   host has no intentional runtime processes.

## Prove ownership and coexistence

Run canonical proof in the normal strict environment while unrelated listeners
and processes occupy conventional resources. Cover simultaneous worktrees and
runs, allocation races, stale resources, partial startup, PID reuse or
uncertain ownership, temporary-path and socket collisions, and uniquely scoped
container or cloud resources.

Cleanup only exact run-owned descendants and resources. Preserve all unowned
processes and bytes, fail closed when ownership is uncertain, and report
cleanup with a cleanup receipt bound to the run identity. A loose or ambient
mode is diagnostic unless the claimed normal environment deliberately uses it.

## Keep implementation local

Repository specifications and harnesses own concrete process, endpoint, path,
socket, container, cache, cloud, cleanup, and platform mechanics. Optional
machine observability may assist diagnosis, but no repository depends on a
separate environment authority for correctness. Report any reusable gap through
`shift-to-authority`; urgent local repair does not wait for promotion.

When no concurrent runtime resource is started or inspected, add no tool,
service, dependency, daemon, configuration, state, or cleanup footprint.
