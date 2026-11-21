# Phase 01 — Security and Tenant Foundation

**Canonical app:** Sovereign Prosurance Healthcare Network (Floot project 3b4a98de-5ce5-4d33-952c-7e6175d9ca81).
**Status:** Initial guardrails implemented; complete tenant isolation and production security remain in progress.
**Date:** 2026-11-18

## Completed in this slice

- New Postgres audit_events, credentials, credential_verifications, and provider_facility_consents tables.
- Provider credentials are stored as metadata only, with an optional last-four identifier fragment; the app does not request or store full credential numbers.
- Provider consent is purpose-bound and can be granted or revoked per organization.
- Credential verification requires an organization membership role of owner, admin, or credential_verifier; active provider consent; and a verifier other than the credential owner.
- Database triggers enforce the credential verification rules even if a future endpoint omits an application-level check.
- Verification insert updates credential status and writes an audit event transactionally.
- Audit events and credential verification records reject ordinary UPDATE and DELETE operations.
- Recruiter/admin role selection is no longer self-service: only a user whose platform account role is admin can select it.
- The onboarding UI hides recruiter/admin for standard users, and the /admin route checks platform-admin authorization.
- Facility workspace creation is restricted to the facility_client onboarding role; recruiter_admin cannot use the facility-creation endpoint as a privilege shortcut.

## Tests

- TypeScript typecheck clean.
- Three automated spec files passed, zero failed: themeMode, credentialVerificationPolicy, onboardingRolePolicy.
- Two hook-specific spec files are excluded by the default runner and were run separately earlier; both passed.
- Existing database records were checked before additive schema creation and were zero in the inspected tables. The newly created credential, consent, verification, and audit tables also contain zero rows.

## Remaining work before production

- Organization discovery, invitations, member administration, and least-privilege role management.
- Consistent organization-scoped authorization for every future facility/recruiter read and write.
- Private credential document storage, malware scanning, encryption evidence, short-lived signed URLs, and retention controls.
- Integration tests against a disposable Postgres database for database triggers and transaction rollback.
- Append-only audit access/reporting interface and broader audit coverage for all sensitive profile and organization mutations.
- Independent security/privacy review and compliance readiness work; this implementation does not establish HIPAA compliance.
- Do not publish or load real provider/credential data until the acceptance gates in the v0.2 technical baseline are met.