import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import { canChangeMemberRole } from "../../helpers/organizationAccessPolicy";
import { schema } from "./member_role_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const input = schema.parse(await request.json());

    const result = await db.transaction().execute(async (trx) => {
      // Serialize membership lifecycle changes in this tenant.
      await trx.selectFrom("organizations").select("id")
        .where("id", "=", input.organizationId).forUpdate().executeTakeFirst();

      const actor = await trx.selectFrom("organizationMembers").select("memberRole")
        .where("organizationId", "=", input.organizationId)
        .where("userId", "=", user.id).executeTakeFirst();
      const target = await trx.selectFrom("organizationMembers").select("memberRole")
        .where("organizationId", "=", input.organizationId)
        .where("userId", "=", input.targetUserId).executeTakeFirst();
      const owners = await trx.selectFrom("organizationMembers").select("userId")
        .where("organizationId", "=", input.organizationId)
        .where("memberRole", "=", "owner").execute();

      if (!target || !canChangeMemberRole(actor?.memberRole, target.memberRole, input.role, owners.length)) {
        return { status: 403 as const, message: "Not authorized to change this member role" };
      }

      const changed = await trx.updateTable("organizationMembers").set({ memberRole: input.role })
        .where("organizationId", "=", input.organizationId)
        .where("userId", "=", input.targetUserId).returning("userId").executeTakeFirst();
      if (!changed) return { status: 404 as const, message: "Member not found" };

      await trx.insertInto("auditEvents").values({
        actorUserId: user.id,
        organizationId: input.organizationId,
        action: "organization_member_role_changed",
        entityType: "organization_member",
        entityId: String(input.targetUserId),
        summary: "Organization member role changed",
        metadata: { previousRole: target.memberRole, newRole: input.role },
      }).execute();

      return { status: 200 as const, message: "updated" };
    });

    if (result.status !== 200) return Response.json({ message: result.message }, { status: result.status });
    return Response.json({ updated: true });
  } catch (error) {
    const status = error instanceof NotAuthenticatedError ? 401 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : "Role update failed" }, { status });
  }
}

