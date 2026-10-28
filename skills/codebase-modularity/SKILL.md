---
name: codebase-modularity
description: Keeps source and test files within the repository's size budget by splitting along module seams instead of raising limits. Use when editing a file near or over its size budget, adding a module, growing a test fixture, extracting code from a large file, or seeing a file-size check fail. Not for adding or upgrading dependencies (use dependency-change), and not for runtime speed work (use performance-sensitive-change).
---

# Codebase modularity

A size-budget failure is a code-shape failure. Fix the shape, never the
budget. The repository owns its limits, its checker, and any grandfather
baseline; this skill owns how to stay inside them.

## 1. Check before editing

- Check every file you will touch against the repository-owned size budget.
- If a file is already over budget, leave it untouched or leave it smaller.
  Do not add new policy, checks, resources, or interface logic to it.
- Name the target module before moving code: the domain seam it belongs to
  and the folder that makes that domain obvious.

## 2. Split along seams

- Prefer focused domain modules over catch-all files. The folder layout
  shows the domain boundaries.
- Keep entry points thin. A command-line entry, configuration entrypoint, or
  page wrapper coordinates and delegates; checks, helpers, components,
  queries, and formatting live in focused modules.
- Extract pure helpers first, then move one domain at a time.
- Preserve public names and contracts: exported symbols, check names,
  infrastructure logical names, workflow names, and routes.
- Keep extraction behavior-preserving. Combining a behavior change with a
  large extraction needs explicit owner approval and a map showing which
  proof still covers each moved behavior.
- Split test files by behavior before they become hard to read. Build large
  fixtures from composable builders, not one giant baseline writer.

## 3. Never game the budget

These are rejected:

- Raising a baseline or adding a grandfather entry for a file the same work
  changed.
- Moving one oversized file into a new oversized file without a recorded
  split target and a smaller baseline.
- Calling a budget edit reviewed when the owner did not ask for budget work.
- Claiming ready while a touched file still fails the size check.

When an extraction brings a grandfathered file under the normal budget, or
deletes it, remove its obsolete entry in the same change.

## 4. Stop and ask the owner before

- growing an over-budget file instead of shrinking it;
- creating a new file over the repository's hard limit;
- renaming a public check, infrastructure, workflow, or route name;
- changing generated infrastructure identity.

## Done when

- Before and after sizes of touched files, and the new largest file in the
  area, are recorded.
- Focused tests and the repository's size check pass on every touched file.
