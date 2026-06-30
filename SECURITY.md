# Security Policy

This repository is a personal macOS development environment. It intentionally
changes shell, editor, terminal, browser, Homebrew, and selected macOS settings.

## Reporting

Please do not open a public issue for secrets, credential leaks, or security
problems. Email the repository owner or use GitHub's private vulnerability
reporting if it is enabled for this repository.

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
scripts before applying them to a Mac, and use the first-run backup/restore path
documented in the README if you want to back out managed settings.
