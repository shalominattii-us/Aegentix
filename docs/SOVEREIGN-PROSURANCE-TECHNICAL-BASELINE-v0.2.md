# Sovereign Prosurance Healthcare Network — Technical Baseline v0.2

**Product name:** Sovereign Prosurance Healthcare Network  
**Short name:** Prosurance  
**Parent ecosystem:** AEGENTIX  
**Status:** Consolidation baseline; not production-certified  
**Date:** 2026-11-18

## 1. Product identity and mission

Sovereign Prosurance is a human-centered healthcare workforce network connecting healthcare professionals, facilities, recruiters, credentialing workflows, and contract opportunities. It is designed to strengthen professional agency, trusted mobility, and workforce resilience.

**Positioning:** A trusted, sovereign network for healthcare work—where professional identity is controlled by the provider, credentials have verifiable provenance, opportunities are explainable, and people remain accountable for decisions.

Blockchain is not part of the product name or a prerequisite for participation. It may be evaluated as an optional infrastructure for credential provenance, consent receipts, or settlement only where it improves trust and is legally appropriate. The core product remains fiat-compatible and usable without cryptocurrency.

## 2. Canonical product and code ownership

- **Canonical product experience:** existing Floot project, project ID 3b4a98de-5ce5-4d33-952c-7e6175d9ca81, to be rebranded as Sovereign Prosurance Healthcare Network.
- **Deployment sovereignty boundary:** the current Floot project is a hosted development/preview environment backed by Floot-managed Postgres. It is not yet a self-hosted, jurisdiction-pinned, vendor-independent production deployment. Treat the current build as a prototype until source export, database portability, private storage, deployment jurisdiction, key custody, backups, and vendor-exit procedures are verified.
- **Recruiting workflow source:** shalominattii-us/Aegentix (AEGENTIX Prosurance). Reuse its domain logic and workflow patterns; do not deploy its current backend with real provider data.
- **Healthcare interface/source material:** shalominattii-us/CYBERCORE-ai-studio, especially SovereignHealthcareView.tsx and medical-recruiting-platform/.
- **Earlier source material:** shalominattii-us/Aegentix-super-agent-wallet-Google-ai-studios/medical-recruiting-platform/.
- **Do not create a second parallel healthcare marketplace.** The canonical app is the product; the GitHub recruiting repository is a migration source until its capabilities are ported and validated.

## 3. Verified current state

### Canonical Floot app

Existing implementation includes:
- Password authentication and session handling backed by Floot-managed Postgres.
- Role selection for provider, facility/client, and recruiter/admin.
- Provider profile persistence and onboarding status.
- Facility organization, facility record, and owner membership creation.
- Server-side role checks on provider profile and facility workspace endpoints.
- Database tables currently represented in generated schema: users, passwords, sessions, login attempts, onboarding, provider profiles, organizations, organization members, and facilities.

Not yet implemented or verified:
- Credential wallet, secure document upload, verification queue, and verification evidence.
- Opportunity/contract marketplace and provider search.
- Matching, applications, interview/offer/placement pipeline.
- Organization-scoped recruiter/admin workspace and comprehensive tenant authorization.
- Consent-based sharing, provenance history, and complete audit event coverage.
- Billing/subscriptions and external interoperability integrations.
- End-to-end production security, compliance validation, and live operational testing.

The project is not published. Current typecheck/test evidence is limited and does not establish production readiness.

### GitHub AEGENTIX Prosurance

The repository contains a more complete recruiting prototype:
- Clinician and employer records, jobs/requisitions, deterministic explainable matching.
- Candidate submissions and a nine-stage pipeline.
- Interviews, placements, fee calculations, exports, credential expiry reporting, and audit activity.
- Node/Express API, SQLite persistence, React/Vite frontend, and API tests.

It is a prototype and must not be used with real healthcare data until its security and data architecture are remediated.

## 4. Security findings requiring remediation

1. **JWT secret fallback:** server/auth.js falls back to a hard-coded signing secret when JWT_SECRET is absent. Production must fail closed without a securely provisioned secret; no default or committed secret.
2. **Credential verification authorization:** server/routes/credentials.js allows any authenticated user to set a credential to verified. Verification must be restricted to explicitly authorized verifiers, with evidence, source, timestamp, verifier identity, and review controls. A user must not self-verify their own credential.
3. **Submission authorization and tenant isolation:** server/routes/submissions.js exposes list/create/update/delete to any authenticated user and does not enforce organization boundaries. Authorization must be checked against organization membership and record ownership for every read and mutation.
4. **Destructive seed behavior:** the current seed routine deletes business tables before repopulating them. It must never run against production or real data. Replace with isolated test fixtures and idempotent non-destructive development seeding.
5. **Public demo credential exposure:** README includes demo account passwords. Remove usable passwords from public documentation; rotate any credentials that may have been reused.
6. **Data platform:** SQLite is single-node prototype storage. Use the canonical Postgres foundation with tenant-aware schema, constraints, migration discipline, backups, and tested recovery.
7. **Sensitive documents:** credential files require private object storage, encryption, strict authorization, malware/type/size checks, short-lived signed access, retention controls, and auditable access.
8. **Audit integrity:** important state transitions must be transactionally paired with append-only audit events. Audit failure must not silently disappear for security-critical operations.
9. **Compliance claims:** HIPAA-oriented code is not HIPAA certification or proof of compliance. Before handling PHI or production credential documents, complete risk analysis, policies, access controls, encryption, vendor/BAA review, incident response, and independent legal/security review.

## 5. Canonical architecture and data model

Use the Floot/Postgres app as the canonical system and extend its schema in controlled migrations. Core entities:
- Identity: users, sessions, provider_profiles, professional identifiers.
- Organizations: organizations, organization_members, facilities, roles and scoped permissions.
- Credentials: credentials, credential_documents, credential_verifications, issuers, evidence, expiry and revocation events.
- Workforce demand: opportunities/contracts, shifts, requirements, facility settings, compensation terms.
- Matching and workflow: match evaluations, applications/submissions, interviews, offers, placements/activations.
- Consent and trust: provider_facility_consents, sharing grants, source_records, provenance events, audit_events.
- Operations: notifications, subscriptions, invoices/settlements, disputes, quality and outcome metrics.

Every organization-owned record must carry an organization boundary or be reachable only through a validated relationship. Provider-controlled data sharing must be explicit, revocable where legally possible, purpose-bound, and logged. Do not expose unnecessary personal data in discovery/search responses.

## 6. Matching principles

Port and improve the deterministic Prosurance matching approach. Match explanations should cover specialty/discipline, credentials and jurisdiction, competency/experience, availability, schedule, location/travel, compensation fit, contract duration, facility requirements, provider preferences, and urgency.
- Show score components and human-readable reasons.
- Do not use protected characteristics or opaque proxies for unlawful discrimination.
- Validate licensing rules and compact privileges against authoritative sources.
- Matching is decision support; facilities and professionals retain human agency.

## 7. Delivery sequence

### Phase 0 — Reconciliation and guardrails
- Keep the Floot/Postgres app canonical.
- Preserve Prosurance as the product name and migrate recruiting capabilities, not the SQLite database.
- Document schemas, API contracts, role definitions, data ownership, and migration mapping.
- Separate development/demo data from real user data.
- Establish test and security gates before any publish or real-data use.

### Phase 1 — Security and tenant foundation
- Define organization membership, platform admin, recruiter, facility, and provider permissions.
- Add tenant-scoped authorization to every organization-owned endpoint.
- Establish audit events, consent records, secure file storage, retention and export controls.
- Add automated negative tests for cross-tenant access, privilege escalation, self-verification, and unauthenticated access.

### Phase 2 — Credential Intelligence
- Credential metadata and private document workflow.
- Verification queue with authorized verifier roles and evidence/provenance.
- Expiration, renewal, revocation, and status history.
- Provider-controlled sharing grants.

### Phase 3 — Opportunities and matching
- Facility opportunity creation and management.
- Provider discovery with minimal disclosure and consent.
- Explainable, deterministic matching and provider preferences.
- Human-reviewed application/submission workflow.

### Phase 4 — Recruiting operations
- Interviews, offers, placement/activation, notifications, and operational dashboards.
- Organization-level reporting and audited exports.
- Billing and settlement only after contract, tax, and regulatory review.

### Phase 5 — Pilot readiness
- Threat model and security review.
- Accessibility, usability, backup/restore, observability, incident response, and load testing.
- Contractual/privacy documentation and required vendor agreements.
- Controlled pilot with synthetic data first, then explicitly authorized limited real data after approvals.

## 8. Acceptance gates

No production launch with real provider or facility data until:
- Tenant isolation tests pass across every sensitive endpoint.
- Credential verification cannot be self-approved or performed by unauthorized roles.
- Secrets are provisioned and rotated; no development defaults remain.
- Document access is private, scoped, time-limited, and audited.
- Destructive seed/reset tools are excluded from production.
- Audit events are reliable and transactionally consistent for critical mutations.
- Backups and restore are tested.
- Privacy, security, contractual, and compliance review is complete.
- End-to-end workflows are tested with synthetic data and then a controlled pilot.

## 9. Immediate next implementation tasks

1. Rebrand canonical app UI and metadata as Sovereign Prosurance Healthcare Network.
2. Create a schema/API reconciliation map between Floot/Postgres and AEGENTIX Prosurance/SQLite.
3. Implement organization-scoped roles and tenant authorization tests before adding recruiter data access.
4. Implement Credential Intelligence as the first functional vertical.
5. Port opportunities, matching, and pipeline in sequence, with explicit consent and audit coverage.
6. Keep the GitHub source branch isolated until review and tests pass; do not merge or publish unreviewed changes.

---
This document records observed code state and a safe migration plan. It is not a certification, legal opinion, or claim that the product is production-ready.