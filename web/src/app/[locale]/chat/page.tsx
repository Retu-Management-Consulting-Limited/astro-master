"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { fetchChatReply, fetchFollowups, AI_ON } from "@/lib/reading/remote";
import { TabBar } from "@/components/TabBar";
import { MollyThinking } from "@/components/MollyThinking";
import { ChatMessageBody } from "@/components/ChatMessageBody";
import { useUnderstanding } from "@/lib/understanding";
import { safeReply } from "@/lib/ai/safety";
import { routeUserMessage } from "@/lib/ai/chatFlow";
import { trustTier, DIR_LABEL, type Followup, type FollowupDir } from "@/lib/ai/followups";
import { collectMoodHistory } from "@/lib/moodHistory";
import { moodTrend, lowStreak } from "@/lib/model/userModel";
import { chatOpeners } from "@/lib/reading/openers";
import { track } from "@/lib/track";

interface Msg { from: "me" | "molly"; text: string }

// direction → chip accent (matches the v3 mockup: deep=往里走, meaning=此刻, act=能动)
const DIR_STYLE: Record<FollowupDir, { bd: string; bg: string; c: string }> = {
  deep: { bd: "rgba(230,158,200,.34)", bg: "rgba(230,158,200,.05)", c: "#f1c2dd" },
  meaning: { bd: "rgba(143,194,232,.32)", bg: "rgba(143,194,232,.05)", c: "#bfe0f5" },
  act: { bd: "rgba(127,201,154,.34)", bg: "rgba(127,201,154,.05)", c: "#a8e0bf" },
};

export default function ChatPage() {
  const t = useTranslations("chat");
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);
  const firstRead = useFunnel((s) => s.firstRead);
  const understand = useUnderstanding();

  const CHAT_THINKING = [t("thinking.phrase1"), t("thinking.phrase2"), t("thinking.phrase3"), t("thinking.phrase4")];
  const FALLBACK_REPLY = t("fallbackReply");

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
  // #4 follow-up questions under the latest reply (so the user is never left in
  // silence at an open moment). A token guards against a stale fetch landing after
  // the user has already sent the next message.
  const [followups, setFollowups] = useState<Followup[]>([]);
  const fuToken = useRef(0);

  // Auto-scroll to the newest message / typing indicator (CT-1) so a reply never
  // lands below the fold on a full thread.
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing, followups]);

  // Load trust-graded follow-ups for the conversation as it now stands (incl. the
  // reply). Fierceness scales with understanding + turns (R18 ①). Token-guarded.
  function loadFollowups(list: Msg[], token: number) {
    if (!chart) return;
    const turns = list.filter((m) => m.from === "me").length;
    const tier = trustTier(understand, turns);
    fetchFollowups(chart, list.map((m) => ({ from: m.from, text: m.text })), tier)
      .then((f) => { if (fuToken.current === token) setFollowups(f); })
      .catch(() => {});
  }

  // Boot once chart is ready: show the opener, then — if we arrived from a theme
  // deep-read with ?ask=… — auto-send that question (BUG-1: carry it into the
  // conversation, not just the input). Passing `base` keeps the opener in the
  // history sent to the model.
  const booted = useRef(false);
  useEffect(() => {
    if (!chart || booted.current) return;
    booted.current = true;
    const moon = chart.placements.find((p) => p.body === "Moon");
    // keystone 回喂：Molly opens by REMEMBERING your recent mood pattern (your own
    // check-ins). Warm + ally + lands on care (R18 ②⑥), never pressure.
    let moodDays: ReturnType<typeof collectMoodHistory> = [];
    try { moodDays = collectMoodHistory(localStorage); } catch {}
    const nick = nickname ? t("nickPrefix", { name: nickname }) : "";
    const low = lowStreak(moodDays);
    const trend = moodTrend(moodDays);
    const opener =
      low >= 2
        ? t("openerLowStreak", { nick })
        : trend === "up"
        ? t("openerUp", { nick })
        : t("openerDefault", { nick, moon: moon?.sign ?? "—" });
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
    setFollowups([]); // clear stale chips; a newer turn invalidates any in-flight fetch
    const tok = ++fuToken.current;
    const next: Msg[] = [...(base ?? msgs), { from: "me", text: t }];
    setMsgs(next);
    setTyping(true);
    track("chat_send");

    // Crisis short-circuit runs FIRST and independent of the AI toggle — the
    // deterministic safety net must fire whether AI is on, off, or down (P0-2).
    // No follow-up chips on a crisis turn — never nudge "ask me more" there.
    const route = routeUserMessage(t, { aiOn: AI_ON, hasChart: !!chart });
    if (route.kind === "crisis") {
      track("chat_crisis");
      setMsgs((m) => [...m, { from: "molly", text: route.text }]);
      setTyping(false);
      return;
    }

    if (route.kind === "ai" && chart) {
      fetchChatReply(chart, next.map((m) => ({ from: m.from, text: m.text })), nickname)
        .then((reply) => {
          const replyText = safeReply(reply, FALLBACK_REPLY);
          setMsgs((m) => [...m, { from: "molly", text: replyText }]);
          loadFollowups([...next, { from: "molly", text: replyText }], tok);
        })
        .catch(() => {
          setMsgs((m) => [...m, { from: "molly", text: FALLBACK_REPLY }]);
          loadFollowups([...next, { from: "molly", text: FALLBACK_REPLY }], tok);
        })
        .finally(() => setTyping(false));
    } else {
      // AI off → scripted reply (demo); still offer deterministic follow-ups.
      setTimeout(() => {
        setMsgs((m) => [...m, { from: "molly", text: FALLBACK_REPLY }]);
        setTyping(false);
        loadFollowups([...next, { from: "molly", text: FALLBACK_REPLY }], tok);
      }, 500);
    }
  }

  if (!ready || !chart) return null;
  return (
    <main className="phone" data-testid="chat">
      <h1 style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{t("srTitle")}</h1>
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 12px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div className="eye-mini" style={{ width: 34, height: 34 }} />
        <span style={{ fontWeight: 500, letterSpacing: ".34em", fontSize: 13, color: "var(--gold)" }}>MOLLY</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--cream-dim)" }}>{t("understand")} <b style={{ color: "var(--gold)" }}>{understand}%</b></span>
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
            {chatOpeners(chart, firstRead?.chips).map((c) => (
              <button key={c} data-testid="opener" onClick={() => send(c)} style={{ textAlign: "left", background: "rgba(124,150,170,.08)", border: "1px solid #2b3a4e", borderRadius: 12, padding: "11px 13px", color: "#a9c4dd", fontSize: 13.5, cursor: "pointer" }}>{c}</button>
            ))}
          </div>
        )}
        {/* #4 follow-ups under the latest reply — three directions, never silence */}
        {!typing && followups.length > 0 && msgs.length > 1 && msgs[msgs.length - 1].from === "molly" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "2px 2px 4px" }}>
            <div style={{ fontSize: 11, color: "var(--mute)", margin: "2px 2px" }}>{t("followupPrompt")}</div>
            {followups.map((f) => {
              const s = DIR_STYLE[f.dir];
              return (
                <button key={f.dir} data-testid="followup" onClick={() => send(f.text)} style={{ textAlign: "left", display: "flex", gap: 9, alignItems: "flex-start", background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 12, padding: "10px 12px", color: s.c, fontSize: 13, lineHeight: 1.4, cursor: "pointer" }}>
                  <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.85, marginTop: 1, flex: "0 0 auto" }}>{DIR_LABEL[f.dir]}</span>{f.text}
                </button>
              );
            })}
          </div>
        )}
        <div ref={endRef} aria-hidden="true" />
      </div>

      <div style={{ position: "relative", zIndex: 3, padding: "12px 16px 14px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <input data-testid="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) send(); }} placeholder={t("inputPlaceholder")} style={{ flex: 1, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 22, padding: "12px 16px", color: "var(--cream)", fontSize: 14, outline: "none" }} />
          <button type="button" onClick={() => send()} aria-label={t("sendAria")} disabled={typing || !input.trim()} style={{ width: 44, height: 44, borderRadius: "50%", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", background: "linear-gradient(135deg,var(--gold),var(--gold-soft))", cursor: typing || !input.trim() ? "default" : "pointer", opacity: typing || !input.trim() ? 0.45 : 1 }}>➤</button>
        </div>
      </div>
      <TabBar active="chat" />
    </main>
  );
}
