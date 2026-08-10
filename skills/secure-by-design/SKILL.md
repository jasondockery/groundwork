---
name: secure-by-design
description: Design or review a trust boundary, untrusted input, authorization or authentication flow, credential, workflow, integration, agent capability, or privileged operation. Use before implementation to threat-model the boundary, minimize privilege, validate contextually, and fail closed.
---

# Secure by design

1. Describe the trust boundary before implementation: who can reach it, which
   inputs and authority cross it, the assets at risk, and how failure appears.
2. Enforce authorization at the boundary that owns the resource. UI hiding and
   caller assertions are not authorization.
3. Minimize privileges, token scopes, workflow permissions, network reach, data
   access, and credential lifetime. Every grant names its purpose.
4. Validate at entry, encode for the output context, use parameterized
   interfaces, bound uploads and expensive requests, and reject unsafe redirects,
   deserialization, request forgery, and command construction by design.
5. Set session, cookie, transport, origin, and security-header policy explicitly
   where the protocol supports them. Never log, commit, or expose credentials.
6. Treat dependencies, build inputs, restored artifacts, third-party scripts,
   actions, and agent-delivered instructions as supply-chain inputs. Pin or
   attest immutable identities where the boundary requires it.
7. Fail closed when required configuration, identity, validation, or audit
   evidence is missing. Preserve the first authoritative failure and provide a
   bounded recovery path.
8. Redact secrets and personal data in logs and secondary systems. Load
   `privacy-by-design` when the change handles personal data.
9. Design backup, recovery, revocation, rotation, and destructive-operation
   authority before the protected data or capability becomes critical.
10. Map application-security requirements to versioned identifiers when a
    formal standard is used. OWASP ASVS `v5.0.0-<requirement>` is the current
    stable application-verification basis; repositories own the applicable
    level, exact requirements, findings, and enforcement.

Reviewed 2026-08-10 against the official
[OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/),
stable version 5.0.0.
