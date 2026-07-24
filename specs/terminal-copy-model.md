# Terminal Copy Model: Ghostty + tmux Coherence

Status: **core runtime model shipped on `origin/main`** (`859dcfe`,
review-hardened `8d7e517`); the acceptance contract is **partially complete**.
The owner approved the 10 Product decisions (2026-07-23).

| Area | Status |
| --- | --- |
| tmux clipboard architecture (`set-clipboard external`, single OSC 52 path) | Shipped |
| `tmux-yank` removal + stale-binding cleanup | Shipped |
| Persistent mouse selection | Shipped |
| Conditional right-click bindings | Shipped (syntax + effective key table) |
| Actual Ghostty Option-right-click event routing | Real-GUI receipt still required |
| `tmux-copy-cwd` safe helper | Shipped |
| yazi pane-scoped `allow-passthrough` | Shipped |
| Ghostty platform-specific settings | Shipped |
| Canonical `config.ghostty` filename migration | Open (deferred; kept `config.tmpl`) |
| All teaching surfaces + competency gates A/B | Partial |
| `groundwork-doctor --terminal` | Open |

Shipped in full: the tmux/Ghostty copy model, the safe `tmux-copy-cwd` helper,
the `allow-passthrough` decision (global off; kept on only for the yazi pane),
effective-tmux-server + injection fixtures, and the `tmux.html`/cheat-sheet/
practice teaching. Open follow-ups: the `config.ghostty` filename migration
(kept `config.tmpl` to avoid the risky legacy-target removal), the remaining
teaching surfaces + competency gates A/B, and `groundwork-doctor --terminal`.
Supersedes the ROADMAP "Terminal copy model (Slice B)" bullets, which track
those follow-ups.

Implement under `skills/terminal-interaction` and `skills/chezmoi-change`.

## Problem

Selection and copy read as one confusing experience because more than one layer
owns a selection model:

- With `set -g mouse on`, a normal drag inside a pane makes a **tmux** selection
  (tmux copy mode), not a Ghostty one.
- Holding **Shift** hands the mouse to Ghostty, producing a **Ghostty-native**
  selection of only what the outer terminal currently displays.
- The two do not compose: a Ghostty Shift-selection cannot extend a tmux
  drag-selection, and neither can search or traverse the other's scrollback.
- Right-click inside a pane shows **tmux's** pane menu (split/respawn/zoom/…),
  not a macOS context menu — because tmux, not Ghostty, receives the event while
  mouse mode is on.

Field-hit 2026-07-22: a user tried Shift-click to extend a selection and
right-click to copy, and got neither, because the selection began as a tmux drag
and the right-click hit tmux's menu. The fix is not to make the mixed model
slightly nicer (e.g. adding "Copy selection" to tmux's menu); it is to teach one
durable model per context.

## Ownership model (three owners, not two)

```text
Outside tmux:
  Ghostty owns terminal scrollback, search, selection, and copy.

Inside tmux, ordinary shell/output pane:
  tmux owns retained history, search, selection, and copy.

Inside tmux, a mouse-aware foreground app (Neovim, lazygit, less, anything with
mouse reporting on):
  the application owns normal mouse interactions, via tmux's default
  conditional forwarding (`#{mouse_any_flag}`).

Shift-modified raw selection (any context):
  Ghostty owns a visible-screen-only selection — an escape hatch, not the
  primary path; it cannot search or traverse tmux's retained scrollback.
```

Teaching posture: keyboard-first, mouse-assisted. The mouse is a convenience
(pane focus, status-line window selection, trackpad/wheel scroll, border resize);
the keyboard copy/search workflow is the required skill. Do NOT disable the tmux
mouse — it would not turn tmux's retained history into Ghostty scrollback anyway.

## Configuration target

**Implementation status: SHIPPED** (`859dcfe`, review-hardened `8d7e517`). The
changes prescribed in this section are the DELIVERED contract, not a proposal —
read them as "what ships." The only open items are in the ROADMAP (the deferred
`config.ghostty` filename migration, the remaining teaching surfaces, and
`groundwork-doctor --terminal`).

Baseline this changed FROM (verified 2026-07-22/23 before implementation):
`home/dot_config/tmux/tmux.conf.tmpl` had `mouse on`, `set-clipboard on`,
`allow-passthrough on`, vi copy-mode `v`/`C-v`/`y`, `prefix+Y` copy-last, and the
`tmux-yank` plugin loaded; `home/dot_config/ghostty/config` (Ghostty 1.3.1) had
`copy-on-select = clipboard`.

### One clipboard architecture — remove `tmux-yank`

`tmux-yank` rebinds copy-mode `y` to an EXTERNAL copy command (`pbcopy` on
macOS), while `tmux-copy-last` uses tmux's NATIVE `load-buffer -w`. Shipping both
is two clipboard paths (tmux warns mixing native and `copy-pipe` can duplicate or
conflict). Remove `tmux-yank` from the default plugin set and standardize on the
native path:

```tmux
set -s set-clipboard external

bind -T copy-mode-vi y send -X copy-selection-and-cancel
# keep the semantic last-command copy (already native):
bind Y run-shell -b '"$HOME/.local/bin/tmux-copy-last" "#{pane_id}" "#{client_name}"'
```

Resulting single path: tmux selection → tmux paste buffer → native clipboard
integration → outer terminal via OSC 52. More portable over SSH, and it deletes
the plugin load-order problem.

On removal, its extras were inventoried (copy current line, copy pane working
directory, paste/yank combos); only `prefix+C-y` (pane working directory) was
re-added, as a native Groundwork binding — not a whole second clipboard
subsystem. (Rejected interim, recorded so it is not revived: keeping the plugin
temporarily behind `set -g @yank_with_mouse off` was considered and dropped — it
would ship two clipboard models at once, with ordinary `y` still using an
external clipboard command instead of OSC 52. The plugin is simply gone, not
half-kept.)

`set-clipboard external`: tmux still copies selections outward via OSC 52, but
programs inside tmux can no longer set tmux's clipboard — the right posture when
panes run agents and untrusted scripts. Requires the outer terminal's `Ms`
capability; verify `tmux show -s set-clipboard`, `tmux info | grep 'Ms:'`, and a
real end-to-end clipboard test.

### Persistent mouse selection

With `tmux-yank` gone, tmux's default `MouseDragEnd1Pane` copies and exits copy
mode on release. To let a mouse drag place a selection the user completes with
`y`:

```tmux
unbind -T copy-mode-vi MouseDragEnd1Pane
```

(Clean now that no plugin rebinds it; still prove with a fixture.)

### Right-click: conditional, not unconditional

Do not blanket-replace `MouseDown3Pane` — that would steal right-click from apps
that use it. Preserve the app-forwarding branch:

```text
mouse-aware app, or pane already in copy mode  → forward the mouse event
ordinary shell pane                            → show a concise copy-mode hint
Option-right-click (a modified binding)        → tmux pane menu (advanced escape hatch)
```

Hint text, no selection-aware copy item:

```text
Copy pane history: Ctrl+A [ … v … y   ·   Raw terminal selection: hold Shift while dragging
```

Exact bindings (`MouseDown3Pane`, the `#{mouse_any_flag}` condition, the
Option-modified menu) were validated in the effective-tmux-server fixtures: the
binding syntax parses, the effective copy-mode key table contains them, and the
menu command is valid. That is the tmux-side proof. What an isolated tmux server
cannot show is that Ghostty on macOS actually converts an Option-right-click into
the expected tmux mouse key — that event routing remains a real-GUI receipt (see
the validation section on Shift-drag / context-menu / clipboard behavior).

### Ghostty (macOS) — explicit copy model

`right-click-action = context-menu` confirmed real on the installed Ghostty 1.3.1
(`ghostty +show-config --default`):

```ini
copy-on-select = false
selection-clear-on-copy = true
mouse-shift-capture = never
right-click-action = context-menu
```

- Selection is not silently copied; `Cmd+C` is the explicit copy and clears the
  selection afterward.
- `mouse-shift-capture = never` reserves Shift-modified mouse gestures for
  Ghostty even when a pane app would want them — a deliberate compatibility
  tradeoff (the right Groundwork choice, not a free setting).
- Do NOT use `right-click-action = copy-or-paste`: right-clicking empty space
  would paste, dangerous in a shell.
- Verify the effective result with `ghostty +show-config`.

### Ghostty source migration (transaction, not a rename)

Ghostty loads, in order: XDG `config.ghostty`, legacy XDG `config`, macOS
Application Support `config.ghostty`, macOS Application Support legacy `config` —
later files override earlier. So renaming the chezmoi source from
`home/dot_config/ghostty/config` to `config.ghostty` does NOT remove the existing
`~/.config/ghostty/config`, which would keep loading and override the new file.
Required migration:

1. Inspect all four possible paths.
2. Hash and classify each: Groundwork's exact former managed file / empty /
   user-modified / unrelated.
3. Install `config.ghostty`.
4. Auto-remove the old file ONLY when proven byte-identical to Groundwork's
   former managed predecessor.
5. Otherwise show overlapping keys and request explicit consent.
6. Back up any user-modified file before migrating.
7. Verify final effective values with `ghostty +show-config`.

### `allow-passthrough` — delivered: global off, scoped on for yazi

`set -g allow-passthrough on` lets pane apps emit wrapped sequences through tmux
to the outer terminal. The inventory was done and the decision is made: the one
identified consumer is **yazi** (image previews), so passthrough is **off
globally** and enabled **narrowly on the yazi pane only**. That keeps
`set-clipboard external`'s isolation promise honest everywhere else — a global
`on` would imply less isolation than the config delivers.

Rationale preserved for the next change: the consumers to re-check before
touching this are terminal image protocols, notification sequences,
clipboard-forwarding assumptions, Ghostty-specific integrations, Neovim plugins,
and AI tools that render images or rich output. Add a new consumer the same way
yazi was — document the exact protocol and scope passthrough to that pane/app —
never by flipping the global default back on.

## Required keyboard competencies

Completed without a mouse (Groundwork `Ctrl+A` prefix, vi copy mode):

| Goal | Workflow |
| --- | --- |
| Enter pane history | `Ctrl+A [` |
| Move | `h j k l` / arrows |
| Page up/down | `Ctrl+B` / `Ctrl+F` in copy mode |
| Top/bottom | `g` / `G` |
| Search fwd/back | `/` / `?` |
| Repeat/reverse search | `n` / `N` |
| Start selection | `v` |
| Rectangle selection | `Ctrl+V` |
| Copy and leave | `y` |
| Cancel/leave | `q` |
| Copy last command + output | `Ctrl+A Y` |

## Competency gates (practice plan / Groundwork Twelve)

Gate A — terminal history. Advance only when the learner can: produce 5+ pages of
output; enter copy mode; page up/down without losing position; search backward
for a unique error string; repeat the search; select across 2+ visible pages;
**copy to the host/system clipboard using the supported platform path and paste
into a temp file**; copy the last command + output with `Ctrl+A Y`; explain why
Ghostty search/selection cannot inspect tmux's retained scrollback (and how a
mouse-aware app is a third owner); repeat keyboard-only. Mouse use does not
satisfy the gate. Platform clipboard evidence: macOS `pbpaste`; Wayland
`wl-paste`; X11 the configured tool; WSL2 Windows clipboard integration; headless
— report clipboard integration unavailable and test the tmux buffer + emitted
OSC 52 instead. The objective is understanding the clipboard path, not memorizing
Apple tooling.

Gate B — pane/window control: `Ctrl+A h/j/k/l` move panes; `Ctrl+A H/J/K/L`
resize; keyboard window switching; `Ctrl+A ?` to find an unfamiliar binding;
detach and reattach without losing work.

## Teaching surface (all must update, not one paragraph)

`docs/tmux.html` (canonical owner model + full copy/search tutorial),
`docs/keyboard.html`, `docs/command-line.html` (terminal vs shell vs tmux
history), `docs/cheatsheet.html`, `docs/commands.html` + `commands.tsv`,
`docs/practice.html` (Gate A/B), `docs/groundwork-twelve.html`,
`docs/troubleshooting.html` ("selection will not extend", "wrong right-click
menu"), `docs/game-dev-learn.html` Module 5 (require paging, forward/backward +
repeat search, multi-page selection, copy to system clipboard, semantic
last-command copy, and an explanation of the Ghostty/tmux/app ownership layers),
`docs/setup.html` (effective config + reload/restart).

Lead the docs with the diagnostic:

```text
Inside tmux?  tmux owns pane history, search, selection, and copy.
Inside tmux, in a mouse app (nvim/lazygit)?  the app owns the mouse.
Outside tmux? Ghostty owns scrollback, search, selection, and copy.
Raw terminal selection inside tmux? Hold Shift — but it cannot extend a tmux selection.
```

## Validation (three proof classes — report honestly)

Automatable in an isolated tmux server + pty fixture: loaded key tables AFTER
tpm; app-forwarding vs shell-hint branch; persistent mouse selection; paging/
search keys; selection across multiple history pages; OSC 52 bytes emitted;
`set-clipboard=external`; `Ms` present; OSC 133 marks; `tmux-copy-last`.

Automatable via the Ghostty CLI: recognized setting names; effective values;
config load/override order; installed version (>= 1.3.1).

Requires a real macOS Ghostty GUI session: actual Shift-drag routing; selection
clearing after Cmd+C; context-menu behavior; the system clipboard receiving the
expected text; trackpad drag/scroll ergonomics.

The skill must report which classes actually ran — a headless CI run must never
claim it proved user-visible Ghostty GUI behavior.

## Product decisions (approved 2026-07-23; implemented in `859dcfe`)

1. Keyboard-first, mouse-assisted as the taught model.
2. Keep tmux mouse support on.
3. Persistent mouse selection (`y` completes the copy).
4. Native tmux OSC 52 clipboard; **remove `tmux-yank`**.
5. Ordinary shell right-click = teaching hint; mouse-aware app right-click =
   forwarded; Option-right-click = tmux pane menu; no selection-aware copy item.
6. `set-clipboard external`.
7. `allow-passthrough off` unless an inventory finds a consumer (then narrow).
8. Ghostty explicit copy model (`copy-on-select=false`,
   `selection-clear-on-copy=true`, `mouse-shift-capture=never`,
   `right-click-action=context-menu`).
9. Shift-drag is an escape hatch, not the primary workflow.
10. Cross-platform keyboard competency gates.
