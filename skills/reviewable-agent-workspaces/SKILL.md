---
name: reviewable-agent-workspaces
description: Keep agent work in an explicit, human-reviewable workspace with one active writable ownership principal and its declared process tree per worktree, declared modes and scope, complete diff visibility, branch-backed recovery, and lossless cleanup. Use before editing code or documents, delegating parallel work, choosing a branch or worktree, running proof in a detached or temporary checkout, reporting progress, committing remote work, integrating concurrent lanes, transferring ownership, relocating a task, or cleaning up an agent workspace.
---

# Reviewable agent workspaces

Implementation must stay visible through the human review surface declared for
the task. A native agent worktree is allowed when its session exposes the
complete diff and its branch or commit is recoverable and protected; hiddenness
alone is not the test.

Load `shift-to-authority` for substantial reviews, cross-repository work, and
handoffs. Load `verification-selection` when choosing proof. Apply both without
copying their contracts here.

Load `concurrent-agent-runtimes` before starting or diagnosing concurrent
processes or ambient resources. Keep runtime policy in that canonical skill.

## Declare the workspace

Before editing, report:

- mode: `read-only`, `implementation`, `proof`, or `integration`;
- repository, exact base SHA, branch, current commit and tree;
- normalized local `file:` worktree URI and writable scope;
- human review surface and runtime namespace; and
- owner, checkout cleanliness, and any writable lane already occupying it.

For local interactive work, use the workspace attached to the user's task or
editor. Native agent worktrees are implementation workspaces only when their
complete diff is review-visible and a named branch or commit makes the work
recoverable. Manual implementation worktrees use stable non-temporary locations
such as `~/worktrees/<repository>/<lane>`. Do not silently relocate an
implementation root. If the declared workspace is dirty or occupied by
unrelated work, report the exact paths and stop; never stash, reset, overwrite,
relocate, or hide those bytes without authority.

## Preserve reviewability

1. Assign exactly one active writable ownership principal and its declared
   process tree to each worktree. Formatters, generators, tests, and hooks may
   write only as descendants or explicitly governed helpers of that principal;
   they do not become independent writers. A named lane never permits
   simultaneous writable principals. Read-only observers may share
   it, but they do not mutate its source, index, branch, configuration, or
   runtime resources. Ownership transfer is explicit: the prior writer stops,
   reports its exact state, and names the successor before the successor writes.
   Parallel writable lanes use distinct named branches and worktrees with
   declared review surfaces.
2. Keep the implementation root stable. Any authorized move requires a new
   declaration before writing at the new root.
3. Report progress with path, branch, base SHA, current commit and tree, owner,
   writable scope, runtime namespace, and review location. A status message
   must not conceal where uncommitted bytes live.
4. Make the complete pre-commit diff visible in the declared review surface.
   Staged state alone is not a complete review surface.
5. Checkpoint substantial work to an early remote branch or draft review
   request before accumulating hours of local-only changes. A remote agent may
   commit first only when that branch or review request is the declared review
   surface. At transfer or cleanup, prove the current commit—not only the early
   checkpoint—is reachable from the declared remote branch or review request.
   Query the configured remote transport and bind its host, repository, branch,
   and exact commit. A local remote-tracking ref is stale-capable observation,
   never live reachability; unavailable or ambiguous remote state fails closed.
6. Assign one integration owner to reconcile concurrent lanes. That owner
   reviews each complete lane diff and resolves ordering and conflicts without
   letting one lane overwrite another.
7. Remember that ordinary Git configuration is shared by linked worktrees.
   Use `git config --worktree` only after enabling the repository's worktree
   configuration support and only for an intentionally worktree-specific
   setting; never assume a local config edit is isolated by default.

## Separate proof workspaces

`/tmp`, `/private/tmp`, caches, and detached worktrees are proof-only. Use them
for exact-SHA validation, packing, reconstruction, consumer fixtures,
corruption tests, and idempotence tests—not for authoring source changes.

A proof worktree is clean, identity-bound, source-read-only for the proof, and
disposable. Proof output may be written outside its source tree. If proof
reveals a fix, reimplement it in the declared writable lane and review that
lane's diff; never promote hidden proof-worktree edits into implementation.

## Clean up safely

Before removing a branch or worktree, prove that every unique byte is committed,
remotely reachable, and visible or reviewed as required; prove that no staged,
unstaged, or untracked implementation byte will be lost; and name the cleanup
owner. Never automatically reset, stash, force-remove, prune, or delete a dirty
or unique worktree. If reachability, ownership, cleanliness, or review status is
uncertain, preserve the workspace and report it.

## Report

An implementation or integration ownership transfer uses handoff schema version
4, which supports POSIX macOS and Linux only; Windows fails validation before
repository inspection. It contains the complete canonical core:
schema and version; platform; repository, mode, base SHA, branch, worktree URI,
writable scope,
owner and optional integration owner; structured review surface; structured
runtime namespace; commit/tree; changed paths; verification; structured remote
checkpoint with its remote ref and both the early and current reachable
commits; a clean writable checkpoint; structured worktree cleanliness;
structured owned-resource closure; and
cleanup owner. Use explicit reasoned `not-applicable` objects where the runtime
namespace or owned-resource closure does not apply.
Read-only triage uses the smaller read-only record. Proof uses its proof record
with structured branch state and no writable scope or repository changes.

Validate its structure with the projected checker's
`validateReviewableWorkspaceHandoff` export and validate its actual checkout,
configured remote host and repository, ancestry, HEAD/tree, branch, live remote
reachability, cleanliness, and full Git path inventory with
`validateReviewableWorkspaceHandoffRepository`. The repository verifier queries
the remote transport; a cached `refs/remotes/*` value alone cannot pass.
Repository-specific evidence may
appear only in its versioned, namespaced `consumerEvidence` object; it never
adds an alternate top-level state or replaces a canonical field.

Keep tool-specific workspace, editor, branch-publication, and review mechanics
in their owning repository.
