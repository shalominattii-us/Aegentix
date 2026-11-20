export type OrganizationMember = { userId: number; role: string; joinedAt: string; displayName: string; email: string };
export type OrganizationInvitation = { id: string | number; invitedEmail: string; invitedRole: string; status: string; expiresAt: string; createdAt: string };
export async function getOrganizationMembers(organizationId: string): Promise<{ members: OrganizationMember[]; invitations: OrganizationInvitation[] }> {
  const response = await fetch(`/_api/organization/members?organizationId=${encodeURIComponent(organizationId)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Unable to load members");
  return data;
}