import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { invitationAcceptancePolicy } from "../../helpers/organizationAccessPolicy";
import { schema } from "./invitations_accept_POST.schema";

function toHex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
async function sha256(value: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const input = schema.parse(await request.json());
    const hash = await sha256(input.token);
    const result = await db.transaction().execute(async trx => {
      const invitation = await trx.selectFrom("organizationInvitations").selectAll()
        .where("tokenHash", "=", hash).forUpdate().executeTakeFirst();
      if (!invitation) throw new Error("invalid_invitation");
      const policy = invitationAcceptancePolicy({ status: invitation.status, expiresAt: invitation.expiresAt, invitedEmail: invitation.invitedEmail, accountEmail: user.email, tokenMatches: true });
      if (!policy.allowed) throw new Error(policy.reason);
      const alreadyMember = await trx.selectFrom("organizationMembers").select("userId")
        .where("organizationId", "=", invitation.organizationId).where("userId", "=", user.id).executeTakeFirst();
      if (alreadyMember) throw new Error("already_member");
      await trx.insertInto("organizationMembers").values({ organizationId: invitation.organizationId, userId: user.id, memberRole: invitation.invitedRole }).execute();
      const updated = await trx.updateTable("organizationInvitations").set({ status: "accepted", acceptedAt: new Date(), acceptedByUserId: user.id, updatedAt: new Date() })
        .where("id", "=", invitation.id).where("status", "=", "pending").executeTakeFirst();
      if (!updated || Number(updated.numUpdatedRows) !== 1) throw new Error("invite_not_pending");
      await trx.insertInto("auditEvents").values({ actorUserId: user.id, organizationId: invitation.organizationId, action: "organization_invitation_accepted", entityType: "organization_invitation", entityId: String(invitation.id), summary: "Organization invitation accepted", metadata: { role: invitation.invitedRole } }).execute();
      return { organizationId: String(invitation.organizationId), role: invitation.invitedRole };
    });
    return Response.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Not authenticated" ? 401 : ["invalid_invitation", "invite_not_pending", "invite_expired", "email_mismatch", "already_member"].includes(message) ? 403 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : status === 403 ? "Invitation is invalid, expired, already used, or does not match your signed-in email" : "Unable to accept invitation" }, { status });
  }
}