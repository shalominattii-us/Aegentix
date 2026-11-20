import { z } from "zod";
export const schema = z.object({
  organizationId: z.string().regex(/^[1-9]\d*$/),
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "credential_verifier", "member", "viewer"]),
});
export type Input = z.infer<typeof schema>;
export async function createOrganizationInvitation(input: Input): Promise<{ invitation: Record<string, unknown>; inviteUrl: string }> {
  const response = await fetch("/_api/organization/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Unable to create invitation");
  return data;
}