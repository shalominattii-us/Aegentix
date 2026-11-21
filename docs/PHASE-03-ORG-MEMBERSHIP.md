# Phase 03 — Organization Membership and Invitations

**Canonical app:** Sovereign Prosurance Healthcare Network (Floot project `3b4a98de-5ce5-4d33-952c-7e6175d9ca81`)
**GitHub sync:** commit `56afc3eb1f431e67e50d2f3f4fb82d02656b75ef`
**Checkpoint:** `a0561632-33f2-4ec6-8bf1-2df9a0e5c5f7`
**Date:** 2026-11-19

## Delivered

- Owner/admin-only member list and invitation management endpoint.
- Organization role rules: owner/admin manage membership; only owner can invite admins; no owner invitations.
- 32-byte random invite tokens; SHA-256 hash stored; raw token returned only in invite URL.
- Seven-day expiry; acceptance requires a signed-in user and case-insensitive exact email match.
- Acceptance is transaction-scoped; invitation is single-use and updates membership.
- Revoke endpoint for pending invitations; audit events for creation, acceptance, revocation.
- Facility UI for member list, invitation creation/link copy, pending invitation display/revocation.
- Invitation acceptance page.
- Generated database type includes `organization_invitations`.

## Migration

```sql
CREATE TABLE IF NOT EXISTS organization_invitations (
  id bigserial PRIMARY KEY,
  organization_id bigint NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_role text NOT NULL CHECK (invited_role IN ('admin','credential_verifier','member','viewer')),
  token_hash text NOT NULL UNIQUE,
  invited_by_user_id integer NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by_user_id integer REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organization_invitations_org_status_idx ON organization_invitations (organization_id, status, expires_at);
CREATE INDEX IF NOT EXISTS organization_invitations_email_idx ON organization_invitations (lower(invited_email), status);
```

## Validation

- Floot TypeScript typecheck: clean.
- Four active automated spec files passed.
- No disposable-Postgres endpoint integration suite or comprehensive cross-tenant tests yet.
- Invite links are shared manually; outbound email delivery is not configured.
- UI currently exposes membership management from the facility workspace created during setup; persisted workspace discovery/re-entry is still a follow-up.
- Preview only; no production or HIPAA compliance claim.
