import { describe, it, expect } from "vitest";
import { routeUserMessage } from "./chatFlow";
import { CRISIS_RESPONSE } from "./safety";

describe("routeUserMessage", () => {
  // P0-2: the crisis short-circuit must NOT depend on the AI toggle. It is a
  // deterministic safety net — it has to fire whether AI is on, off, or down.
  it("routes an explicit self-harm message to the crisis response even when AI is ON", () => {
    const r = routeUserMessage("我不想活了", { aiOn: true, hasChart: true });
    expect(r).toEqual({ kind: "crisis", text: CRISIS_RESPONSE });
  });

  it("routes an explicit self-harm message to the crisis response when AI is OFF (the bug)", () => {
    const r = routeUserMessage("我不想活了", { aiOn: false, hasChart: true });
    expect(r).toEqual({ kind: "crisis", text: CRISIS_RESPONSE });
  });

  it("detects English ideation regardless of AI state", () => {
    expect(routeUserMessage("I want to kill myself", { aiOn: false, hasChart: false }).kind).toBe("crisis");
  });

  it("strips HTML before crisis detection so wrapped signals still fire", () => {
    expect(routeUserMessage("<b>我想结束自己的生命</b>", { aiOn: true, hasChart: true }).kind).toBe("crisis");
  });

  it("does NOT flag casual phrases (recall-conservative)", () => {
    expect(routeUserMessage("笑死我了哈哈", { aiOn: true, hasChart: true }).kind).toBe("ai");
  });

  it("routes a normal message to AI when AI is on and a chart exists", () => {
    expect(routeUserMessage("今天好累", { aiOn: true, hasChart: true }).kind).toBe("ai");
  });

  it("routes a normal message to the scripted reply when AI is off", () => {
    expect(routeUserMessage("今天好累", { aiOn: false, hasChart: true }).kind).toBe("scripted");
  });

  it("routes a normal message to the scripted reply when there is no chart", () => {
    expect(routeUserMessage("今天好累", { aiOn: true, hasChart: false }).kind).toBe("scripted");
  });
});
