import { db } from "../../helpers/db";
import { requireOnboardingRole } from "../../helpers/requireOnboardingRole";
import { schema } from "./consent_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await requireOnboardingRole(request, ["provider"]);
    const input = schema.parse(await request.json());
    const now = new Date();
    const status = input.action === "grant" ? "granted" : "revoked";

    const result = await db.transaction().execute(async trx => {
      // Consent changes and verification writes use the same tenant-first lock order.
      const organization = await trx.selectFrom("organizations").select("id")
        .where("id", "=", input.organizationId).forUpdate().executeTakeFirst();
      if (!organization) return { status: 404 as const };

      await trx.insertInto("providerFacilityConsents").values({
        providerUserId: user.id,
        organizationId: organization.id,
        purpose: input.purpose,
        status,
        grantedAt: now,
        revokedAt: input.action === "revoke" ? now : null,
        updatedAt: now
      }).onConflict(oc => oc.columns(["providerUserId", "organizationId", "purpose"]).doUpdateSet({
        status,
        grantedAt: input.action === "grant" ? now : undefined,
        revokedAt: input.action === "revoke" ? now : null,
        updatedAt: now
      })).execute();

      await trx.insertInto("auditEvents").values({
        actorUserId: user.id,
        organizationId: organization.id,
        action: "consent." + input.action,
        entityType: "provider_consent",
        entityId: user.id + ":" + input.purpose,
        summary: "Provider " + (input.action === "grant" ? "granted" : "revoked") + " " + input.purpose + " consent",
        metadata: { purpose: input.purpose, status }
      }).execute();

      return { status: 200 as const };
    });

    if (result.status === 404) return Response.json({ message: "Organization not found" }, { status: 404 });
    return Response.json({ status });
  } catch (error) {
    const status = error instanceof Error && error.message === "Not authenticated" ? 401 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : "Unable to update consent" }, { status });
  }
}
