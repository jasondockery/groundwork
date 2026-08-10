---
name: privacy-by-design
description: Design or review any collection, storage, logging, analytics, transmission, export, retention, or deletion of personal data. Use to minimize data, record purpose and retention, choose private defaults, govern secondary use, and preserve user rights independently of security controls.
---

# Privacy by design

Security controls who may access data. Privacy first asks whether the data
should exist and how it may be used.

1. Collect only the fields the accepted behavior demonstrably needs. “Useful
   later” is not a purpose.
2. Record each personal or sensitive field's classification, purpose, retention,
   deletion or anonymization behavior, logging posture, and authorized
   processors in a repository-owned review surface.
3. Default to the least-sensitive behavior. Make optional sharing, profiling,
   and telemetry deliberate choices rather than silent defaults.
4. Keep analytics separate from user content and identifiers unless the named
   purpose requires them. Never place sensitive values in URLs, logs, analytics
   events, crash reports, examples, or test fixtures.
5. Redact or pseudonymize personal data in support tools, observability,
   non-production environments, exports, and backups according to the recorded
   lifecycle.
6. Make consent specific and revocable where it is the applicable authority.
   Do not use consent language to conceal unnecessary collection.
7. Provide correction, machine-readable export, and effective deletion paths
   when the product and applicable obligations require them; include backup
   expiry and downstream processors in the lifecycle.
8. Document third-party transfers, what each processor receives, why it receives
   it, and how access ends.
9. Record applicable regional or contractual requirements in the product
   repository. Do not hardcode one jurisdiction as universal Compass policy.
10. Load `secure-by-design` for access control, encryption, credentials,
    transport, and other security mechanisms. Privacy determines what those
    mechanisms are allowed to protect and retain.
