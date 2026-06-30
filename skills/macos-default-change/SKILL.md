---
name: macos-default-change
description: Add, remove, or change Groundwork-managed macOS defaults safely. Use when editing defaults write commands, backup/restore coverage, Mac setup behavior, or documentation for macOS preferences.
---

# macOS Default Change

Mac defaults are coupled: a setting that Groundwork writes should usually be backed up, restorable, documented, and validated.

## Workflow

1. Edit the write path in `home/run_onchange_after_30-macos-defaults.sh.tmpl`.
2. Add or update the backup key in `home/run_before_05-backup-current-settings.sh.tmpl`.
3. Confirm restore support:
   - Existing supported types: `boolean`, `integer`, `string`, and `absent`.
   - If the default writes an unsupported type, extend restore handling before adding it.
4. Update docs when the behavior is user-visible:
   - `docs/macos.html` for macOS behavior.
   - `docs/setup.html` or `docs/troubleshooting.html` for bootstrap/reset/restore implications.
   - README checklist only for manual follow-up steps.
5. Validate:
   - Render both changed templates through chezmoi.
   - Run `bash -n` on the rendered scripts.
   - Run `scripts/validate-groundwork`.

## Guardrails

- Do not automate identity, security, or device-management boundaries: Apple Developer certificates, provisioning profiles, MDM/configuration profiles, Gatekeeper bypasses, reduced-security boot settings, or debugger authorization prompts.
- Prefer comments that explain why a default exists or why it remains manual.
- If a setting needs logout/restart or a manual macOS confirmation dialog, document that instead of pretending it is fully automated.
