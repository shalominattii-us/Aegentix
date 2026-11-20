import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { canManageOrganization } from "../../helpers/organizationAccessPolicy";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const organizationId = new URL(request.url).searchParams.get("organizationId");
    if (!organizationId || !/^[1-9]\d*$/.test(organizationId)) return Response.json({ message: "Valid organizationId required" }, { status: 400 });
    const membership = await db.selectFrom("organizationMembers").select("memberRole")
      .where("organizationId", "=", organizationId).where("userId", "=", user.id).executeTakeFirst();
    if (!canManageOrganization(membership?.memberRole)) return Response.json({ message: "Organization admin access required" }, { status: 403 });
    const members = await db.selectFrom("organizationMembers").innerJoin("users", "users.id", "organizationMembers.userId")
      .select(["organizationMembers.userId as userId", "organizationMembers.memberRole as role", "organizationMembers.createdAt as joinedAt", "users.displayName", "users.email"])
      .where("organizationMembers.organizationId", "=", organizationId).orderBy("organizationMembers.createdAt", "asc").execute();
    const invitations = await db.selectFrom("organizationInvitations").select(["id", "invitedEmail", "invitedRole", "status", "expiresAt", "createdAt"])
      .where("organizationId", "=", organizationId).where("status", "=", "pending").where("expiresAt", ">", new Date()).orderBy("createdAt", "desc").execute();
    return Response.json({ members, invitations });
  } catch (error) {
    const status = error instanceof Error && error.message === "Not authenticated" ? 401 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : "Unable to load organization membership" }, { status });
  }
}