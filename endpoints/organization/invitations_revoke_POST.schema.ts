import { z } from "zod";
export const schema = z.object({ organizationId: z.string().regex(/^[1-9]\d*$/), invitationId: z.string().regex(/^[1-9]\d*$/) });
export async function revokeOrganizationInvitation(input: z.infer<typeof schema>): Promise<void> {
  const response = await fetch("/_api/organization/invitations_revoke", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Unable to revoke invitation");
}