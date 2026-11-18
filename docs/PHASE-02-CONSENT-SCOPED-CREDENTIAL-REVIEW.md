# Phase 02 — Consent-scoped Credential Review Queue

**Canonical app:** Sovereign Prosurance Healthcare Network (Floot project 3b4a98de-5ce5-4d33-952c-7e6175d9ca81)
**Status:** Initial UI/API wiring complete; integration and security tests still required.
**Date:** 2026-11-18

## Delivered
- Added GET `/_api/organization/credentials?organizationId=<id>`.
- Requires authenticated session and membership in the requested organization with owner/admin/credential_verifier role.
- Returns credential metadata only where the same provider has active granted `credential_verification` consent for the requested organization.
- No general provider directory, no cross-organization credential search, and no full license numbers or document access are included.
- Connected facility workspace to fetch the consent-filtered credential list and record a `verified` or `rejected` outcome.
- UI clearly warns that this records a metadata review only; authoritative document/source verification is not yet integrated.

## Security boundary
- The API checks membership before performing the credential query.
- Query is scoped to the supplied organization and consent purpose/status.
- Expired consents are excluded.
- Verification write remains protected by the existing organization role + provider consent + no-self-verification checks.

## Verification
- Floot TypeScript typecheck: clean.
- 3 active automated test files pass; 2 hook-specific files remain excluded by default and were previously run separately.
- No integration test against disposable PostgreSQL has yet confirmed the query, trigger, and transaction behavior. The queue is a development feature, not production-approved.

## Follow-up
1. Add PostgreSQL integration tests for tenant scope, consent grant/revoke/expiry, role changes, and cross-organization denial.
2. Add an organization consent and member-management UI.
3. Implement authoritative credential source checks and secure document evidence storage before calling any credential verified.
4. Add opportunity and application schemas only after authorization tests are in place.
