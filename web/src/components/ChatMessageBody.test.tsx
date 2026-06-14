// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ChatMessageBody } from "./ChatMessageBody";

afterEach(cleanup);

describe("ChatMessageBody", () => {
  // P0-1: user-provided text must never reach the DOM as live HTML.
  it("escapes a user message containing an XSS payload (no live element injected)", () => {
    const { container } = render(
      <ChatMessageBody from="me" text={'<img src=x onerror="window.__xss=1">hello<b>x</b>'} />,
    );
    // The payload must NOT become real DOM nodes.
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    // It must appear as inert, escaped text instead.
    expect(container.textContent).toContain("<img");
    expect(container.textContent).toContain("hello");
  });

  it("does not run an inline event handler from user text", () => {
    // deterministic check: the injected global stays unset because the markup is escaped
    (globalThis as Record<string, unknown>).__xss = undefined;
    render(<ChatMessageBody from="me" text={'<img src=x onerror="globalThis.__xss=1">'} />);
    expect((globalThis as Record<string, unknown>).__xss).toBeUndefined();
  });

  // Molly's own content (seed lines / server-generated) keeps its intended
  // light formatting — that's the design (e.g. <b>没出息</b>).
  it("preserves Molly's formatting markup", () => {
    const { container } = render(
      <ChatMessageBody from="molly" text={'先停。"<b>没出息</b>"这个词，是你自己加上去的。'} />,
    );
    expect(container.querySelector("b")).not.toBeNull();
    expect(container.querySelector("b")?.textContent).toBe("没出息");
  });

  // X-1 (audit-2 P0): Molly's text includes server LLM replies, which can be
  // prompt-injected. Dangerous markup in a MOLLY message must NOT become live DOM.
  it("strips an XSS payload from a MOLLY (LLM) message while keeping formatting", () => {
    (globalThis as Record<string, unknown>).__xss2 = undefined;
    const { container } = render(
      <ChatMessageBody from="molly" text={'看<b>这里</b><img src=x onerror="globalThis.__xss2=1">'} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect((globalThis as Record<string, unknown>).__xss2).toBeUndefined();
    expect(container.querySelector("b")?.textContent).toBe("这里"); // formatting survives
  });
});
