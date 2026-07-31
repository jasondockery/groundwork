#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'

==> Groundwork: update-all now includes automatic package-manager maintenance

- Homebrew cleanup after successful upgrades
- npm cache verification on every refresh
- pnpm store pruning when due

Only reproducible package-manager state is cleaned automatically. Repository
dependency installations remain untouched. User data and Docker data remain
owner-confirmed. Whole pnpm store generations remain owner-confirmed. Homebrew
may remove installed orphan dependencies but retains requested formulae and casks. Run
`groundwork-cleanup` for the advanced read-only report.
EOF
