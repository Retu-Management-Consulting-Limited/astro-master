import { describe, it, expect } from "vitest";
import { createInvite, getInvite, setPartner } from "./synastry-invite";

describe("synastry invite", () => {
  it("creates an invite with no partner yet", async () => {
    const token = await createInvite("阿星");
    expect(token).toMatch(/^[0-9a-f]{24}$/);
    const inv = await getInvite(token);
    expect(inv?.inviterName).toBe("阿星");
    expect(inv?.partner).toBeNull();
  });

  it("partner submission is readable back by token", async () => {
    const token = await createInvite();
    const r = await setPartner(token, { name: "小鱼", chart: { ascSign: "双鱼" }, birthForm: { city: "上海" } });
    expect(r).toBe("ok");
    const inv = await getInvite(token);
    expect(inv?.partner?.name).toBe("小鱼");
    expect((inv?.partner?.chart as { ascSign: string }).ascSign).toBe("双鱼");
  });

  it("setPartner on an unknown token → 'unknown'", async () => {
    expect(await setPartner("deadbeef", { chart: {} })).toBe("unknown");
  });

  // P1-2 / R10: the token is the capability and links get forwarded — a second
  // submission must NOT overwrite the first partner's chart.
  it("rejects a replay and preserves the first partner (consume-once)", async () => {
    const token = await createInvite();
    expect(await setPartner(token, { name: "小鱼", chart: { ascSign: "双鱼" } })).toBe("ok");
    expect(await setPartner(token, { name: "入侵者", chart: { ascSign: "白羊" } })).toBe("already");
    const inv = await getInvite(token);
    expect(inv?.partner?.name).toBe("小鱼");
    expect((inv?.partner?.chart as { ascSign: string }).ascSign).toBe("双鱼");
  });

  it("getInvite on unknown/empty token → null", async () => {
    expect(await getInvite("nope")).toBeNull();
    expect(await getInvite("")).toBeNull();
  });

  it("tokens are unique", async () => {
    expect(await createInvite()).not.toBe(await createInvite());
  });
});
