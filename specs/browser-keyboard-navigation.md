# Browser Keyboard Navigation

Status: shipped. Optional, opt-in, off by default.

## Decision

Groundwork does not make Chrome (or Chrome Beta) Vim-like by default, does not
maintain a Groundwork-specific browser keymap, and does not repurpose
`Ctrl+h/j/k/l` as browser-tab shortcuts. Ordinary browser behavior is the
default for every profile.

Groundwork offers one optional capability: Vim-style browser navigation via
[Vimium](https://chromewebstore.google.com/detail/vimium/dbepggeogbaibhgnhhndojpepiihcmeb),
using Vimium's own standard mappings. It is a preference
(`browser_navigation`, `standard` or `vimium`), selected through
`groundwork-configure`, never inferred from another answer.

## Why this is a preference, not a default

Groundwork configures the developer's own environment strongly where it owns
the environment: the shell, tmux, the editor, Karabiner. A browser is not that
kind of surface. It is the user's tool for reading the rest of the web, and an
intrusive navigation layer changes muscle memory for every page the person
visits, not just the ones Groundwork manages. Selecting Vim as an editor
implies nothing about browser preference — Groundwork has no editor choice
today (Neovim and Vim both install unconditionally), and this preference stays
independent of one if it ever gains one.

This is deliberately narrower than the app-launching and window-management
ergonomics Groundwork already configures strongly (Karabiner's Caps Lock
remap, key repeat, Raycast). Those operate on the OS and the terminal, surfaces
Groundwork owns outright. A browser page is not.

## Why Vimium, and why its standard mappings

Vimium is the established, widely used answer to "Vim-style browser
navigation" — not a niche choice Groundwork is introducing. Groundwork ships
its default mappings rather than a Groundwork-authored keymap layered on top,
for the same reason it ships upstream defaults elsewhere it can: a maintained
keymap the user already knows (from other machines, from Vimium's own docs)
beats one more Groundwork-specific thing to remember, and it is one fewer
surface Groundwork has to keep in sync with Vimium's own releases. Anyone who
wants different mappings configures Vimium directly; Groundwork does not
expose per-shortcut customization.

## Why `Ctrl+h/j/k/l` is not repurposed for browser tabs

Groundwork keeps a clear line between two different jobs:

- **Spatial pane/window navigation** — tmux, the terminal, the editor. Moving
  between panes is a spatial operation with a direction.
- **Browser/document navigation** — scrolling, following links, tabs. This is
  not spatial; it operates on an ordered list of tabs and a document's
  content.

Collapsing both onto the same keys does not make the system more consistent;
it makes one gesture mean two different things depending on which app has
focus. Vimium's own conventions already solve tab navigation without touching
that spatial vocabulary:

```text
h / j / k / l    page navigation (scroll, not panes)
f / F            follow a link / follow a link in a new tab
/ , n / N        find, next/previous match
gt / gT          next / previous browser tab (ordered, not spatial)
^                previously used browser tab
t / x / X        new tab / close tab / restore closed tab
o / O            open or search a URL
H / L            history back / forward
```

`gt`/`gT` and `^` are Vimium's own conventions for an *ordered* and a
*most-recently-used* tab operation, respectively — Groundwork does not need to
invent an equivalent or compete with Chrome's native `Ctrl+Tab`, which
continues to evolve independently. The goal is consistency through
established, external conventions, not consistency through forcing every
application onto identical keystrokes.

## Stable and preview (Chrome Beta)

The preference is implemented once, at the same logical level Groundwork
already uses for the browser selection itself
(`home/.chezmoitemplates/browser-brewfile`): one row in
`home/dot_local/share/groundwork/browser-extensions.tsv`, gated on
`browser_navigation == "vimium"`. `browser-extensions` fans that one row out to
every Chrome channel the current release posture actually installs — Chrome
Stable always, Chrome Beta additionally under preview — because the Chrome Web
Store URL is identical regardless of channel; only which app it opens into
differs. No channel duplicates the catalog entry, and a future Chromium
channel needs one more case in `targets_for_browser()`, not a new row or a new
scope.

If preview is later disabled, Groundwork does not uninstall Chrome Beta or
touch its extension state — the same non-destructive posture Groundwork
already applies to the browser channel itself
(`docs/troubleshooting.html` / `groundwork-doctor`'s browser section).

## What Groundwork manages, and what it does not

Groundwork manages: the preference itself (`browser_navigation`, read via
`groundwork-configure`); which Chrome Web Store link the preference points at,
per channel; and a discoverable command (`browser-extensions`) to see or open
that link.

Groundwork does not: install the extension for the user, mutate a Chrome
profile database, use enterprise/device force-install policy, or bypass
Chrome's own install-confirmation prompt. The user clicks "Add to Chrome"
themselves. This is the same boundary Groundwork already holds for every other
catalog entry in `browser-extensions.tsv` (the password manager, uBlock
Origin, the Obsidian clipper) — none of them are force-installed either.
`browser-extensions` is never invoked automatically by `update-all` or any
apply hook; nothing about this preference repeats or nags on a later run.

## Omarchy influence, and where Groundwork stops following it

This direction is informed by Omarchy's approach: strong keyboard ergonomics
around the environment and application launching, without making the browser
itself Vim-like by default — page navigation stays ordinary unless the user
explicitly adds something like Vimium. Groundwork does not adopt any
Omarchy-specific mechanism or dependency; the borrowed idea is the principle,
not the implementation:

> Configure the developer environment strongly where Groundwork owns the
> environment, but keep an intrusive application-specific navigation layer
> explicit and optional.

## Implementation

- `home/.chezmoi.toml.tmpl` — `browser_navigation` preference, never prompted
  at bootstrap (same pattern as `beta`, the Xcode beta-channel preference:
  mutable, `groundwork-configure`-only, defaults to `"standard"`).
- `home/dot_local/bin/executable_groundwork-configure` — settings-editor field
  (`browsernav` kind), the same generic field-registry mechanism every other
  choice setting uses.
- `home/dot_local/share/groundwork/browser-extensions.tsv` — one Vimium row,
  `scope=vimium`, gated the same way the password-manager rows already are.
- `home/dot_local/bin/executable_browser-extensions.tmpl` — reads
  `browser_navigation`; `targets_for_browser()` fans a matching row out across
  the active Chrome channel(s).
- `home/dot_local/bin/executable_groundwork-doctor` — reports the selected
  preference and the one-time setup command in the existing browser section;
  read-only, no mutation.
