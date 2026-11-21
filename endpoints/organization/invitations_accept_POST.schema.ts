import { z } from "zod";
export const schema = z.object({ token: z.string().min(32).max(128) });
export async function acceptOrganizationInvitation(token: string): Promise<{ organizationId: string; role: string }> {
  const response = await fetch("/_api/organization/invitations_accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Unable to accept invitation");
  return data;
}