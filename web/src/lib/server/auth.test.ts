import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createUser,
  authenticate,
  getUser,
  findUserIdByEmail,
  saveProfile,
  deleteUser,
  createSession,
  getSessionUserId,
  revokeSession,
  EmailTakenError,
} from "./auth";

// Unique email per test → isolated against the shared in-memory KV singleton.
let n = 0;
const email = () => `u${n++}-${Date.now()}@test.dev`;

describe("password hashing", () => {
  it("hashes, verifies correct, rejects wrong, uses random salt", () => {
    const h = hashPassword("correct-horse");
    expect(h).toContain(":");
    expect(verifyPassword("correct-horse", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
    expect(hashPassword("x")).not.toBe(hashPassword("x"));
  });
  it("never stores plaintext", () => {
    expect(hashPassword("hunter2")).not.toContain("hunter2");
  });
  it("malformed stored hash → false, no throw", () => {
    expect(verifyPassword("x", "garbage")).toBe(false);
  });
});

describe("users", () => {
  it("creates a user and looks it up by email", async () => {
    const e = email();
    const u = await createUser(e, "password1");
    expect(u.email).toBe(e.toLowerCase());
    expect(await findUserIdByEmail(e)).toBe(u.id);
    expect((await getUser(u.id))?.email).toBe(e.toLowerCase());
  });

  it("normalizes email case", async () => {
    const e = `MixedCase-${Date.now()}@Test.Dev`;
    const u = await createUser(e, "password1");
    expect(u.email).toBe(e.toLowerCase());
    expect(await findUserIdByEmail(e.toUpperCase())).toBe(u.id);
  });

  it("rejects duplicate email", async () => {
    const e = email();
    await createUser(e, "password1");
    await expect(createUser(e, "password2")).rejects.toBeInstanceOf(EmailTakenError);
  });

  it("treats NFC/NFD Unicode homograph emails as the same account (L5)", async () => {
    const base = `cafe${String.fromCharCode(0x301)}-${Date.now()}@test.dev`; // e + combining acute U+0301
    const nfc = base.normalize("NFC"); // precomposed
    const nfd = base.normalize("NFD"); // decomposed
    expect(nfc).not.toBe(nfd); // different byte sequences...
    await createUser(nfc, "password1");
    await expect(createUser(nfd, "password2")).rejects.toBeInstanceOf(EmailTakenError); // ...but one account
  });

  it("authenticate: correct password → user, wrong → null, unknown email → null", async () => {
    const e = email();
    const u = await createUser(e, "password1");
    expect((await authenticate(e, "password1"))?.id).toBe(u.id);
    expect(await authenticate(e, "nope")).toBeNull();
    expect(await authenticate("nobody@test.dev", "password1")).toBeNull();
  });

  it("saveProfile persists the funnel snapshot", async () => {
    const u = await createUser(email(), "password1");
    await saveProfile(u.id, { nickname: "星儿", joinedAt: 123, chart: { ascSign: "天蝎" } });
    const got = await getUser(u.id);
    expect(got?.profile?.nickname).toBe("星儿");
    expect((got?.profile?.chart as { ascSign: string }).ascSign).toBe("天蝎");
  });

  it("deleteUser removes user + email index (email reusable)", async () => {
    const e = email();
    const u = await createUser(e, "password1");
    await deleteUser(u.id);
    expect(await getUser(u.id)).toBeNull();
    expect(await findUserIdByEmail(e)).toBeNull();
    await expect(createUser(e, "password1")).resolves.toBeTruthy(); // reusable
  });
});

describe("sessions", () => {
  it("create → resolves to userId; revoke → null", async () => {
    const u = await createUser(email(), "password1");
    const t = await createSession(u.id);
    expect(await getSessionUserId(t)).toBe(u.id);
    await revokeSession(t);
    expect(await getSessionUserId(t)).toBeNull();
  });

  it("undefined/unknown token → null", async () => {
    expect(await getSessionUserId(undefined)).toBeNull();
    expect(await getSessionUserId("nonexistent")).toBeNull();
  });
});
