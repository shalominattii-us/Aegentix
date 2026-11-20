import { canManageOrganization, canInviteRole, invitationAcceptancePolicy } from "./organizationAccessPolicy";

describe("organizationAccessPolicy", () => {
  it("limits membership administration to owner and admin", () => {
    expect(canManageOrganization("owner")).toBeTrue();
    expect(canManageOrganization("admin")).toBeTrue();
    expect(canManageOrganization("credential_verifier")).toBeFalse();
    expect(canManageOrganization("member")).toBeFalse();
    expect(canManageOrganization("viewer")).toBeFalse();
  });
  it("only allows owners to invite admins and disallows owner invitations", () => {
    expect(canInviteRole("owner", "admin")).toBeTrue();
    expect(canInviteRole("admin", "admin")).toBeFalse();
    expect(canInviteRole("owner", "owner")).toBeFalse();
    expect(canInviteRole("admin", "member")).toBeTrue();
    expect(canInviteRole("member", "viewer")).toBeFalse();
  });
  const base = { status: "pending", expiresAt: "2026-11-25T12:00:00Z", invitedEmail: "Person@example.com", accountEmail: "person@EXAMPLE.com", tokenMatches: true, now: new Date("2026-11-19T12:00:00Z") };
  it("accepts a matching authenticated email with valid pending token", () => {
    expect(invitationAcceptancePolicy(base).allowed).toBeTrue();
  });
  it("rejects email mismatch, expired, non-pending, or invalid tokens", () => {
    expect(invitationAcceptancePolicy({ ...base, accountEmail: "other@example.com" }).reason).toBe("email_mismatch");
    expect(invitationAcceptancePolicy({ ...base, expiresAt: "2026-11-19T11:00:00Z" }).reason).toBe("invite_expired");
    expect(invitationAcceptancePolicy({ ...base, status: "revoked" }).reason).toBe("invite_not_pending");
    expect(invitationAcceptancePolicy({ ...base, tokenMatches: false }).reason).toBe("invalid_token");
  });
});