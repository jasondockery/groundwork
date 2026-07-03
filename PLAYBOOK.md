# Groundwork Playbook

Operational notes for maintaining Groundwork as a shared Mac developer setup.

## Dependency Updates (Renovate)

Groundwork uses the hosted Mend Renovate app (installed account-wide, mode:
Interactive) for dependency updates. Configuration lives in `renovate.json`.

What Renovate manages here:

- GitHub Actions SHA pins in `.github/workflows/` (it updates the pin and the
  version comment together).
- The Dockerfile base image digest.

Operating notes:

- Updates arrive weekly as grouped PRs labeled `dependencies`. The Dependency
  Dashboard issue lists pending updates; checking a box there forces a PR
  ahead of the schedule.
- Security PRs are immediate and labeled `security`.
- Never add a `dependabot.yml`; Dependabot version updates would duplicate
  Renovate PRs. The old one (github-actions, docker, devcontainers) was
  removed 2026-07-03 when Renovate took over. Dependabot alerts can stay
  enabled as a data source.
- When the shared `renovate-config` preset repo exists, switch `extends` to
  `github>jasondockery/renovate-config` so policy is defined once for all
  repos.

## Public Repo Hygiene (recurring)

The repo is public. These checks are recurring hygiene, not a one-time
release gate. Run them from the repo root before pushing anything
substantial:

```bash
scripts/validate-groundwork
git status --short
rg -n "TODO|FIXME|private|secret|token|password|gmail|icloud|/Users/" . --hidden -g '!.git' -g '!node_modules'
```

Standing rules for a public repo:

- Never commit personal, client, employer, credential, certificate,
  provisioning-profile, `.mobileconfig`, or machine-specific material.
  Pushing is publishing; deletion is not redaction.
- Keep `README.md` install commands and `SECURITY.md` disclosure policy
  accurate.
- Keep `.github/workflows/ci.yml` validation and Docker status checks
  required and green on `main`.
- Periodically confirm the fresh-shell install path still works:

  ```bash
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/jasondockery/groundwork/main/bootstrap-mac.sh)"
  ```

## Main Branch Protection

GitHub Free supports protected branches on public repos. Private repos require a paid plan for the same branch-protection features.

Use this baseline for `main` once the repo is public:

```bash
gh api --method PUT repos/jasondockery/groundwork/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["render-lint", "docker-build"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
```

Verify it:

```bash
gh api repos/jasondockery/groundwork/branches/main/protection \
  --jq '{required_status_checks, enforce_admins, required_pull_request_reviews, required_linear_history, allow_force_pushes, allow_deletions, required_conversation_resolution}'
```

## After The Repo Is Public

Use pull requests for all changes to `main`:

```bash
git checkout -b docs/update-topic
scripts/validate-groundwork
git add -A
git commit -m "Update docs"
git push -u origin docs/update-topic
gh pr create --fill
```

Keep these rules:

- Do not force-push `main` after public release.
- Do not commit secrets or private local denylist patterns.
- Keep AI-agent instructions centralized in `AGENTS.md`, `AI_THESIS.md`, and `skills/`.
- Keep installation docs tied to `bootstrap-mac.sh` instead of duplicating long command blocks.
- Update docs and cheatsheets in the same PR as config changes.
