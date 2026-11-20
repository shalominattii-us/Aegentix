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