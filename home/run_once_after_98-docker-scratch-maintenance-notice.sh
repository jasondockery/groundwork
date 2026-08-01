#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'

==> Groundwork: update-all now includes automatic Docker scratch maintenance

Only aged images and exited containers that opted in through Groundwork's
ephemeral label and scratch-tag contract are eligible. Every candidate is
re-checked immediately before explicit-ID removal.

Unlabeled images, legacy tags such as groundwork:test, running containers,
volumes, dangling images, and builder cache are never removed by this lane.
Review legacy validation tags with `groundwork-doctor --docker`; review
daemon-wide cache cleanup separately with `groundwork-docker-cache-tidy`.

Proof-only builds should clean up in their creating session:
  groundwork-docker-build-scratch <purpose> <context> --rm-after

Groundwork's run-based Docker proof is mechanical:
  scripts/verify-docker-image
EOF
