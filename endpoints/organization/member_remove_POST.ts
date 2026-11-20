import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import { canRemoveMember } from "../../helpers/organizationAccessPolicy";
import { schema } from "./member_remove_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const input = schema.parse(await request.json());

    const result = await db.transaction().execute(async (trx) => {
      // Serialize removals/role changes within this organization to protect the last owner.
      await trx.selectFrom("organizations").select("id")
        .where("id", "=", input.organizationId).forUpdate().executeTakeFirst();

      const actor = await trx.selectFrom("organizationMembers").select("memberRole")
        .where("organizationId", "=", input.organizationId)
        .where("userId", "=", user.id).executeTakeFirst();
      const target = await trx.selectFrom("organizationMembers").select("memberRole")
        .where("organizationId", "=", input.organizationId)
        .where("userId", "=", input.targetUserId).executeTakeFirst();
      if (!target) return { status: 404 as const, message: "Member not found" };

      const owners = await trx.selectFrom("organizationMembers").select("userId")
        .where("organizationId", "=", input.organizationId)
        .where("memberRole", "=", "owner").execute();

      if (!canRemoveMember(actor?.memberRole, target.memberRole, input.targetUserId === user.id, owners.length)) {
        return { status: 403 as const, message: "Not authorized to remove this member or last owner" };
      }

      await trx.deleteFrom("organizationMembers")
        .where("organizationId", "=", input.organizationId)
        .where("userId", "=", input.targetUserId).execute();

      await trx.insertInto("auditEvents").values({
        actorUserId: user.id,
        organizationId: input.organizationId,
        action: "organization_member_removed",
        entityType: "organization_member",
        entityId: String(input.targetUserId),
        summary: "Organization member removed",
        metadata: { removedRole: target.memberRole },
      }).execute();

      return { status: 200 as const, message: "removed" };
    });

    if (result.status !== 200) return Response.json({ message: result.message }, { status: result.status });
    return Response.json({ removed: true });
  } catch (error) {
    const status = error instanceof NotAuthenticatedError ? 401 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : "Member removal failed" }, { status });
  }
}

