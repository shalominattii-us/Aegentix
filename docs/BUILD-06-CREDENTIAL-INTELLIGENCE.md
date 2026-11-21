# Build 06 — Credential Intelligence

**Canonical implementation:** Floot project `3b4a98de-5ce5-4d33-952c-7e6175d9ca81` (Sovereign Prosurance Healthcare Network).  
**Status:** Initial schema, provider UI, consent flow, and verifier authorization foundation implemented; not production-ready.  
**Date:** 2026-11-18

## Implemented

- Postgres `credentials` table tied to provider user identity.
- Credential metadata includes type, display name, issuing authority, jurisdiction, issue/expiry dates, and only an optional last-four identifier fragment.
- Full credential numbers are not requested or stored by this initial flow.
- `provider_facility_consents` stores provider-controlled consent by organization and purpose (`credential_verification`, `profile_sharing`, `opportunity_matching`), with grant/revoke timestamps and optional expiry.
- `credential_verifications` stores organization, verifier, outcome, evidence reference, notes, and timestamp.
- `audit_events` captures credential creation, consent changes, and verification events.
- Database trigger blocks self-verification, requires an authorized organization member role (`owner`, `admin`, `credential_verifier`), and requires active provider consent before a verification can be inserted.
- Verification insert updates the credential status and writes an audit event in the same database transaction.
- Audit events and verification records are protected by append-only database triggers against update/delete.
- Provider API endpoints expose own credential metadata, create pending credential metadata, and grant/revoke purpose-specific consent.
- Organization verification endpoint checks membership, role, consent, expiry, and self-verification before writing a verification.
- Provider workspace includes credential metadata form, pending-state list, and grant/revoke controls for credential-verification consent.
- Facility workspace displays its organization ID so it can be provided to a provider for explicit consent.

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/_api/provider/credentials` | List the signed-in provider's credential metadata and verification summaries |
| POST | `/_api/provider/credentials` | Add credential metadata as pending |
| POST | `/_api/provider/consent` | Grant or revoke organization/purpose consent |
| POST | `/_api/organization/credential_verification` | Record an authorized verification outcome |

## Security properties

- Provider credential listing is scoped to the authenticated provider user.
- Credential records are created only by the provider's own authenticated profile flow.
- The UI and API do not accept full credential numbers or public document URLs.
- The database trigger is the final enforcement point for verifier role, no self-verification, and active consent.
- Verification audit event creation and credential status update are transactionally tied to the verification insert.
- Audit and verification history cannot be changed or deleted through ordinary database DML; append-only triggers reject update/delete.

## Not yet complete

- Private document upload/storage, malware scanning, encryption-at-rest configuration evidence, short-lived signed download URLs, and retention/deletion controls.
- Organization discovery and invitation flow; the provider currently needs the organization ID supplied by the facility.
- Authoritative source integrations for license and certification checks.
- Verifier evidence review interface, revocation workflow, dispute handling, and credential status history UI.
- Full tenant-isolation tests across all recruiter/facility workflows.
- Independent security and privacy review; no HIPAA compliance claim is made.

## Verification performed

- Floot TypeScript typecheck: clean after implementation.
- Automated tests: 2 spec files passed, 0 failed, including policy tests for self-verification, unauthorized roles, revoked consent, and expired consent.
- Database was inspected before schema changes; users, profiles, organizations, memberships, facilities, credentials, credential verifications, provider consents, and audit events contained zero rows at the time of inspection.
- App remains unpublished. No real healthcare data has been loaded.

## Next work

1. Add organization discovery and invitation/member administration.
2. Provision private document storage and implement safe upload/review/download.
3. Add integration tests against a disposable database for the SQL triggers and transaction behavior.
4. Implement verifier evidence review and full credential history UI.
5. Complete organization-scoped authorization tests for all future recruiter/facility workflows before adding provider search or opportunity matching.
