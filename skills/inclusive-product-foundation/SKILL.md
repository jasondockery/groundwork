---
name: inclusive-product-foundation
description: Classify the quality specialists required by a new application, significant feature, user-facing interface, shared component, API contract, CLI, public documentation surface, or persistent-data change. Use before implementation so accessibility, internationalization, security, privacy, and inclusive content are applied only where relevant.
---

# Inclusive product foundation

1. Inspect the repository's current product and surface authority. Do not invent
   a capability manifest, framework, or runtime merely to route this procedure.
2. Classify the change by the behavior it creates or modifies, then load every
   applicable specialist:

   | Change surface | Specialist |
   | --- | --- |
   | User-facing web, native UI, CLI, docs, email, notification, or media | `accessible-product-development` |
   | User-facing strings, formats, locale behavior, or directional layout | `internationalization-first` |
   | Trust boundary, input, authorization, credential, workflow, or agent authority | `secure-by-design` |
   | Personal data collected, stored, logged, analyzed, or transferred | `privacy-by-design` |
   | Words, examples, errors, documentation, imagery, audio, or video | `inclusive-content-design` |

3. Let an inapplicable specialist disqualify itself. A CLI-only repository does
   not acquire browser tooling; a dependency-free library does not acquire an
   internationalization runtime; translation-ready does not require shipping
   translations.
4. Put concrete components, commands, schemas, budgets, framework conventions,
   and release gates in the product repository. Compass owns the durable
   requirement and proof semantics, not each implementation.
5. Record the applicable targets, automated evidence, manual acceptance, and
   any unproven boundary separately. Never convert an omitted requirement into
   “not applicable” without evidence from the actual surface.

Accessibility, internationalization, security, privacy, and inclusive content
are architectural inputs, not end-of-project audits.
