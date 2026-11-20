import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { canManageOrganization } from "../../helpers/organizationAccessPolicy";
import { schema } from "./invitations_revoke_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const input = schema.parse(await request.json());
    const membership = await db.selectFrom("organizationMembers").select("memberRole")
      .where("organizationId", "=", input.organizationId).where("userId", "=", user.id).executeTakeFirst();
    if (!canManageOrganization(membership?.memberRole)) return Response.json({ message: "Organization admin access required" }, { status: 403 });
    const revoked = await db.updateTable("organizationInvitations").set({ status: "revoked", updatedAt: new Date() })
      .where("organizationId", "=", input.organizationId).where("id", "=", input.invitationId).where("status", "=", "pending")
      .returning(["id", "invitedEmail"]).executeTakeFirst();
    if (!revoked) return Response.json({ message: "Pending invitation not found" }, { status: 404 });
    await db.insertInto("auditEvents").values({ actorUserId: user.id, organizationId: input.organizationId, action: "organization_invitation_revoked", entityType: "organization_invitation", entityId: String(revoked.id), summary: "Organization invitation revoked", metadata: { invitedEmail: revoked.invitedEmail } }).execute();
    return Response.json({ revoked: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "Not authenticated" ? 401 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : "Unable to revoke invitation" }, { status });
  }
}