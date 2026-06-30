# Groundwork Playbook

Operational notes for maintaining Groundwork as a shared Mac developer setup.

## Before Making The Repo Public

Run these checks from the repo root:

```bash
scripts/validate-groundwork
git status --short
rg -n "TODO|FIXME|private|secret|token|password|gmail|icloud|/Users/" . --hidden -g '!.git' -g '!node_modules'
```

Also review:

- `README.md` for accurate install commands and repo visibility wording.
- `SECURITY.md` for the current disclosure and secret-handling policy.
- `.github/workflows/validate.yml` for the required CI check name.
- Any local `.groundwork-public-denylist` patterns, if used.

## Public Release Checklist

1. Make sure the repo has no personal, client, employer, credential, certificate, provisioning-profile, `.mobileconfig`, or machine-specific material.
2. Confirm the install path works from a fresh shell:

   ```bash
   bash -c "$(curl -fsSL https://raw.githubusercontent.com/jasondockery/groundwork/main/bootstrap-mac.sh)"
   ```

3. Confirm CI is green on `main`.
4. Make the repo public:

   ```bash
   gh repo edit jasondockery/groundwork --visibility public --accept-visibility-change-consequences
   ```

5. Enable `main` branch protection immediately after the repo is public.

## Main Branch Protection

GitHub Free supports protected branches on public repos. Private repos require a paid plan for the same branch-protection features.

Use this baseline for `main` once the repo is public:

```bash
gh api --method PUT repos/jasondockery/groundwork/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["validate"]
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
