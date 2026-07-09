# Groundwork Playbook

Operational notes for maintaining Groundwork as a shared Mac developer setup.

## Dependency Updates (Renovate)

Learner-facing explanation of this whole lane (what the bot does, the
shared preset, cooldown rationale, setup on a new project):
[docs/dependencies.html](docs/dependencies.html).

Groundwork's dependency updates run through the self-hosted Renovate
runner in `jasondockery/renovate-config` (cron 4x daily + manual
dispatch; run logs live in that repo's Actions). Shared owner policy
comes from the same repo's preset via `extends`; groundwork-specific
rules live in the local `renovate.json`. The hosted Mend app was retired
2026-07-08 after the self-hosted proof PRs went green (rationale and
migration record: roost `tools/github/README.md` → Self-hosted Renovate
migration).

What Renovate manages here:

- GitHub Actions SHA pins in `.github/workflows/` (it updates the pin and the
  version comment together).
- The Dockerfile base image digest.

Operating notes:

- Updates arrive weekly as grouped PRs labeled `dependencies`. The Dependency
  Dashboard issue lists pending updates; checking a box there forces a PR
  ahead of the schedule (the runner acts on it at its next cron/dispatch
  run, not instantly).
- Security PRs are immediate, labeled `security`, and automerge once CI is
  green (decided 2026-07-04, aligned with the roost repo): the CI jobs prove
  what a human check would, and a vulnerable Action or base image should not
  wait on a manual merge. Automerge engages only if the repo has "Allow
  auto-merge" enabled and the CI checks are required on `main` (see Main
  Branch Protection below); otherwise Renovate merges on its own next run
  after checks pass. Both conditions hold here: auto-merge was enabled
  2026-07-09 and the four CI checks are required.
- Never add a `dependabot.yml`; Dependabot version updates would duplicate
  Renovate PRs. The old one (github-actions, docker, devcontainers) was
  removed 2026-07-03 when Renovate took over. Dependabot alerts can stay
  enabled as a data source.
- Policy is defined once for all owner repos: `extends` points at
  `github>jasondockery/renovate-config` (switched 2026-07-08). Preset
  changes propagate on the next run with no PR in this repo — policy
  review happens in the preset repo.

## Versioning & Releases

Groundwork uses **SemVer tags + GitHub Releases** — the 2026 convention for
distributed environment products (Omarchy v3.x, Omakub v1.x, LazyVim v16),
as opposed to personal dotfiles which roll untagged. Adopted 2026-07-04 with
three users on three surfaces (Mac desktop, MacBook Air, Docker-on-Windows).

- **Scheme:** `v0.MINOR.PATCH` while in early testing. Semver read loosely:
  **major** = update requires user action (bootstrap flow, template data
  schema, renamed scripts); **minor** = new tools, docs, or drills;
  **patch** = fixes.
- **1.0.0 criterion:** the bootstrap + `chezmoi update` path survives all
  three user surfaces without manual fixes.
- **Cadence:** release when a meaningful batch lands, not per commit.
  `main` stays the rolling edge; tags are the known-good refs.
- **Release notes are for the actual users** (and are teaching artifacts):
  what changed, what to run after `chezmoi update`, and any manual step —
  written for a capable beginner, per the north star.
- Cut a release: `gh release create v0.X.Y --title "v0.X.Y" --notes-file -`
  (tag and release together; the tag must point at a green `main` SHA).
- When the Docker image is published to a registry, image tags mirror the
  release tags (`groundwork:v0.X.Y` + `latest`).

## CI Checks (what each job proves)

`.github/workflows/ci.yml` runs four jobs on every push and PR:

- `workflow-lint` — zizmor (pedantic persona) statically audits the
  workflows themselves: unpinned actions, credential persistence,
  over-broad permissions, expression injection. Mirrors the roost repo's
  job (same action, same SHA pin). Findings upload as SARIF to the repo's
  code scanning tab (free on public repos). Its conventions apply to any
  workflow edit: pin actions to commit SHAs with a version comment, set
  `persist-credentials: false` on every checkout, scope `write`
  permissions to the job that needs them with a same-line comment saying
  why.
- `render-lint` — `scripts/validate-groundwork`: hermetic chezmoi template
  rendering across OS/headless/work matrices, plus ShellCheck.
- `secret-scan` — gitleaks over the full git history.
- `docker-build` — builds the container image and smoke-tests the
  installed toolchain.

Failures explain themselves without opening the log: a validation failure
annotates the run with the failing check name and the local repro command
(`scripts/validate-groundwork`), ShellCheck findings surface as file/line
annotations via a problem matcher (`.github/problem-matchers/`), zizmor
findings land in code scanning, and the run summary shows validation
pass/fail, the smoke-tested tool versions, and (on Pages deploys) the
published URL.

Run zizmor locally before pushing workflow changes:

```bash
uvx zizmor --persona pedantic --no-online-audits .github/workflows
```

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
- Keep all four `.github/workflows/ci.yml` checks (`workflow-lint`,
  `render-lint`, `secret-scan`, `docker-build`) required and green on
  `main` — Renovate's security automerge trusts them as the gate.
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
    "contexts": ["workflow-lint", "render-lint", "secret-scan", "docker-build"]
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
