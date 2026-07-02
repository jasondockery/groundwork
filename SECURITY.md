# Security Policy

This repository is a personal and team development foundation for macOS
workstations, Linux/WSL terminal workflows, and headless agent/container
environments. It intentionally changes shell, editor, terminal, browser,
Homebrew, and selected macOS settings.

## Reporting

Please do not open a public issue with exploit details, secrets, or credential
material. Use GitHub private vulnerability reporting:

https://github.com/jasondockery/groundwork/security/advisories/new

If GitHub says private reporting is unavailable, open a minimal public issue
titled "Security contact needed" with no technical details, then wait for a
maintainer response.

Include:

- What file, script, or workflow is affected
- What a user would run
- What could go wrong
- Any safe reproduction steps that do not include secrets

## Sensitive Material

Do not commit or paste:

- Passwords, tokens, API keys, cookies, recovery codes, or `.env` files
- Private SSH keys, signing keys, certificates, or provisioning profiles
- Work/client data, private notes, browser profiles, or local app databases
- Personal knowledge wiki content created from `new-wiki`

If a secret is committed, rotate the secret first, then remove it from the
repository history before making the repository public.

## Supported Use

This setup is shared as-is for learning and personal/team bootstrap. Review the
scripts before applying them to a workstation or container, and use the first-run
backup/restore path documented in the README if you want to back out managed
settings.
