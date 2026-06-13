"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/lib/store";

export default function RegisterPage() {
  const router = useRouter();
  const setNickname = useFunnel((s) => s.setNickname);
  const [name, setName] = useState("");

  function finish() {
    setNickname(name.trim() || "你");
    router.push("/today");
  }
  const lbtn = { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 15, borderRadius: 13, fontSize: 15, fontWeight: 500, border: "1px solid #2b3445", background: "#11151f", color: "var(--cream)", cursor: "pointer" } as const;

  return (
    <main className="phone">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", padding: "24px 30px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="eye-mini" />
          <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        </div>

        <div className="reveal" style={{ marginTop: 30, alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(127,201,154,.1)", border: "1px solid rgba(127,201,154,.28)", borderRadius: 30, padding: "7px 14px", fontSize: 12, color: "var(--green)" }}>✓ 你的盘已经准备好了</div>

        <div className="reveal" style={{ marginTop: 18, fontFamily: "var(--serif)", fontSize: 32, color: "var(--cream)", fontWeight: 500, lineHeight: 1.34, animationDelay: ".2s" }}>
          给我一个名字，<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>我把这一切，都记住。</span>
        </div>
        <p className="reveal" style={{ marginTop: 13, fontWeight: 300, fontSize: 14.5, color: "var(--cream-dim)", lineHeight: 1.7, animationDelay: ".35s" }}>这些只是开始。留住你的盘，明天我接着跟你说——还有好多没讲完。</p>

        <div className="reveal" style={{ marginTop: 26, animationDelay: ".5s" }}>
          <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>你想让我怎么叫你？</div>
          <input className="field-inp" data-testid="nickname" type="text" placeholder="小名、网名，随你" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "26px 0 16px", color: "var(--mute)", fontSize: 12 }}>
          <span style={{ flex: 1, height: 1, background: "#1f2735" }} />用什么留住你的盘<span style={{ flex: 1, height: 1, background: "#1f2735" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <button data-testid="login" onClick={finish} style={{ ...lbtn, border: "none", background: "linear-gradient(100deg,var(--gold-deep),var(--gold) 50%,var(--gold-soft) 70%)", color: "#1a1305", fontWeight: 600 }}>✉ 用邮箱继续</button>
          <button onClick={finish} style={lbtn}>G &nbsp;用 Google 继续</button>
          <button onClick={finish} style={lbtn}>用 Apple 继续</button>
        </div>

        <div style={{ marginTop: "auto", textAlign: "center", fontSize: 11.5, color: "var(--mute)" }}>🔒 你的盘只属于你 · 随时可删，绝不公开</div>
      </div>
    </main>
  );
}
