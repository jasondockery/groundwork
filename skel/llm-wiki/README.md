# Knowledge Wiki

A personal, agent-maintained knowledge base. Sources go in `raw/`; the agent
builds and maintains pages in `wiki/`. The schema lives in `AGENTS.md`.

This should be its own private repo/vault, separate from Groundwork.

## Use

1. Run `obsidian-plugins .` once if you want this vault's local Obsidian plugins.
2. Add a source to `raw/`.
3. In this folder, run Claude Code or Codex and say: `ingest raw/<file>`.
4. Ask questions: `query: what do my sources say about X?`
5. Preserve useful answers: `save-answer: <topic>`.
6. Periodically: `lint`.

Open this folder as an Obsidian vault to browse and follow `[[links]]` visually.

Keep this repo private - it reflects what you read and think about.

## Capture

For web pages, install Obsidian Web Clipper in your browser and point clips at
`raw/clippings/`. A starter template lives in `templates/`.

Browser extension links for the browsers installed by Groundwork:

- [Chrome Web Store - Obsidian Web Clipper](https://chromewebstore.google.com/detail/obsidian-web-clipper/cnjifjpddelmedmihgijeibhnjfabmlf) for Chrome, Dia, and other Chromium browsers.
- [Firefox Add-ons - Obsidian Web Clipper](https://addons.mozilla.org/en-US/firefox/addon/web-clipper-obsidian/) for Zen.
- [Safari - Obsidian Web Clipper](https://apps.apple.com/us/app/obsidian-web-clipper/id6720708363) if you also use Safari on macOS, iOS, or iPadOS.
