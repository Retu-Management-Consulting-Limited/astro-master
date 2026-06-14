"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel, snapshotOf } from "@/lib/store";
import { identify, track } from "@/lib/track";
import { apiRegister, apiLogin } from "@/lib/auth-client";

type Mode = "signup" | "login";

export default function RegisterPage() {
  const router = useRouter();
  const setNickname = useFunnel((s) => s.setNickname);
  const loadServer = useFunnel((s) => s.loadServer);
  const chart = useFunnel((s) => s.chart);

  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Guest / local-only path — keeps activation friction-free. (E2E entry point.)
  function continueLocal() {
    const nm = name.trim() || "你";
    setNickname(nm);
    identify({ name: nm, nickname: nm, ascSign: chart?.ascSign });
    track("activated");
    router.push("/today");
  }

  async function submitAccount() {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const nm = name.trim() || "你";
        setNickname(nm);
        // include the just-typed nickname in the snapshot we persist
        const snap = { ...snapshotOf(useFunnel.getState()), nickname: nm };
        const r = await apiRegister(email.trim(), pw, snap);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        identify({ name: nm, nickname: nm, ascSign: chart?.ascSign });
        track("activated", { account: true });
        router.push("/today");
      } else {
        const r = await apiLogin(email.trim(), pw);
        if (!r.ok) {
          setErr(r.error);
          return;
        }
        // restore this account's chart onto a fresh device
        if (r.data.profile) loadServer(r.data.profile);
        const nm = r.data.profile?.nickname ?? "你";
        identify({ name: nm, nickname: nm, ascSign: r.data.profile?.chart ? (r.data.profile.chart as { ascSign?: string }).ascSign : undefined });
        track("logged_in");
        router.push(r.data.profile?.chart ? "/today" : "/input");
      }
    } catch {
      setErr("网络出了点问题，再试一次");
    } finally {
      setBusy(false);
    }
  }

  const lbtn = { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: 15, borderRadius: 13, fontSize: 15, fontWeight: 500, border: "1px solid #2b3445", background: "#11151f", color: "var(--cream)", cursor: "pointer" } as const;
  const gold = { ...lbtn, border: "none", background: "linear-gradient(100deg,var(--gold-deep),var(--gold) 50%,var(--gold-soft) 70%)", color: "#1a1305", fontWeight: 600 } as const;

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
          {mode === "signup" ? (
            <>给我一个名字，<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>我把这一切，都记住。</span></>
          ) : (
            <>欢迎回来，<br /><span style={{ color: "var(--gold-soft)", fontStyle: "italic" }}>你的盘还在我这儿。</span></>
          )}
        </div>
        <p className="reveal" style={{ marginTop: 13, fontWeight: 300, fontSize: 14.5, color: "var(--cream-dim)", lineHeight: 1.7, animationDelay: ".35s" }}>
          {mode === "signup" ? "留住你的盘，换台手机、明天再来，我都还认得你。" : "用注册时的邮箱登录，把你的盘接回来。"}
        </p>

        <div className="reveal" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, animationDelay: ".5s" }}>
          {mode === "signup" && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>你想让我怎么叫你？</div>
              <input className="field-inp" data-testid="nickname" type="text" placeholder="小名、网名，随你" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>邮箱</div>
            <input className="field-inp" data-testid="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr(null); }} />
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 9 }}>密码</div>
            <input className="field-inp" data-testid="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "至少 8 位，含字母" : "你的密码"} value={pw} onChange={(e) => { setPw(e.target.value); setErr(null); }} />
          </div>
          {err && <div data-testid="auth-err" style={{ fontSize: 12.5, color: "var(--red)" }}>⚠ {err}</div>}
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 11 }}>
          <button data-testid="account-submit" onClick={submitAccount} disabled={busy} style={{ ...gold, opacity: busy ? 0.7 : 1 }}>
            {busy ? "正在连上你的星空…" : mode === "signup" ? "✉ 创建账号 · 留住我的盘" : "登录"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "2px 0", color: "var(--mute)", fontSize: 12 }}>
            <span style={{ flex: 1, height: 1, background: "#1f2735" }} />其它方式<span style={{ flex: 1, height: 1, background: "#1f2735" }} />
          </div>
          <button title="即将开放" disabled style={{ ...lbtn, opacity: 0.45, cursor: "not-allowed" }}>G &nbsp;用 Google 继续 · 即将开放</button>
        </div>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "var(--cream-dim)" }}>
          {mode === "signup" ? (
            <>已经有账号了？<button type="button" onClick={() => { setMode("login"); setErr(null); }} style={{ display: "inline", color: "var(--gold-soft)", cursor: "pointer", fontSize: "inherit" }}>登录</button></>
          ) : (
            <>还没有账号？<button type="button" onClick={() => { setMode("signup"); setErr(null); }} style={{ display: "inline", color: "var(--gold-soft)", cursor: "pointer", fontSize: "inherit" }}>注册</button></>
          )}
        </div>

        <div style={{ marginTop: "auto", textAlign: "center" }}>
          <button type="button" data-testid="login" onClick={continueLocal} style={{ fontSize: 12.5, color: "var(--mute)", cursor: "pointer" }}>暂时不注册，先在本机用 →</button>
          <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--mute)" }}>🔒 你的盘只属于你 · 随时可删，绝不公开</div>
        </div>
      </div>
    </main>
  );
}
