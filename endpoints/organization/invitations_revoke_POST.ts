import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import { canManageOrganization } from "../../helpers/organizationAccessPolicy";
import { schema } from "./invitations_revoke_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const input = schema.parse(await request.json());

    const result = await db.transaction().execute(async (trx) => {
      await trx.selectFrom("organizations").select("id")
        .where("id", "=", input.organizationId).forUpdate().executeTakeFirst();

      const membership = await trx.selectFrom("organizationMembers").select("memberRole")
        .where("organizationId", "=", input.organizationId).where("userId", "=", user.id).executeTakeFirst();
      if (!canManageOrganization(membership?.memberRole)) {
        return { status: 403 as const, message: "Organization admin access required" };
      }

      const invitation = await trx.selectFrom("organizationInvitations").select(["id", "invitedEmail", "invitedRole"])
        .where("organizationId", "=", input.organizationId).where("id", "=", input.invitationId)
        .where("status", "=", "pending").forUpdate().executeTakeFirst();
      if (!invitation) return { status: 404 as const, message: "Pending invitation not found" };
      if (invitation.invitedRole === "admin" && membership?.memberRole !== "owner") {
        return { status: 403 as const, message: "Only owners may revoke admin invitations" };
      }

      await trx.updateTable("organizationInvitations").set({ status: "revoked", updatedAt: new Date() })
        .where("organizationId", "=", input.organizationId).where("id", "=", invitation.id).where("status", "=", "pending").execute();

      await trx.insertInto("auditEvents").values({
        actorUserId: user.id, organizationId: input.organizationId, action: "organization_invitation_revoked",
        entityType: "organization_invitation", entityId: String(invitation.id),
        summary: "Organization invitation revoked", metadata: { invitedEmail: invitation.invitedEmail },
      }).execute();
      return { status: 200 as const, message: "revoked" };
    });

    if (result.status !== 200) return Response.json({ message: result.message }, { status: result.status });
    return Response.json({ revoked: true });
  } catch (error) {
    const status = error instanceof NotAuthenticatedError ? 401 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : "Unable to revoke invitation" }, { status });
  }
}

