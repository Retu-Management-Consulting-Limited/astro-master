import { describe, it, expect } from "vitest";
import { createSemaphore } from "./semaphore";

const work = (sem: ReturnType<typeof createSemaphore>, state: { active: number; peak: number }) =>
  sem.run(async () => {
    state.active++;
    state.peak = Math.max(state.peak, state.active);
    await new Promise((r) => setTimeout(r, 10));
    state.active--;
    return "done";
  });

describe("createSemaphore", () => {
  it("never lets more than `max` run at once (max=1 serializes)", async () => {
    const sem = createSemaphore(1);
    const s = { active: 0, peak: 0 };
    await Promise.all([work(sem, s), work(sem, s), work(sem, s)]);
    expect(s.peak).toBe(1);
    expect(s.active).toBe(0);
  });

  it("allows up to `max` concurrent (max=2)", async () => {
    const sem = createSemaphore(2);
    const s = { active: 0, peak: 0 };
    await Promise.all([work(sem, s), work(sem, s), work(sem, s), work(sem, s)]);
    expect(s.peak).toBe(2);
  });

  it("returns the wrapped task's result and releases on throw", async () => {
    const sem = createSemaphore(1);
    expect(await sem.run(async () => 42)).toBe(42);
    await expect(sem.run(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    // slot was released despite the throw → next task still runs
    expect(await sem.run(async () => "ok")).toBe("ok");
  });
});
