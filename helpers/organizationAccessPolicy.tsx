export type OrganizationRole = "owner" | "admin" | "credential_verifier" | "member" | "viewer";
export const organizationRoles: OrganizationRole[] = ["owner", "admin", "credential_verifier", "member", "viewer"];

export function canManageOrganization(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canInviteRole(actorRole: string | null | undefined, invitedRole: string): boolean {
  if (!canManageOrganization(actorRole)) return false;
  if (invitedRole === "owner") return false;
  if (invitedRole === "admin") return actorRole === "owner";
  return invitedRole === "credential_verifier" || invitedRole === "member" || invitedRole === "viewer";
}

/** Access must be scoped to the exact tenant, never merely to a user's role. */
export function isSameOrganization(actorOrganizationId: string | number | bigint, resourceOrganizationId: string | number | bigint): boolean {
  return String(actorOrganizationId) === String(resourceOrganizationId);
}

/** Owner changes require owner authority; the last owner cannot be demoted. */
export function canChangeMemberRole(actorRole: string | null | undefined, targetRole: string, nextRole: string, ownerCount = 2): boolean {
  if (!canManageOrganization(actorRole)) return false;
  if (targetRole === "owner" && actorRole !== "owner") return false;
  if (targetRole === "owner" && nextRole !== "owner" && ownerCount <= 1) return false;
  if (nextRole === "owner") return false; // ownership transfer is a separate, explicit flow
  if (nextRole === "admin") return actorRole === "owner";
  if (actorRole === "admin" && targetRole === "admin") return false;
  return ["admin", "credential_verifier", "member", "viewer"].includes(nextRole);
}

export function canRemoveMember(actorRole: string | null | undefined, targetRole: string, isSelf: boolean, ownerCount: number): boolean {
  if (!canManageOrganization(actorRole)) return false;
  if (targetRole === "owner" && actorRole !== "owner") return false;
  if (targetRole === "owner" && ownerCount <= 1) return false;
  if (isSelf && targetRole === "owner" && ownerCount <= 1) return false;
  return true;
}

export function invitationAcceptancePolicy(input: {
  status: string;
  expiresAt: Date | string;
  invitedEmail: string;
  accountEmail: string;
  tokenMatches: boolean;
  now?: Date;
}): { allowed: boolean; reason: string } {
  if (!input.tokenMatches) return { allowed: false, reason: "invalid_token" };
  if (input.status !== "pending") return { allowed: false, reason: "invite_not_pending" };
  if (new Date(input.expiresAt).getTime() <= (input.now ?? new Date()).getTime()) return { allowed: false, reason: "invite_expired" };
  if (input.invitedEmail.trim().toLowerCase() !== input.accountEmail.trim().toLowerCase()) return { allowed: false, reason: "email_mismatch" };
  return { allowed: true, reason: "authorized" };
}

