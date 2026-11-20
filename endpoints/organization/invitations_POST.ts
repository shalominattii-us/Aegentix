import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { canInviteRole } from "../../helpers/organizationAccessPolicy";
import { schema } from "./invitations_POST.schema";

function toHex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const input = schema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    const membership = await db.selectFrom("organizationMembers").select("memberRole")
      .where("organizationId", "=", input.organizationId).where("userId", "=", user.id).executeTakeFirst();
    if (!canInviteRole(membership?.memberRole, input.role)) return Response.json({ message: "You do not have permission to invite this role" }, { status: 403 });
    if (email === user.email.trim().toLowerCase()) return Response.json({ message: "You cannot invite your own account" }, { status: 400 });
    const existingUser = await db.selectFrom("users").select("id").where("email", "=", email).executeTakeFirst();
    if (existingUser) {
      const existingMembership = await db.selectFrom("organizationMembers").select("userId")
        .where("organizationId", "=", input.organizationId).where("userId", "=", existingUser.id).executeTakeFirst();
      if (existingMembership) return Response.json({ message: "That account is already a member of this organization" }, { status: 409 });
    }
    const pending = await db.selectFrom("organizationInvitations").select("id")
      .where("organizationId", "=", input.organizationId).where("invitedEmail", "=", email)
      .where("status", "=", "pending").where("expiresAt", ">", new Date()).executeTakeFirst();
    if (pending) return Response.json({ message: "An active invitation already exists for this email" }, { status: 409 });
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = toHex(tokenBytes);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await db.insertInto("organizationInvitations").values({
      organizationId: input.organizationId, invitedEmail: email, invitedRole: input.role, tokenHash: await sha256(token),
      invitedByUserId: user.id, expiresAt, status: "pending"
    }).returning(["id", "invitedEmail", "invitedRole", "status", "expiresAt", "createdAt"]).executeTakeFirstOrThrow();
    await db.insertInto("auditEvents").values({ actorUserId: user.id, organizationId: input.organizationId, action: "organization_invitation_created", entityType: "organization_invitation", entityId: String(invitation.id), summary: "Organization invitation created", metadata: { invitedEmail: email, invitedRole: input.role } }).execute();
    const inviteUrl = new URL("/accept-invitation", request.url);
    inviteUrl.searchParams.set("token", token);
    return Response.json({ invitation, inviteUrl: inviteUrl.toString() }, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && error.message === "Not authenticated" ? 401 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : "Unable to create invitation" }, { status });
  }
}