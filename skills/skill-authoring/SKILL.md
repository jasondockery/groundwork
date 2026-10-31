---
name: skill-authoring
description: Writes or revises an agent skill that every agent tool can discover and load, covering when a skill is justified, the overlap check, the Agent Skills layout and frontmatter, a trigger-style description, progressive disclosure, vendor-neutral wording, dated sources, and trigger evals. Use when creating, renaming, splitting, merging, or rewriting a skill or its description, or when deciding whether repeated guidance should become a skill. Not for repository instruction files that only route to skills, and not for the domain content a skill teaches (load that domain's own skill).
---

# Skill authoring

A skill is a procedure an agent loads on demand. Its description decides when
it loads; its body decides what the agent does next. It adds no authority:
policy lives in the owning doctrine, and a skill routes to it.

Load `shift-to-authority` when the guidance may belong in a shared authority
rather than one repository, and `independent-code-review` before the change is
marked ready for review.

## Decide whether it should be a skill

Create a skill only for durable, repeated work that agents would otherwise
relearn. It needs a clear trigger, a procedural body, an ownership boundary, a
validation path, and named failure modes. Do not create a skill for a one-off
task, a status summary, a restatement of another document, or policy that has
no procedure.

Run the overlap check before writing:

1. Search existing skills for the same job. Read every candidate in full.
2. When two skills look like one job, compare their scope and inbound
   references, then either extend the existing skill or state the split in
   both descriptions with `Not for … (use …)`.
3. Folding or deleting another skill's content is its own change, carrying
   that evidence.

## Layout

Follow the [Agent Skills specification](https://agentskills.io/specification),
read 2026-10-26.

- One directory per skill, named for the skill, with `SKILL.md` at its root.
- Frontmatter requires `name` and `description`. `name` equals the directory:
  1 to 64 lowercase letters, digits, and hyphens, with no leading, trailing,
  or consecutive hyphens.
- A skill a repository keeps for itself takes a repository-prefixed name
  (`<repo>-<topic>`) and never a name a shared distribution uses, so a
  projection of shared skills never meets a same-named local skill.
- `description` is at most 1,024 characters and is the trigger: what the skill
  does, when to use it, and what nearby work belongs elsewhere.
- Keep the body procedural, under 500 lines and roughly 5,000 tokens.
- Optional `scripts/`, `references/`, and `assets/` directories hold
  executable helpers, on-demand documentation, and static resources.

Progressive disclosure has three levels: discovery reads only the frontmatter,
the body loads when the skill triggers, and referenced files load only when the
task needs them. Link references one level deep from `SKILL.md`; never
chain references. A companion reference lives in the owning skill's folder and
has no `name` field of its own.

The repository that distributes skills decides which files a skill may carry.
When its distribution contract allows only `SKILL.md` and an interface
manifest, keep the body self-contained and push depth into sibling skills that
it routes to by name ("Load `verification-selection` for proof"), rather than
into reference files.

Tool-discovery adapters, such as per-tool skill directories, contain only the
name, description, and a pointer to the canonical file. They hold no policy and
are generated or checked for drift, never edited by hand into divergence.

## Write the description

Write it in the third person, starting with what the skill does:

```text
<Does what, in one clause>. Use when <concrete triggers: actions, files,
artifacts, questions>. Not for <near miss> (use <other-skill>).
```

Name concrete triggers a user or agent would actually say or touch. Name every
near-miss skill so the boundary is visible from discovery alone.

## Write the body

- Open with the one idea the skill protects, then the skills it loads.
- Use numbered steps where order matters and short bullets where it does not.
- Say what to do, not what to avoid, except for real hazards.
- Keep repository-specific commands, paths, numbers, and product names out of a
  shared skill. Name the boundary and say the repository owns the value.
- Name no model, agent client, or model provider in rule text. Client-specific
  setup belongs in a dated, optional recipe the repository owns, never in a
  rule. A clearly dated examples section may name models when the client's own
  list is stated to win and an owner keeps it current. Do not copy a vendor's
  skill into the repository.
- Cite a dated primary source, with the date read, where a rule rests on a
  specification or vendor behavior that can change. A wording-only edit cites
  nothing.
- End with a short **Done when** list the agent can check.

## Trigger evals

For a new or rewritten description, write a few prompts that should load the
skill and a few near-misses that should not, including at least one for each
skill named in `Not for`. Check each against the description and the
near-miss skills' descriptions, and record the prompts and results in the pull
request body. Use a repository's existing eval harness when it has one; do not
build one for a single skill.

When behavior matters more than triggering, run one representative task with
the skill loaded and one without, and record what changed. A skill that does
not change the outcome is not earning its load cost.

## Register it

Before adding a new shared skill name, check every known consumer of the
distribution for a skill that already uses it, and resolve each collision
before the name ships.

Register the skill everywhere the distributing repository requires in the same
change: canonical file, interface manifest, discovery adapters, routing
inventory and hashes, inventory tests, and instruction routing. Run that
repository's validator and report its result.

## Done when

- The overlap check found no existing skill that already does this job, or
  the split is stated in both descriptions.
- `name` matches the directory, and the description names triggers and
  near misses. A local skill's name is repository-prefixed, and a new shared
  name collides with no known consumer's skill.
- The body is procedural, vendor-neutral, and within the distribution
  contract's allowed files.
- Trigger evals are recorded in the pull request.
- Every registration surface changed together and the validator passed.
