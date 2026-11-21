import { credentialVerificationPolicy } from "./credentialVerificationPolicy";

describe("credentialVerificationPolicy", () => {
  const now = new Date("2026-11-18T12:00:00Z");
  const base = {
    credentialOwnerId: 10,
    verifierUserId: 20,
    memberRole: "credential_verifier",
    consentStatus: "granted",
    consentExpiresAt: null,
    now
  };

  it("allows owner, admin, and credential_verifier with active consent", () => {
    for (const memberRole of ["owner", "admin", "credential_verifier"]) {
      expect(credentialVerificationPolicy({ ...base, memberRole }).allowed)
        .withContext(memberRole)
        .toBeTrue();
    }
  });

  it("blocks self-verification for otherwise authorized roles", () => {
    for (const memberRole of ["owner", "admin", "credential_verifier"]) {
      expect(credentialVerificationPolicy({ ...base, memberRole, verifierUserId: 10 }).reason)
        .withContext(memberRole)
        .toBe("self_verification");
    }
  });

  it("blocks member, viewer, recruiter_admin, and missing membership", () => {
    for (const memberRole of ["member", "viewer", "recruiter_admin", null]) {
      expect(credentialVerificationPolicy({ ...base, memberRole }).reason)
        .withContext(String(memberRole))
        .toBe("verifier_role_required");
    }
  });

  it("blocks missing, pending, and revoked consent", () => {
    for (const consentStatus of [null, "pending", "revoked"]) {
      expect(credentialVerificationPolicy({ ...base, consentStatus }).reason)
        .withContext(String(consentStatus))
        .toBe("active_consent_required");
    }
  });

  it("blocks expired consent and consent expiring exactly now", () => {
    for (const consentExpiresAt of [
      new Date("2026-11-18T11:59:59Z"),
      new Date("2026-11-18T12:00:00Z")
    ]) {
      expect(credentialVerificationPolicy({ ...base, consentExpiresAt }).reason)
        .toBe("consent_expired");
    }
  });

  it("allows consent expiring in the future", () => {
    expect(credentialVerificationPolicy({
      ...base,
      consentExpiresAt: new Date("2026-11-18T12:00:01Z")
    }).allowed).toBeTrue();
  });
});
