---
name: internationalization-first
description: Make user-facing strings, formatted values, locale selection, search and sorting, documents, or directional layouts translation-ready from their first implementation. Use for locale authority, messages, Unicode, BCP 47 language tags, RTL, timezone behavior, culturally variable data, or localization testing.
---

# Internationalization first

Translation-ready is the goal; shipping multiple translations remains a
product decision.

1. Use UTF-8 for source, transport, storage, forms, email, and exported data.
2. Establish one repository-owned locale and message authority appropriate to
   the surface. Keep messages complete, use stable keys and named variables,
   and preserve plural and select semantics. Do not construct sentences from
   fragments whose order assumes one language.
3. Represent locales with BCP 47 language tags. Declare the document language,
   mark internal language changes where relevant, and derive base direction
   from the active locale. For HTML, apply the correct `lang` and `dir`.
4. Use logical layout properties and test both text expansion and a
   right-to-left path. Choose pseudo-locales appropriate to the repository;
   they are proof tools, not published translations.
5. Use the platform's locale-aware facilities, such as `Intl`, for dates,
   numbers, lists, collation, relative time, and display names. Treat timestamps
   as instants and make the presentation timezone explicit.
6. Preserve the user's locale choice. Do not infer it from IP address alone.
7. Accept human names, addresses, phone numbers, scripts, and reading
   directions without forcing one culture's shape. Use Unicode-aware text
   handling and locale-aware search or sorting where behavior depends on them.
8. Return stable API codes plus variables rather than English presentation
   sentences. Apply the same message authority to errors, metadata, email,
   notifications, and text alternatives where those surfaces exist.
9. Render language choices in their native script where applicable and review
   imagery, icons, examples, and ordering for cultural or directional
   assumptions.
10. Do not add a localization framework, message catalog, browser suite, or
    translations to a surface that has not earned them. Preserve a small seam
    so later localization does not require rewriting every user-facing string.

Reviewed 2026-08-10 against W3C Internationalization
[Quick Tips for the Web](https://www.w3.org/International/quicktips/) and the
IETF [BCP 47 language-tag specification](https://www.rfc-editor.org/rfc/rfc5646).
