import { canManageOrganization, canInviteRole, invitationAcceptancePolicy, isSameOrganization, canChangeMemberRole, canRemoveMember } from "./organizationAccessPolicy";

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
  it("enforces strict tenant ID matching", () => {
    expect(isSameOrganization("42", 42)).toBeTrue();
    expect(isSameOrganization("42", "043")).toBeFalse();
    expect(isSameOrganization(42, 43)).toBeFalse();
    expect(isSameOrganization("0042", 42)).toBeFalse();
  });
  it("protects owner role assignment, last-owner demotion, and admin privilege boundaries", () => {
    expect(canChangeMemberRole("admin", "member", "credential_verifier")).toBeTrue();
    expect(canChangeMemberRole("admin", "member", "viewer")).toBeTrue();
    expect(canChangeMemberRole("admin", "member", "admin")).toBeFalse();
    expect(canChangeMemberRole("owner", "member", "admin")).toBeTrue();
    expect(canChangeMemberRole("admin", "owner", "member", 2)).toBeFalse();
    expect(canChangeMemberRole("owner", "owner", "member", 1)).toBeFalse();
    expect(canChangeMemberRole("owner", "owner", "member", 2)).toBeTrue();
    expect(canChangeMemberRole("owner", "member", "owner", 2)).toBeFalse();
    expect(canChangeMemberRole("admin", "admin", "member")).toBeFalse();
    expect(canChangeMemberRole("member", "viewer", "member")).toBeFalse();
  });
  it("prevents non-owner removal of owners and removal of last owner", () => {
    expect(canRemoveMember("admin", "owner", false, 2)).toBeFalse();
    expect(canRemoveMember("owner", "owner", false, 1)).toBeFalse();
    expect(canRemoveMember("owner", "owner", false, 2)).toBeTrue();
    expect(canRemoveMember("admin", "member", false, 1)).toBeTrue();
  });
});
