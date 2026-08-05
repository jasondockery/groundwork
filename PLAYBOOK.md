# Groundwork Playbook

Operational notes for maintaining Groundwork as a shared Mac developer setup.

## Dependency Updates (Renovate)

Learner-facing explanation of this whole lane (what the bot does, the
shared preset, cooldown rationale, setup on a new project):
[docs/dependencies.html](docs/dependencies.html).

Groundwork's dependency updates run through the self-hosted Renovate
runner in `jasondockery/renovate-config` (daily at 01:17 UTC + manual
dispatch; run logs live in that repo's Actions). Shared owner policy
comes from the same repo's preset via `extends`; groundwork-specific
rules live in the local `renovate.json`. The hosted Mend app was retired
2026-07-08 after the self-hosted proof PRs went green (rationale and
migration record: roost `tools/github/README.md` → Self-hosted Renovate
migration).

What Renovate manages here:

- GitHub Actions SHA pins in `.github/workflows/` (it updates the pin and the
  version comment together).
- The Dockerfile frontend and base image tag/digest.
- The Gitleaks workflow container's version tag and immutable digest.

`dependency-coverage.json` also records the intentional manual lanes: Homebrew
packages, checksum-coupled ShellCheck/shfmt assets, the Corepack compatibility
pin, Aider's Python compatibility choice, the tmux theme release, and headless
install-time release discovery, and the managed mise runtimes applied by
`update-all`. Those are not silently assumed to be Renovate coverage.

Operating notes:

- The runner inspects all three repositories daily. Routine updates and branches
  advance in the separate early-Monday weekly window and are grouped into PRs
  labeled `dependencies`. Normal timestamped major, minor, and patch releases
  must also complete the strict five-day age floor. Action SHA pins, Docker
  digests, lockfile maintenance, and other unsupported update types use the
  repository-specific controls recorded in `dependency-coverage.json`. The Dependency
  Dashboard issue lists pending updates; checking a box there forces a PR
  ahead of the schedule (the runner acts on it at its next cron/dispatch
  run, not instantly).
- Security PRs bypass the normal age, weekly schedule, and routine rate limits,
  appear on the next
  daily run, are labeled `security`, and automerge once CI is
  green (decided 2026-07-04, aligned with the roost repo): the CI jobs prove
  what a human check would, and a known-vulnerable package should not wait on a
  manual merge. Action and image updates retain their separately inventoried
  pin/digest controls. "Allow auto-merge" is enabled (2026-07-09). If the
  branch-protection baseline (Main Branch Protection below) is applied, the
  required checks are the gate; until then Renovate merges on its own next run
  once checks pass. Either way, green CI — not a human — is what releases a
  security update. Whether protection is currently applied is tracked as an
  owner action in ROADMAP, not restated in this evergreen prose.
- Never add a `dependabot.yml`; Dependabot version updates would duplicate
  Renovate PRs. The old one (github-actions, docker, devcontainers) was
  removed 2026-07-03 when Renovate took over. Dependabot alerts can stay
  enabled as a data source.
- Policy is defined once for all owner repos: `extends` currently points at the
  unversioned `github>jasondockery/renovate-config` reference (switched
  2026-07-08). Renovate cannot update that reference until versioned
  distribution is owner-approved; the preset repository freezes behavior until
  consumers pin a release. Any approved exception propagates on the next run,
  so it must be reviewed in the preset repository first.
- The canonical end-to-end outcome, proof levels, canary, and post-run audit
  live in `renovate-config/specs/renovate-system-acceptance.md`. Groundwork owns
  `dependency-coverage.json` and must keep every external dependency surface
  classified as built-in, custom-managed, derived, or intentionally manual,
  with its age policy and compensating control. The shared file-aware scanner
  is a bounded discovery guard, not a mathematical completeness proof: docs and
  fixtures are excluded unless explicitly selected, reasoned suppressions must
  have live evidence, and actual extraction remains a separate compatibility
  proof. A
  green shared runner receipt is not a substitute for a green eligible
  Groundwork PR.

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

The discoverability build-out is tracked in `ROADMAP.md`, not silently implied
by the current generator. Keep these implementation boundaries when it lands:
one canonical directory URL for the homepage; outcome-first authored titles and
description overrides for the highest-value pages; JSON-LD generated from page
structure; page-specific social cards with alt text; and no `FAQPage` metadata
unless the visible page actually contains the represented questions and
answers. Groundwork must lead with its standalone outcome; the Roost
relationship is supporting context while Roost is not a public dependency.

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
- **Bootstrap asset trust is a release contract in progress.** Until the
  immutable-asset + published-SHA work in `ROADMAP.md` lands, never claim that
  a rolling `main` URL is immutable or release-verified. When it lands, upload
  bootstrap assets and SHA-256 files before publishing install docs, verify the
  downloaded assets against the release tag, and attest those exact immutable
  bytes.
- Cut a release only after `scripts/validate-groundwork --suite full` passes and
  the tag target has both a green exact-SHA `ci-gate` and a non-cancelled
  exact-SHA `full-gate` containing the Linux and macOS receipts. Record both run
  IDs and attempts, verify both tested the tag target, then create the tag and
  release together. Set the version once so the command block is copy-run safe:

  ```bash
  version=v1.8.0
  gh release create "$version" --title "$version" --notes-file -
  ```
- When the Docker image is published to a registry, image tags mirror the
  release tags (`groundwork:vX.Y.Z` + `latest`).

## CI Checks (what each job proves)

`.github/workflows/ci.yml` always starts on every push and PR. Seven proof lanes
run independently, then one stable aggregate gate decides the result:

- `workflow-lint` — zizmor (pedantic persona) statically audits the
  workflows themselves: unpinned actions, credential persistence,
  over-broad permissions, expression injection. Mirrors the roost repo's
  job (same action, same SHA pin). Findings upload as SARIF to the repo's
  code scanning tab (free on public repos). Its conventions apply to any
  workflow edit: pin actions to commit SHAs with a version comment, set
  `persist-credentials: false` on every checkout, scope `write`
  permissions to the job that needs them with a same-line comment saying
  why.
- `static-linux` — shell quality, documentation, repository policy, and the
  hermetic chezmoi render/profile matrix.
- `update-contract-linux` — update transaction, lock, deadline, signal,
  Homebrew, npm, and pnpm maintenance fixtures.
- `docker-contract-linux` — exact-ID Docker discovery, bounded cleanup,
  scratch-build ownership, and image-verification fixtures.
- `platform-macos` — only proof that needs a current macOS host: live tmux/PTY,
  BSD `stat`/`ps`/`readlink`, real Homebrew descendant drain, representative
  macOS renders, and the network-backed cask-integrity audit. The unrelated
  `aws/tap` present on GitHub's image is removed before Homebrew setup so an
  expected runner warning does not mask real annotations.
- `secret-scan` — gitleaks over the full git history.
- `docker-build` — builds, loads, smoke-tests, and removes the disposable amd64
  image while reporting digest and cache configuration.
- `ci-gate` — `always()` consumes every expected JSON receipt and every direct
  `needs` result. Missing, duplicated, stale-SHA, failed, timed-out, cancelled,
  or unexpectedly skipped evidence fails this one stable branch-protection
  context.

Each meaningful job publishes one concise summary and a typed
`groundwork.ci-receipt` JSON artifact retained for 30 days. Receipt kinds share
one versioned envelope and have distinct bodies: `validation-suite` is detailed
check evidence, `ci-job` is the final job transaction, `ci-gate` aggregates one
exact run and attempt, and `deployment` records the Pages transaction. The
summary is only a fail-open rendering of the authoritative JSON.

The receipt names the tested SHA (and PR head separately), source-tree
fingerprint, platform, scope, proof type, result, typed recovery commands, and
start and finish times. A validation job is a source transaction: its initial
identity comes from the embedded validation detail and its parent adds the
authoritative final observation. A detail whose final observation failed stays
explicitly unavailable even when the parent can supplement it. Workflow-lint,
Docker-build, and deployment receipts instead declare a final-source snapshot
only; they do not claim initial-to-final read-only proof. Secret-scan records the
clean checkout before Gitleaks starts and fails if that Git-visible identity
changes. Validation details count passed, skipped, and failed
checks and require a typed code plus a human reason for every skip. The gate
accepts platform skips only through an exact check-name/code allowlist. Final
job receipts are written only
after all authoritative phases finish: on macOS that includes the cask audit;
for Docker the smoke helper owns disposal of the exact image ID and no second
workflow cleanup guesses from a mutable tag. A passed final job may contain only
passed authoritative phases.

Suite, job, and workflow budgets are independent advisory measurements. The
gate rejects missing, duplicated, malformed, stale-SHA, wrong-attempt, failed,
cancelled, timed-out, or unexpectedly skipped evidence, then renders a lane
table and the observed workflow span after the first required lane started. The
wording is deliberate: that observation includes later queueing, gate startup,
and artifact download, and is not a fabricated end-to-end timer. Detailed logs
remain available without flooding the run page. Receipts become the P50/P95
telemetry source only after enough exact-run history exists.

The local suite targets are `static` 55s, `update` 90s, `docker` 75s,
`platform-macos` 15s, and `full` 270s. Every validator-only policy command has
a 20-second harness watchdog. Whole-suite deadlines are 540 seconds for
`static` and `docker`, 840 seconds for `update` and `platform-macos`, and 300
seconds for routine `full`, each with a five-second cleanup grace. Policy matrices use fixture clocks and bounded
direct runners; real deadline, signal, lock, descendant-drain, and process-tree
contracts retain the unmodified production runner. The ordinary PR workflow
has a 300-second advisory wall-time target while each job keeps its larger
emergency timeout. Gate summaries show suite duration/target separately from
complete-job duration and GitHub workflow safety-timeout metadata. The first five
representative final-tree runs are advisory baseline evidence. Later budget
regressions produce a productivity warning and backlog item, not a weakened
correctness gate.

Cross-repository compatibility is a field mapping, not a shared library yet:
outcome; exact SHA or content-addressed tree; command and proof type; duration
and slowest phases; cache state (`warm`, `cold`, `not-applicable`,
`unavailable`, or `mixed`); and invalidation state. The compatibility mapping is:

| Profile field | Groundwork | Roost | renovate-config |
| --- | --- | --- | --- |
| Outcome | `result` | `result.outcome` | `compatibility.outcome` |
| Identity | `testedSha` or `source.treeFingerprint` | `source.testedSha` | `compatibility.identity` |
| Command and proof | `body.commands` and `body.proofType` | diagnostic reproduction plus workflow contract | `compatibility.command` and `compatibility.proofType` |
| Duration and slowest phases | receipt duration plus `checks` or `phases` | `timings` plus job/step timings | `compatibility.durationSeconds` and `compatibility.slowestPhases` |
| Cache state | `body.cacheState` | existing Turbo/job cache facts | `compatibility.cacheState` |
| Invalidation | exact-SHA CI or before/after tree state; local reuse unavailable | exact tested SHA plus workflow-owned inputs | `compatibility.invalidationState` |

Groundwork field-proves the typed contract, Roost preserves its richer
`CiReport`, and renovate-config emits a narrow repository-specific receipt.
Extraction waits until real exact-SHA Groundwork receipts and the Roost mapping
are accepted.

A future neutral multi-repository orchestrator may start after one final-tree
Groundwork receipt and one concurrency stress proof establish the real-time
isolation. It will invoke each
repository's canonical final command concurrently, keep logs and exit statuses
separate, cancel every child cleanly, and report critical-path wall time apart
from aggregate compute time. It will not own any repository's validation
policy, and it does not exist merely to hide a slow or flaky Groundwork lane.
Its first five representative all-repository runs establish the advisory
five-minute wall-clock baseline.

`.github/workflows/full-validation.yml` runs the unchanged `full` suite on both
Linux and macOS every night and on manual dispatch. Its `full-gate` keeps the
complete cross-platform drift/release proof outside the normal PR critical
path. `.github/workflows/pages.yml` uses the same receipt fields for the
published version, URL, deployment attempt/retry, duration, and recovery route.

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
checked after rendering). The validator's `static` and `full` suites own it;
`static-linux` and both scheduled full-platform lanes call those same suite
functions, so a green local run exercises the same implementation as CI.

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
- Keep every `.github/workflows/ci.yml` lane green on `main`; `ci-gate` is the
  primary required branch-protection context while individual jobs remain
  visible for diagnosis. Whether protection is applied is an owner action
  tracked in ROADMAP.
- Periodically confirm the fresh-shell install path still works. Download once
  and execute the same local bytes that were inspected; do not inspect one
  request and execute a second request whose branch may have changed:

  ```bash
  bootstrap_check="$(mktemp "${TMPDIR:-/tmp}/groundwork-bootstrap.XXXXXX")"
  curl -fsSL \
    https://raw.githubusercontent.com/jasondockery/groundwork/main/bootstrap-mac.sh \
    -o "$bootstrap_check"
  shasum -a 256 "$bootstrap_check"
  less "$bootstrap_check"
  bash "$bootstrap_check"
  rm -f "$bootstrap_check"
  ```

## Main Branch Protection

GitHub Free supports protected branches on public repos (private repos need a
paid plan for the same features). This section is the *desired baseline and the
commands to apply, verify, and recover it*. Whether it is currently applied is
an owner action tracked in ROADMAP, not a dated status restated in this prose.

The baseline requires the aggregate CI gate and a pull request but **zero approving
reviews**. A solo author cannot approve their own PR, so requiring one approval
alongside `enforce_admins` would deadlock every owner PR and block Renovate's
security automerge (auto-merge waits on all required reviews). Zero approvals
keeps the PR + green-checks gate without making a second human an enforced
dependency; human review stays the normal practice, just not a hard gate.

Apply it only AFTER `ci-gate` has reported green at least once on `main` — a
required context that has never run cannot be selected reliably:

```bash
gh api --method PUT repos/jasondockery/groundwork/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci-gate"]
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
**commit locally, prove that exact clean commit, then push it to `main`**. A
pull request is opened only when it would tell us something a local run cannot —
surfacing the real CI check names before enabling protection, staging a risky
change, or getting a second opinion. If the protection baseline above is applied,
`main` becomes PR-only and this inverts; until then, direct-to-main is expected,
not a lapse.

```bash
git add -A
git diff --cached --name-only
git commit -m "..."
scripts/validate-groundwork --suite full --report /tmp/groundwork-validation.json
git push
```

Do not edit, restage, amend, or otherwise change source, index, or history
between final proof and push; doing so invalidates the receipt identity.

Keep these rules regardless:

- Do not force-push `main` after public release.
- Do not commit secrets or private local denylist patterns.
- Keep AI-agent instructions centralized in `AGENTS.md`, `AI_THESIS.md`, and `skills/`.
- Keep installation docs tied to `bootstrap-mac.sh` instead of duplicating long command blocks.
- Update docs and cheatsheets in the same commit as config changes.
