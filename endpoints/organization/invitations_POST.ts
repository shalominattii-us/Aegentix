import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import { canInviteRole } from "../../helpers/organizationAccessPolicy";
import { schema } from "./invitations_POST.schema";

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(value: string) {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const input = schema.parse(await request.json());
    const email = input.email.trim().toLowerCase();
    if (email === user.email.trim().toLowerCase()) {
      return Response.json({ message: "You cannot invite your own account" }, { status: 400 });
    }

    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = toHex(tokenBytes);
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await db.transaction().execute(async (trx) => {
      // Serialize invitation creation per organization to avoid duplicate pending invites.
      const org = await trx.selectFrom("organizations").select("id")
        .where("id", "=", input.organizationId).forUpdate().executeTakeFirst();
      if (!org) return { status: 404 as const, message: "Organization not found" };

      const membership = await trx.selectFrom("organizationMembers").select("memberRole")
        .where("organizationId", "=", input.organizationId)
        .where("userId", "=", user.id).executeTakeFirst();
      if (!canInviteRole(membership?.memberRole, input.role)) {
        return { status: 403 as const, message: "You do not have permission to invite this role" };
      }

      const existingUser = await trx.selectFrom("users").select("id").where("email", "=", email).executeTakeFirst();
      if (existingUser) {
        const existingMembership = await trx.selectFrom("organizationMembers").select("userId")
          .where("organizationId", "=", input.organizationId).where("userId", "=", existingUser.id).executeTakeFirst();
        if (existingMembership) return { status: 409 as const, message: "That account is already a member of this organization" };
      }

      const pending = await trx.selectFrom("organizationInvitations").select("id")
        .where("organizationId", "=", input.organizationId).where("invitedEmail", "=", email)
        .where("status", "=", "pending").where("expiresAt", ">", new Date()).executeTakeFirst();
      if (pending) return { status: 409 as const, message: "An active invitation already exists for this email" };

      const invitation = await trx.insertInto("organizationInvitations").values({
        organizationId: input.organizationId, invitedEmail: email, invitedRole: input.role, tokenHash,
        invitedByUserId: user.id, expiresAt, status: "pending",
      }).returning(["id", "invitedEmail", "invitedRole", "status", "expiresAt", "createdAt"]).executeTakeFirstOrThrow();

      await trx.insertInto("auditEvents").values({
        actorUserId: user.id, organizationId: input.organizationId, action: "organization_invitation_created",
        entityType: "organization_invitation", entityId: String(invitation.id),
        summary: "Organization invitation created", metadata: { invitedEmail: email, invitedRole: input.role },
      }).execute();

      return { status: 201 as const, invitation: { ...invitation, id: String(invitation.id) } };
    });

    if (result.status !== 201) return Response.json({ message: result.message }, { status: result.status });
    const inviteUrl = new URL("/accept-invitation", request.url);
    inviteUrl.searchParams.set("token", token);
    return Response.json({ invitation: result.invitation, inviteUrl: inviteUrl.toString() }, { status: 201 });
  } catch (error) {
    const status = error instanceof NotAuthenticatedError ? 401 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : "Unable to create invitation" }, { status });
  }
}

