"use client";
import { useEffect, useRef, useState } from "react";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { fetchChatReply, AI_ON } from "@/lib/reading/remote";
import { TabBar } from "@/components/TabBar";
import { MollyThinking } from "@/components/MollyThinking";
import { ChatMessageBody } from "@/components/ChatMessageBody";
import { useUnderstanding } from "@/lib/understanding";
import { safeReply } from "@/lib/ai/safety";
import { routeUserMessage } from "@/lib/ai/chatFlow";
import { track } from "@/lib/track";

interface Msg { from: "me" | "molly"; text: string }

const CHAT_THINKING = ["Molly 在想…", "她把这句话，放进你的盘里看…", "在你的月亮里，找一个只对你说的答案…", "在斟酌——怎么说，才对你…"];

const FALLBACK_REPLY = "我听见了。给我一点时间，把这个跟你的盘对上——你这种问法，本身就说明你已经知道答案了。";
const OPENERS = ["我最近有点焦虑", "聊聊我的感情", "我该怎么决定一件事"];

export default function ChatPage() {
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const understand = useUnderstanding();

  // Real first-time opener derived from the user's own chart — not a fabricated
  // past conversation. No「她记得」recall until a real memory layer exists.
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  // Carry a follow-up question from a theme deep-read into the input (TH-1) so it
  // isn't dropped on navigation. Prefill (not auto-send) keeps the user in control.
  useEffect(() => {
    try {
      const ask = new URLSearchParams(window.location.search).get("ask");
      if (ask) setInput(ask);
    } catch {}
  }, []);
  const [typing, setTyping] = useState(false);

  // Auto-scroll to the newest message / typing indicator (CT-1) so a reply never
  // lands below the fold on a full thread.
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing]);

  // Boot once chart is ready: show the opener, then — if we arrived from a theme
  // deep-read with ?ask=… — auto-send that question (BUG-1: carry it into the
  // conversation, not just the input). Passing `base` keeps the opener in the
  // history sent to the model.
  const booted = useRef(false);
  useEffect(() => {
    if (!chart || booted.current) return;
    booted.current = true;
    const moon = chart.placements.find((p) => p.body === "Moon");
    const opener = `${nickname ? `${nickname}，` : ""}我在。你的月亮在${moon?.sign ?? "—"}——情绪比你表现出来的更深。今天想跟我说点什么？开心的、烦的，都行。`;
    const base: Msg[] = [{ from: "molly", text: opener }];
    setMsgs(base);
    let ask: string | null = null;
    try { ask = new URLSearchParams(window.location.search).get("ask"); } catch {}
    if (ask) send(ask, base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, nickname]);

  function send(text?: string, base?: Msg[]) {
    const t = (text ?? input).trim();
    if (!t || typing) return;
    setInput("");
    const next: Msg[] = [...(base ?? msgs), { from: "me", text: t }];
    setMsgs(next);
    setTyping(true);
    track("chat_send");

    // Crisis short-circuit runs FIRST and independent of the AI toggle — the
    // deterministic safety net must fire whether AI is on, off, or down (P0-2).
    const route = routeUserMessage(t, { aiOn: AI_ON, hasChart: !!chart });
    if (route.kind === "crisis") {
      track("chat_crisis");
      setMsgs((m) => [...m, { from: "molly", text: route.text }]);
      setTyping(false);
      return;
    }

    if (route.kind === "ai" && chart) {
      fetchChatReply(chart, next.map((m) => ({ from: m.from, text: m.text })), nickname)
        .then((reply) => setMsgs((m) => [...m, { from: "molly", text: safeReply(reply, FALLBACK_REPLY) }]))
        .catch(() => setMsgs((m) => [...m, { from: "molly", text: FALLBACK_REPLY }]))
        .finally(() => setTyping(false));
    } else {
      // AI off → scripted reply (demo)
      setTimeout(() => {
        setMsgs((m) => [...m, { from: "molly", text: FALLBACK_REPLY }]);
        setTyping(false);
      }, 500);
    }
  }

  if (!ready || !chart) return null;
  return (
    <main className="phone" data-testid="chat">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>对话</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 12px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div className="eye-mini" style={{ width: 34, height: 34 }} />
        <span style={{ fontWeight: 500, letterSpacing: ".34em", fontSize: 13, color: "var(--gold)" }}>MOLLY</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--cream-dim)" }}>懂你 <b style={{ color: "var(--gold)" }}>{understand}%</b></span>
      </div>

      <div aria-live="polite" style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "18px 18px 10px" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ maxWidth: "86%", marginBottom: 14, marginLeft: m.from === "me" ? "auto" : 0, marginRight: m.from === "me" ? 0 : "auto" }}>
            <div style={{ borderRadius: 16, padding: "12px 14px", fontSize: 14.5, lineHeight: 1.6, whiteSpace: "pre-line", ...(m.from === "molly" ? { background: "#141a28", border: "1px solid #232c3e", borderBottomLeftRadius: 5, color: "var(--cream-dim)" } : { background: "linear-gradient(135deg,#243049,#1c2438)", border: "1px solid #33405c", borderBottomRightRadius: 5, color: "#cfe0f2" }) }}><ChatMessageBody from={m.from} text={m.text} /></div>
          </div>
        ))}
        {typing && <MollyThinking variant="bubble" phrases={CHAT_THINKING} />}
        {!typing && msgs.length <= 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "6px 2px 4px" }}>
            {OPENERS.map((c) => (
              <button key={c} onClick={() => send(c)} style={{ textAlign: "left", background: "rgba(124,150,170,.08)", border: "1px solid #2b3a4e", borderRadius: 12, padding: "11px 13px", color: "#a9c4dd", fontSize: 13.5, cursor: "pointer" }}>{c}</button>
            ))}
          </div>
        )}
        <div ref={endRef} aria-hidden="true" />
      </div>

      <div style={{ position: "relative", zIndex: 3, padding: "12px 16px 14px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <input data-testid="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) send(); }} placeholder="跟 Molly 说说……" style={{ flex: 1, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 22, padding: "12px 16px", color: "var(--cream)", fontSize: 14, outline: "none" }} />
          <button type="button" onClick={() => send()} aria-label="发送" disabled={typing || !input.trim()} style={{ width: 44, height: 44, borderRadius: "50%", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", background: "linear-gradient(135deg,var(--gold),var(--gold-soft))", cursor: typing || !input.trim() ? "default" : "pointer", opacity: typing || !input.trim() ? 0.45 : 1 }}>➤</button>
        </div>
      </div>
      <TabBar active="chat" />
    </main>
  );
}
