---
name: docker-lifecycle
description: Keep local Docker verification builds disposable and cleanup bounded. Use before changing a Dockerfile, running a local image build for Groundwork, changing Docker build or cleanup helpers, or documenting an agent Docker workflow.
---

# Docker Lifecycle

Treat disposability as a build-time fact. A proof-only image deletes itself in
the session that created it; Groundwork's label-scoped tidy is only the safety
net for interrupted sessions.

## Classify the build first

Choose one lane before running Docker:

```text
Proof-only build, no container run needed
  groundwork-docker-build-scratch <purpose> <context> --rm-after

Proof needs a container run
  scripts/verify-docker-image
  (other repositories use their own repo-owned build-run-clean command)

Runnable Groundwork image the owner intends to keep
  docker build -t groundwork .
```

The first two lanes are verification state. The last is a consumable artifact
and must not inherit scratch labels.

## Proof-build contract

- Use `groundwork-docker-build-scratch`; do not hand-type lifecycle labels or
  scratch tags.
- Use `--rm-after` whenever build success is the complete proof.
- When this repository's proof must run the image, use
  `scripts/verify-docker-image`. Its trap owns the named `--rm` container and
  exact image ID plus proof that its expected tag was neither retained nor
  repointed across success, smoke failure, and signals. A repository
  that builds a different image owns an equivalent command beside its tests.
- Retain a scratch image only for active diagnosis. The handoff must name the
  tag, why it remains, and the exact non-force removal command.
- Never use ad hoc validation tags such as `groundwork:test`,
  `groundwork:dust-test`, or `groundwork:review-fix`. They sit outside both
  cleanup lanes.
- Never retag a scratch image into a real name. Labels live on the image and
  survive a retag; rebuild the real artifact instead.

## Cleanup boundaries

```text
Same session
  remove the exact scratch image created by the proof

update-all
  groundwork-docker-tidy --automatic (internal mode)
  aged, explicitly labeled scratch images and exited labeled containers only
  when the selected macOS backend is stopped: interactive consent may start
  that backend for this lane, bounded readiness is required, and every exit
  path restores the original stopped state

Owner review
  groundwork-docker-cache-tidy
  legacy tagged validation images reported by groundwork-doctor --docker
```

Never run `docker system prune`, automatic volume cleanup, or
`groundwork-docker-cache-tidy --yes` from an agent or scheduled/update path.
The Docker daemon is shared by every repository; broad stopped-container,
dangling-image, builder-cache, and volume decisions require the owner.

`update-all` owns only the backend selected by the rendered machine profile:
Docker Desktop on a personal Mac, Colima on a work Mac. It never starts the
other backend, never stops a backend that was already running, defaults its
start prompt to no, and never starts either backend without a terminal.
`groundwork-apps-start` deliberately excludes Docker. A start, readiness,
tidy, stop, timeout, or signal failure must withhold update success and retain
or create the exact pending repair needed for the next bounded retry.

## Verification and handoff

1. Confirm the command matched the classified lane.
2. For prove-and-delete, confirm the wrapper reported `removed after build`.
3. For a run-based proof, confirm `scripts/verify-docker-image` reported exact
   image-ID cleanup and proved the expected tag was not retained or repointed.
   Do not substitute a manual three-command sequence.
4. If cleanup failed, report the retained tag and Docker's refusal; do not
   hide it with `--force`.
5. Run the relevant focused fixtures and `scripts/validate-groundwork` after
   changing the lifecycle helpers or policy.
