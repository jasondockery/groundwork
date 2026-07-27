---
name: terminal-interaction
description: Keep terminal selection, history, search, and copy coherent across Ghostty and tmux. Use when changing Ghostty or tmux mouse/selection/clipboard/search/history/menu behavior, terminal shell integration, semantic command marks, tmux-copy-last, or the docs that teach them.
---

# Terminal Interaction

Selection, scrollback, search, and copy live in layers that each own a model.
When they overlap invisibly, users cannot tell which layer made their selection
or why a copy or extend "did nothing". Keep exactly one documented owner per
context, keep every operation keyboard-complete, and ship one actual clipboard
path — not just one conceptual model.

`specs/terminal-copy-model.md` is the authority. Config edits go through
`skills/chezmoi-change`; anything that mutates state also loads
`skills/safe-mutating-cli`.

## Governance

The spec's Product decisions are the authority on WHAT changes. While the spec is
`Status: draft` or any of those decisions is unresolved, do NOT change shipped
muscle memory or clipboard/security posture (tmux mouse/clipboard/menu/passthrough
bindings, Ghostty selection/clipboard/right-click settings). Work that does not
alter shipped behavior — the spec itself, docs that describe the agreed model,
fixtures and validation harness — may proceed. Once a decision is accepted,
implement exactly it.

## Ownership model (three owners)

- Outside tmux: Ghostty owns scrollback, search, selection, copy.
- Inside tmux, ordinary shell/output pane: tmux owns them.
- Inside tmux, a mouse-aware foreground app (Neovim, lazygit, less): the app owns
  the mouse via tmux's conditional forwarding (`#{mouse_any_flag}`).
- Shift-modified selection: Ghostty owns a visible-screen-only selection — an
  escape hatch, not the primary path.

## Rules

- Keep the tmux mouse on; do not "fix" the model by disabling it.
- One clipboard path: prefer native tmux + `set-clipboard external` (OSC 52) over
  a plugin's external `copy-pipe` (`tmux-yank` uses `pbcopy`). Do not ship both
  and claim one — `tmux-copy-last` is already native, so ordinary `y` must be too.
- Right-click stays CONDITIONAL: forward it to mouse-aware apps; show a copy-mode
  hint only in an ordinary shell pane; keep the pane menu on a modified binding.
  Never add selection-aware copy to that menu (it preserves the mixed model).
- Do not enable `allow-passthrough` globally without an identified consumer.
- Keep Shift-drag documented as an escape hatch; it cannot search or traverse
  tmux's retained scrollback.
- A mouse drag is CONDITIONAL: it only reaches tmux when tmux owns the mouse. In
  a mouse-aware TUI (Neovim, lazygit, Claude Code's fullscreen view) the app
  consumes it. Never document drag as universally available; keyboard copy mode
  is the route that works in every pane.
- Before documenting tmux copy mode as the only route inside a TUI, check whether
  the application exposes a full transcript, export, pager, or editor view. A
  self-redrawing app leaves rendered FRAMES in tmux's scrollback, not its text —
  teach the application-native route for complete semantic content (Claude Code:
  `Ctrl+O` then `[`, or `v` for `$EDITOR`; both need fullscreen rendering) and
  tmux copy mode as the universal terminal fallback.
- Account for plugin load order: tmux plugins (e.g. `tmux-yank`) load after the
  main config and can re-bind mouse keys. Never assume a bare `unbind` sticks;
  removing the plugin removes the race.
- Every copy/search/selection workflow is keyboard-complete and honors `NO_COLOR`.

## Verify (three proof classes — report which ran)

- tmux/pty fixture (isolated socket) — keep the three routes SEPARATE, because a
  mouse proof never establishes a keyboard capability:
  - **Keyboard copy mode:** key tables after tpm, paging, forward/backward search
    and repeat, multi-page selection, `v` begin-selection, `y`
    copy-selection-and-cancel, `q` cancel.
  - **Mouse quick-copy:** drag-release bound to the copy action; the buffer
    actually receives the selected pane text; copy mode exits afterwards; and
    convergence when sourced into a server carrying the OLD unbind (a fresh
    server passes either way, so that case proves nothing).
  - **Terminal bypass:** Shift-drag stays Ghostty's, including while an app
    requests mouse reporting.
  - Shared: app-forward vs shell-hint branch, OSC 52 bytes,
    `set-clipboard=external`, `Ms` present, OSC 133, `tmux-copy-last`.
- Ghostty CLI: recognized settings, effective values, load/override order,
  version (`ghostty +show-config`; require >= 1.3.1).
- Real macOS Ghostty GUI: Shift-drag routing, selection clear after Cmd+C,
  context menu, system clipboard receipt, trackpad ergonomics.

A headless run must NOT claim it proved GUI behavior. Run
`scripts/validate-groundwork`. State honestly: "config/protocol fixture passed;
real Ghostty GUI smoke passed" or "… GUI smoke not run".
