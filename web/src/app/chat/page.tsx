"use client";
import { useState } from "react";
import { useFunnel } from "@/lib/store";
import { useChartGuard } from "@/lib/guard";
import { fetchChatReply, AI_ON } from "@/lib/reading/remote";
import { TabBar } from "@/components/TabBar";
import { MollyThinking } from "@/components/MollyThinking";

interface Msg { from: "me" | "molly"; text: string; recall?: boolean }

const CHAT_THINKING = ["Molly 在想…", "她把这句话，放进你的盘里看…", "在你的月亮里，找一个只对你说的答案…", "在斟酌——怎么说，才对你…"];

const FALLBACK_REPLY = "我听见了。给我一点时间，把这个跟你的盘对上——你这种问法，本身就说明你已经知道答案了。";

export default function ChatPage() {
  const { chart, ready } = useChartGuard();
  const nickname = useFunnel((s) => s.nickname);

  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "me", text: "我最近又开始想前任了…是不是很没出息" },
    { from: "molly", text: '先停。"<b>没出息</b>"这个词，是你自己加上去的，不是事实。想念一个人，不是罪。' },
    { from: "molly", recall: true, text: '而且——三个月前的今天，你为他失眠，跟我说<i style="color:#9aa4b8">"我是不是这辈子都走不出来了"</i>。<br/><br/>可你现在，<b style="color:var(--gold-soft)">能笑着提起他了</b>。你不是没出息，你是早就在往前走，只是自己没发现。' },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t || typing) return;
    setInput("");
    const next: Msg[] = [...msgs, { from: "me", text: t }];
    setMsgs(next);
    setTyping(true);

    if (AI_ON && chart) {
      fetchChatReply(chart, next.map((m) => ({ from: m.from, text: m.text })), nickname)
        .then((reply) => setMsgs((m) => [...m, { from: "molly", text: reply ?? FALLBACK_REPLY }]))
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
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", gap: 10, padding: "22px 22px 12px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <div className="eye-mini" style={{ width: 34, height: 34 }} />
        <span style={{ fontWeight: 500, letterSpacing: ".34em", fontSize: 13, color: "var(--gold)" }}>MOLLY</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--cream-dim)" }}>懂你 <b style={{ color: "var(--gold)" }}>62%</b></span>
      </div>

      <div style={{ position: "relative", zIndex: 2, flex: 1, overflowY: "auto", padding: "18px 18px 10px" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ maxWidth: "86%", marginBottom: 14, marginLeft: m.from === "me" ? "auto" : 0, marginRight: m.from === "me" ? 0 : "auto" }}>
            {m.recall ? (
              <div style={{ border: "1px solid rgba(201,168,97,.4)", background: "linear-gradient(180deg,rgba(201,168,97,.08),rgba(201,168,97,.02))", borderRadius: 16, borderBottomLeftRadius: 5, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 8 }}>🕰️ 她记得</div>
                <div style={{ color: "var(--cream-dim)", fontSize: 14.5, lineHeight: 1.66 }} dangerouslySetInnerHTML={{ __html: m.text }} />
              </div>
            ) : (
              <div style={{ borderRadius: 16, padding: "12px 14px", fontSize: 14.5, lineHeight: 1.6, ...(m.from === "molly" ? { background: "#141a28", border: "1px solid #232c3e", borderBottomLeftRadius: 5, color: "var(--cream-dim)" } : { background: "linear-gradient(135deg,#243049,#1c2438)", border: "1px solid #33405c", borderBottomRightRadius: 5, color: "#cfe0f2" }) }} dangerouslySetInnerHTML={{ __html: m.text }} />
            )}
          </div>
        ))}
        {typing && <MollyThinking variant="bubble" phrases={CHAT_THINKING} />}
        {!typing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "6px 2px 4px" }}>
            {["那我还要不要再联系他？", "怎么才算真的放下？"].map((c) => (
              <button key={c} onClick={() => send(c)} style={{ textAlign: "left", background: "rgba(124,150,170,.08)", border: "1px solid #2b3a4e", borderRadius: 12, padding: "11px 13px", color: "#a9c4dd", fontSize: 13.5, cursor: "pointer" }}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "relative", zIndex: 3, padding: "12px 16px 14px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
          <input data-testid="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="跟 Molly 说说……" style={{ flex: 1, background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 22, padding: "12px 16px", color: "var(--cream)", fontSize: 14, outline: "none" }} />
          <div onClick={() => send()} style={{ width: 42, height: 42, borderRadius: "50%", flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", background: "linear-gradient(135deg,var(--gold),var(--gold-soft))", cursor: "pointer" }}>➤</div>
        </div>
      </div>
      <TabBar active="chat" />
    </main>
  );
}
