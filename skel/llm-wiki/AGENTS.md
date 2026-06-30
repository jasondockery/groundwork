# Knowledge Wiki - Agent Schema

This directory is a personal LLM-maintained knowledge wiki. Treat it like a codebase you compile: `raw/` is the source layer, `wiki/` is the compiled knowledge layer, and this file is the build config.

The goal is durable synthesis. Do not answer by repeatedly re-reading raw chunks when the wiki already contains a maintained page. Improve the wiki so knowledge compounds.

## Layout

- `raw/` - immutable source material. Articles, papers, meeting notes, screenshots, assets, web clippings, transcripts, and rough notes live here. Only read these. Never edit or delete them unless the user explicitly asks.
- `wiki/` - compiled knowledge pages. Markdown, cross-linked with `[[wiki-links]]`.
- `wiki/index.md` - the map of the wiki. Every page should be reachable from here.
- `wiki/log.md` - an append-only record of what changed on each ingest, newest first.
- `wiki/questions/` - durable answers that came from useful queries and should be kept.
- `templates/` - templates for capture tools such as Obsidian Web Clipper.

## Operations

The user will name one of these.

### ingest <source>

1. Read the new source in `raw/`.
2. Identify the distinct concepts, people, projects, decisions, claims, contradictions, and open questions it contains.
3. Update existing pages before creating new ones. Prefer updating over duplicating.
4. Add `[[links]]` connecting the new material to related pages, in both directions when useful.
5. If the source contradicts an existing page, do not silently overwrite. Record both claims on the page under a `## Tensions` heading and flag it in your reply.
6. Record provenance: every meaningful claim traces back to a file in `raw/`.
7. Update `wiki/index.md` and prepend a dated entry to `wiki/log.md`.

### query <question>

1. Answer from `wiki/` first, citing the `[[pages]]` you used.
2. Use `raw/` only when the wiki is incomplete or verification is needed.
3. If the wiki does not cover it, say so plainly and name the source that would fill the gap.
4. Suggest wiki updates when the answer reveals a useful synthesis, gap, or durable new page.
5. Never invent facts that are not in the wiki or the raw sources.

### save-answer <question or topic>

When a query produces an answer worth keeping:

1. Create or update a page in `wiki/questions/` or the relevant topic folder.
2. Preserve the answer as a durable synthesis, not a transcript.
3. Link it to topic/entity pages and cite the pages or raw sources used.
4. Update `wiki/index.md` and prepend a dated entry to `wiki/log.md`.

### lint

Report problems. Do not fix unless asked:

- orphan pages nothing links to
- broken `[[links]]`
- duplicate or near-duplicate concepts that should merge
- pages with no source
- stale claims or weak citations
- unresolved `## Tensions`
- useful raw sources that have not been ingested

## Privacy and scope

- Keep this repository private by default.
- Do not ingest secrets, credentials, production data, legal/medical records, or other sensitive material unless the user explicitly confirms the risk.
- If a source appears sensitive, pause and ask before ingesting it.
- Separate work/client wikis from personal wikis unless all material is sanitized.
- Never paste raw sensitive content into external services on your own initiative.

## Page conventions

One concept per page; keep pages atomic. Filenames are kebab-case and descriptive (`spaced-repetition.md`, not `sr.md`). Use this shape:

```markdown
# Title

One-sentence definition.

## Summary
A few tight paragraphs a reader can understand without the sources.

## Key points
- ...

## Tensions
- Optional. Use only when sources conflict or claims need reconciliation.

## Connections
- [[related-page]] - why it is related

## Sources
- raw/<file> - what it contributed
```

## Working rules

- The wiki is the product. Keep it clean, current, and navigable.
- Write for someone who has not seen the sources.
- Plain language, no filler.
- Prefer updating existing pages over creating duplicates.
- Inspect Git diffs after meaningful changes.
- Do not rewrite `raw/` into polished prose; compile it into `wiki/`.
- Treat `wiki/` as maintained output. If repeated mistakes happen, improve this schema.
