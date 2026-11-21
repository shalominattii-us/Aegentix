import { db } from "../../helpers/db";
import { getServerUserSession } from "../../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../../helpers/getSetServerSession";
import { credentialVerificationPolicy } from "../../helpers/credentialVerificationPolicy";
import { schema } from "./credential_verification_POST.schema";

export async function handle(request: Request) {
  try {
    const { user } = await getServerUserSession(request);
    const input = schema.parse(await request.json());

    const result = await db.transaction().execute(async trx => {
      // Serialize verification against provider consent changes for this organization.
      const organization = await trx.selectFrom("organizations").select("id")
        .where("id", "=", input.organizationId).forUpdate().executeTakeFirst();
      if (!organization) return { status: 404 as const, message: "Organization not found" };

      const membership = await trx.selectFrom("organizationMembers").select("memberRole")
        .where("organizationId", "=", organization.id).where("userId", "=", user.id).executeTakeFirst();

      const credential = await trx.selectFrom("credentials").select(["id", "userId"])
        .where("id", "=", input.credentialId).executeTakeFirst();
      if (!credential) return { status: 404 as const, message: "Credential not found" };

      const consent = await trx.selectFrom("providerFacilityConsents")
        .select(["status", "expiresAt", "revokedAt"])
        .where("providerUserId", "=", credential.userId)
        .where("organizationId", "=", organization.id)
        .where("purpose", "=", "credential_verification")
        .forUpdate()
        .executeTakeFirst();

      const policy = credentialVerificationPolicy({
        credentialOwnerId: credential.userId,
        verifierUserId: user.id,
        memberRole: membership?.memberRole ?? null,
        consentStatus: consent?.revokedAt ? "revoked" : consent?.status ?? null,
        consentExpiresAt: consent?.expiresAt ?? null
      });
      if (!policy.allowed) return { status: 403 as const, message: "Credential verification is not authorized" };

      const verification = await trx.insertInto("credentialVerifications").values({
        credentialId: credential.id,
        organizationId: organization.id,
        verifierUserId: user.id,
        outcome: input.outcome,
        evidenceReference: input.evidenceReference || null,
        notes: input.notes || null
      }).returningAll().executeTakeFirstOrThrow();

      // The verification record and its audit event commit or roll back together.
      await trx.insertInto("auditEvents").values({
        actorUserId: user.id,
        organizationId: organization.id,
        action: "credential.verification_recorded",
        entityType: "credential_verification",
        entityId: String(verification.id),
        summary: "Organization verifier recorded a credential verification outcome",
        metadata: { credentialId: String(credential.id), outcome: input.outcome }
      }).execute();

      return { status: 201 as const, verification };
    });

    if (result.status !== 201) return Response.json({ message: result.message }, { status: result.status });
    return Response.json({ verification: result.verification }, { status: 201 });
  } catch (error) {
    const status = error instanceof NotAuthenticatedError ? 401 : 400;
    return Response.json({ message: status === 401 ? "Not authenticated" : "Unable to record credential verification" }, { status });
  }
}
