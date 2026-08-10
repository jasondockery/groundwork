---
name: accessible-product-development
description: Design, implement, review, or prove any user-facing web, native, CLI, documentation, email, notification, or media surface for accessibility. Use for semantics, keyboard and pointer interaction, focus, color and contrast, motion, responsive presentation, assistive technology, or accessibility claims.
---

# Accessible product development

## State the claim honestly

- For applicable web content, use **WCAG 2.2 Level AA** as the conformance
  target unless the owner records another requirement.
- Keep the accessibility target, automated accessibility gate, manual
  accessibility evaluation, and conformance claim distinct. Automated tools
  establish only the criteria they can observe; they cannot establish WCAG
  conformance alone.
- Apply the relevant accessibility behavior to non-web surfaces without
  importing an irrelevant browser stack.

## Build the accessible behavior

- Prefer native semantics and established interaction patterns. When a custom
  widget is necessary, follow the applicable WAI-ARIA Authoring Practices
  pattern instead of inventing keyboard or ARIA behavior.
- Provide keyboard parity, logical focus order, visible and unobscured focus,
  escape and focus restoration for transient surfaces, and an accessible name
  that includes the visible label.
- Make loading, success, error, and recovery states perceivable. Do not require
  hover, motion, dragging, color, or animation as the only way to understand or
  operate a feature. Preserve user work after recoverable failures where
  practical; confirm or make destructive actions reversible.
- Associate labels and instructions with controls, make errors actionable,
  announce significant dynamic status appropriately, and provide text
  alternatives, captions, or transcripts for meaningful non-text media.
- Express meaning through text, labels, icons, shape, pattern, or position in
  addition to color. Verify applicable normal text at 4.5:1, applicable large
  text at 3:1, and applicable UI components or graphical objects at 3:1.
  Exercise light and dark themes and forced-colors behavior when they exist.
- Treat grayscale and protanopia, deuteranopia, and tritanopia simulations as
  human design evidence, not WCAG-conformance proof.
- Honor reduced-motion preferences and ensure motion is not required to use or
  understand the product.

## Keep the WCAG dimensions precise

- **Resize Text:** text reaches 200% without loss of content or functionality.
- **Reflow:** horizontally written content works at 320 CSS pixels without
  two-dimensional scrolling except defined exceptions. This is equivalent to
  400% zoom from a 1280 CSS-pixel viewport; it is not the 200% Resize Text test.
- **Text Spacing:** content survives user overrides of at least 1.5 times line
  height, 2 times paragraph spacing, 0.12 times letter spacing, and 0.16 times
  word spacing without content or function loss.
- **Target Size:** the WCAG 2.2 AA floor is 24 by 24 CSS pixels subject to its
  spacing and other defined exceptions. A 44 by 44 CSS-pixel target is the
  stricter enhanced target and a useful product default where practical, not
  the AA requirement.

## Cover CLI and document surfaces

- Never use color, spinner animation, or TTY-only presentation as the sole
  status channel. When color exists, support `NO_COLOR` or the ecosystem's
  equivalent and keep non-TTY output meaningful and stable.
- Make errors textual and recovery-directed. Ensure screenshots and diagrams
  have adequate textual equivalents, and keep documents usable without color.

## Select proof

Use `verification-selection` to start with static checks, then real-browser
component proof, selected composed journeys, exact deployed evidence, and
manual keyboard, assistive-technology, zoom/reflow, text-spacing, high-contrast,
motion, color-vision, and touch review as the claim requires. A green scanner
is evidence, not a certificate.

## Standards basis

Reviewed 2026-08-10 against the W3C Recommendation
[WCAG 2.2](https://www.w3.org/TR/WCAG22/), WAI
[accessibility evaluation guidance](https://www.w3.org/WAI/test-evaluate/),
and the [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/).
