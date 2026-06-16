"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { computeChart } from "@/lib/astro/chart";
import { resolveBirth } from "@/lib/birth";

// Person B's landing page from a synastry invite link. They fill in their real
// birth data; we resolve it (same correct-offset path as /input) and submit the
// computed chart back against the invite token.
export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [inviter, setInviter] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(""); // no fake default — must be the partner's real date (B4)
  const [time, setTime] = useState("");
  const [knownTime, setKnownTime] = useState(true); // 默认未知→正午（诚实默认，不诱导填假精确时间）
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/synastry/invite?token=${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setInviter(j.inviterName ?? "对方"))
      .catch(() => setInvalid(true));
  }, [token]);

  async function submit() {
    if (busy) return;
    setErr(null);
    if (!date || (!knownTime && !time) || !city.trim()) {
      setErr("把出生日期、时间和城市填好，我才能排得准。");
      return;
    }
    setBusy(true);
    try {
      const form = { date, time: knownTime ? "12:00" : time, knownTime, country, city };
      const r = await resolveBirth(form);
      if ("error" in r) {
        setErr(r.error);
        return;
      }
      const chart = computeChart(r.birth);
      const res = await fetch("/api/synastry/invite/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name: name.trim() || undefined, chart, birthForm: form }),
      });
      if (!res.ok) {
        setErr("这个邀请链接失效了");
        return;
      }
      setDone(true);
    } catch {
      setErr("网络出了点问题，再试一次");
    } finally {
      setBusy(false);
    }
  }

  const lbl = { display: "block", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase" as const, color: "var(--gold)", marginBottom: 9, fontWeight: 500 };

  return (
    <main className="phone" data-testid="syn-invite">
      <div className="starfield" />
      <div className="grain" />
      <div style={{ position: "relative", zIndex: 2, flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: "30px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="eye-mini" />
          <span style={{ fontWeight: 500, letterSpacing: ".4em", fontSize: 12, color: "var(--gold)", textIndent: ".4em" }}>MOLLY</span>
        </div>

        {invalid ? (
          <div style={{ marginTop: 60, textAlign: "center", color: "var(--cream-dim)" }} data-testid="invite-invalid">这个邀请链接失效了，让对方再发你一个吧。</div>
        ) : done ? (
          <div style={{ marginTop: 60, textAlign: "center" }} data-testid="invite-done">
            <div style={{ fontSize: 40, marginBottom: 14 }}>✦</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 24, color: "var(--cream)", lineHeight: 1.4 }}>填好了，谢谢你。</div>
            <p style={{ marginTop: 12, fontSize: 14, color: "var(--cream-dim)", lineHeight: 1.7 }}>{inviter} 那边就能看到你俩的真实合盘了。<br />想看你自己的本命盘吗？</p>
            <a href="/" style={{ display: "inline-block", marginTop: 20, color: "var(--gold-soft)", fontSize: 14 }}>让 Molly 也看看我 →</a>
          </div>
        ) : (
          <>
            <div className="reveal" style={{ marginTop: 36, fontFamily: "var(--serif)", fontSize: 28, color: "var(--cream)", fontWeight: 500, lineHeight: 1.36 }}>
              <span style={{ color: "var(--gold-soft)" }}>{inviter ?? "有人"}</span> 想和你，<br /><span style={{ fontStyle: "italic", color: "var(--gold-soft)" }}>测一测你俩合不合。</span>
            </div>
            <p style={{ marginTop: 12, fontSize: 14, color: "var(--cream-dim)", lineHeight: 1.7 }}>留下你真实的出生时间和地点——会安全保存、只用来排你俩的合盘；对方只看到合盘结果，<b style={{ color: "var(--cream)", fontWeight: 400 }}>看不到你的出生信息</b>。</p>

            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={lbl} htmlFor="inv-name">你的名字</label>
                <input id="inv-name" className="field-inp" data-testid="inv-name" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} placeholder="怎么称呼你" />
              </div>
              <div>
                <label style={lbl} htmlFor="inv-date">出生日期</label>
                <input id="inv-date" className="field-inp" type="date" autoComplete="bday" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label style={lbl} htmlFor="inv-time">出生时间</label>
                <input id="inv-time" className="field-inp" type="time" value={time} disabled={knownTime} onChange={(e) => setTime(e.target.value)} style={{ opacity: knownTime ? 0.5 : 1 }} />
                <button type="button" role="checkbox" aria-checked={!knownTime} onClick={() => setKnownTime(!knownTime)} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 11, cursor: "pointer", padding: "10px 0" }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 6, border: "1px solid #39414f", flex: "0 0 auto", background: !knownTime ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#1a1305", fontSize: 12, fontWeight: 700 }}>{!knownTime ? "✓" : ""}</span>
                  <span style={{ fontSize: 13, color: "var(--cream-dim)" }}>我知道准确的出生时间</span>
                </button>
                {knownTime && <p style={{ fontSize: 12.5, color: "var(--mute)", lineHeight: 1.6, marginTop: 8 }}>不知道也没关系——按<b style={{ color: "var(--cream-dim)", fontWeight: 400 }}>正午</b>排。</p>}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl} htmlFor="inv-country">国家</label>
                  <input id="inv-country" className="field-inp" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="如 中国" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl} htmlFor="inv-city">城市</label>
                  <input id="inv-city" className="field-inp" data-testid="inv-city" autoComplete="address-level2" value={city} onChange={(e) => { setCity(e.target.value); setErr(null); }} placeholder="如 上海" />
                </div>
              </div>
              {err && <div data-testid="inv-err" style={{ fontSize: 12.5, color: "var(--red)" }}>⚠ {err}</div>}
            </div>

            <div style={{ marginTop: "auto", paddingTop: 20 }}>
              <button className="gold-btn" data-testid="inv-submit" onClick={submit} disabled={busy} style={{ opacity: busy ? 0.7 : 1 }}>{busy ? "正在为你俩排盘…" : "提交，看我俩合不合"}</button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
