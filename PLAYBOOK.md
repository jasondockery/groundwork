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
  wait on a manual merge. "Allow auto-merge" is enabled (2026-07-09). If the
  branch-protection baseline (Main Branch Protection below) is applied, the
  required checks are the gate; until then Renovate merges on its own next run
  once checks pass. Either way, green CI — not a human — is what releases a
  security update. Whether protection is currently applied is tracked as an
  owner action in ROADMAP, not restated in this evergreen prose.
- Never add a `dependabot.yml`; Dependabot version updates would duplicate
  Renovate PRs. The old one (github-actions, docker, devcontainers) was
  removed 2026-07-03 when Renovate took over. Dependabot alerts can stay
  enabled as a data source.
- Policy is defined once for all owner repos: `extends` points at
  `github>jasondockery/renovate-config` (switched 2026-07-08). Preset
  changes propagate on the next run with no PR in this repo — policy
  review happens in the preset repo.

## Discoverability (search + AI tools)

Machinery (automatic): `scripts/generate-discovery` derives per-page meta
descriptions from each page's lead paragraph, plus `docs/sitemap.xml` and
`docs/llms.txt` (the file IDE agents like Claude Code and Cursor fetch when
pointed at a docs site). `validate-groundwork` fails when artifacts go
stale. Authors never hand-edit these; see `skills/docs-alignment`,
Discoverability.

Owner actions (one-time, only a human can do these):

1. **Google Search Console**: verify `https://jasondockery.github.io/groundwork/`
   as a URL-prefix property (HTML-file method: drop the token file in
   `docs/`), then submit `docs/sitemap.xml` and request indexing of the
   homepage. Without this, indexing is at Google's leisure.
2. **Bing Webmaster Tools**: same, and it matters more than it sounds:
   ChatGPT's browsing and several AI assistants retrieve via Bing's index,
   so Bing coverage is AI-suggestion coverage.
3. Keep the GitHub repo's About fields rich (description, topics, homepage
   URL): repo pages rank quickly and are how AI assistants corroborate
   that the project exists.

Constraints to know: a GitHub *project* page cannot serve a root-level
`robots.txt` or `/llms.txt` (those live at the domain root, which is
GitHub's). A custom domain would restore root control and strengthen the
brand query long-term; decide when the name is settled, not before.

Expectations: technical discoverability is table stakes, not ranking.
A new site with no inbound links takes weeks to rank for brand queries
against established namesakes. What moves it: links from real places
(the GitHub repo README, profile README, LinkedIn, directories,
awesome-lists), and time. AI assistants suggesting Groundwork follows the
same inputs: crawlable pages, consistent one-line positioning everywhere,
and third-party mentions they can corroborate.

## Versioning & Releases

Groundwork uses **SemVer tags + GitHub Releases** — the 2026 convention for
distributed environment products (Omarchy v3.x, Omakub v1.x, LazyVim v16),
as opposed to personal dotfiles which roll untagged. Adopted 2026-07-04 with
three users on three surfaces (Mac desktop, MacBook Air, Docker-on-Windows).

- **Scheme:** `vMAJOR.MINOR.PATCH`. Groundwork is in the **v1.x** release line;
  see GitHub Releases for the current known-good version (don't duplicate the
  number here). Semver: **major** = an incompatible installed or configuration
  contract (bootstrap flow, template data schema, renamed scripts); **minor** =
  backward-compatible functionality — new tools, docs, or drills; **patch** =
  backward-compatible fixes. A release may document an optional follow-up action
  without that alone making it major.
- **`v1.0.0` shipped** once the bootstrap + `chezmoi update` path survived all
  three user surfaces without manual fixes; the v1 lane continues from there.
- **Cadence:** release when a meaningful batch lands, not per commit. `main`
  stays the rolling edge — installs that track `main` receive changes through
  `chezmoi update` immediately, so a tag is the known-good ref, the SemVer
  signal, and the user-facing notes, NOT the delivery mechanism.
- **Release notes are for the actual users** (and are teaching artifacts):
  what changed, what to run after `chezmoi update`, and any manual step —
  written for a capable beginner, per the north star.
- Cut a release (tag and release together; the tag must point at a green `main`
  SHA). Set the version once so the command block is copy-run safe:

  ```bash
  version=v1.8.0
  gh release create "$version" --title "$version" --notes-file -
  ```
- When the Docker image is published to a registry, image tags mirror the
  release tags (`groundwork:vX.Y.Z` + `latest`).

## CI Checks (what each job proves)

`.github/workflows/ci.yml` runs five jobs on every push and PR:

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
  rendering across OS/headless/work matrices, plus the shell-quality gate
  (`scripts/lint-shell` — see below).
- `macos-validation` — the full validator on macOS: the tmux/pty suite
  (copy-model effective-server + injection checks, interactive-editor and
  prompt-render pty checks) plus render/profile checks and the Homebrew
  cask-integrity audit. It runs on a macOS runner because the tmux suite needs a
  current tmux (the version `tmux-copy-last` needs — a dedicated step runs the
  helper's own `--check-tmux-version` to enforce the exact floor), which Ubuntu's
  package predates. The job is named for the platform, not "tmux-behavior": a
  render or cask failure legitimately reds it, and neither is tmux behavior. tmux
  itself is cross-platform; a pinned Linux `tmux-behavior` lane (minimum +
  current tmux) is roadmapped so the portable contract is proven on Linux too.
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

## Shell quality gate (ShellCheck + shfmt)

`scripts/lint-shell` is the single entry point for shell quality: `bash -n`
(syntax), pinned **shfmt** (formatting), and pinned **ShellCheck** (semantic
lint), over every tracked or non-ignored untracked Bash file (found by shebang or
a `# shellcheck shell=` directive, so misleadingly-named files like the
`modify_*.toml`/`.json` chezmoi scripts are covered; chezmoi `.tmpl` sources are
checked after rendering). `scripts/validate-groundwork` and both CI jobs call it,
so a green local run predicts CI.

- **Reproduce CI locally:** `scripts/lint-shell` (add `--write` to auto-apply
  shfmt formatting, then it re-validates; `--list` prints the covered files).
- **Pinned versions live in `tools/shell-tools.env`** (ShellCheck + shfmt, one
  sha256 per OS/arch). `scripts/ensure-shell-tools` downloads and caches the exact
  pinned binaries under `$XDG_CACHE_HOME/groundwork/shell-tools` (checksum-verified,
  no sudo, Intel/Arm × Linux/macOS), so validation never depends on whatever
  ShellCheck is first on `PATH`. A Homebrew ShellCheck can stay installed for
  editor use; the gate ignores it.
- **Bump a tool:** `scripts/update-shell-tool-pins shellcheck <version>` (or
  `shfmt <version>`) — it rewrites the version AND every arch checksum together
  from the real release assets. Never hand-edit the checksums, and never bump the
  version alone (that would be a guaranteed-red state). Review the diff, then run
  `scripts/lint-shell`.
- **Renovate does NOT auto-manage these two pins** (a version-only PR would fail
  on stale checksums). Treat them as manual/dashboard-approved via the command
  above. This is `scripts/lint-shell`, not a learner command — keep it out of the
  daily command catalog.
- **shfmt style** is `-i 2 -ci -bn` (`tools/shell-tools.env`), chosen by measuring
  churn against the existing hand-formatting: `-bn` preserves Groundwork's
  operator-at-line-start idiom, and `-sr` is deliberately omitted (the tree uses
  shfmt's default no-space redirects).

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
- Keep all five `.github/workflows/ci.yml` checks (`workflow-lint`,
  `render-lint`, `macos-validation`, `secret-scan`, `docker-build`) green on
  `main`. The branch-protection baseline (Main Branch Protection) can make them
  required so Renovate's security automerge trusts them as the gate; whether it
  is applied is an owner action tracked in ROADMAP.
- Periodically confirm the fresh-shell install path still works:

  ```bash
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/jasondockery/groundwork/main/bootstrap-mac.sh)"
  ```

## Main Branch Protection

GitHub Free supports protected branches on public repos (private repos need a
paid plan for the same features). This section is the *desired baseline and the
commands to apply, verify, and recover it*. Whether it is currently applied is
an owner action tracked in ROADMAP, not a dated status restated in this prose.

The baseline requires the CI checks and a pull request but **zero approving
reviews**. A solo author cannot approve their own PR, so requiring one approval
alongside `enforce_admins` would deadlock every owner PR and block Renovate's
security automerge (auto-merge waits on all required reviews). Zero approvals
keeps the PR + green-checks gate without making a second human an enforced
dependency; human review stays the normal practice, just not a hard gate.

Apply it only AFTER the current job names have reported green at least once on
`main` — a required context that has never run cannot be selected reliably:

```bash
gh api --method PUT repos/jasondockery/groundwork/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["workflow-lint", "render-lint", "macos-validation", "secret-scan", "docker-build"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0,
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

Verify it (and confirm direct pushes are rejected while a test PR merges with
zero approvals):

```bash
gh api repos/jasondockery/groundwork/branches/main/protection \
  --jq '{required_status_checks, enforce_admins, required_pull_request_reviews, required_linear_history, allow_force_pushes, allow_deletions, required_conversation_resolution}'
```

Recover / bypass (owner, deliberately) — lift protection to unblock a stuck
`main`, then re-apply the baseline above:

```bash
gh api --method DELETE repos/jasondockery/groundwork/branches/main/protection
```

Hardening (optional): the `contexts` array trusts any status provider with a
matching name. GitHub's newer `checks` form binds each required check to the
`app_id` that supplies it; after the first protected run, capture the providers
and pin them if you want that stronger guarantee.

## Working On `main`

Groundwork is solo-maintained and moves fast, so the sanctioned workflow is to
**commit to `main` directly once `scripts/validate-groundwork` is green**. A
pull request is opened only when it would tell us something a local run cannot —
surfacing the real CI check names before enabling protection, staging a risky
change, or getting a second opinion. If the protection baseline above is applied,
`main` becomes PR-only and this inverts; until then, direct-to-main is expected,
not a lapse.

```bash
scripts/validate-groundwork
git add -A
git commit -m "..."
git push
```

Keep these rules regardless:

- Do not force-push `main` after public release.
- Do not commit secrets or private local denylist patterns.
- Keep AI-agent instructions centralized in `AGENTS.md`, `AI_THESIS.md`, and `skills/`.
- Keep installation docs tied to `bootstrap-mac.sh` instead of duplicating long command blocks.
- Update docs and cheatsheets in the same commit as config changes.
