"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { TEST_MODE } from "@/lib/track";

// Floating feedback affordance — internal test only (NEXT_PUBLIC_MOLLY_TEST=1).
// A tap opens a one-line feedback box tagged with the current page + tester id.
export function FeedbackButton() {
  const t = useTranslations("components.feedbackButton");
  const pathname = usePathname();
  // /chat has its own bottom input bar with a send button at the same corner —
  // lift the FAB above it so the 💬 icon doesn't overlap the send button.
  const fabBottom = pathname === "/chat" ? 138 : 78;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!TEST_MODE) return null;
  // keep onboarding clean; not on the operator dashboard
  if (pathname === "/" || pathname.startsWith("/admin")) return null;

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setFailed(false);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t, page: pathname }),
      });
      if (!res.ok) throw new Error("bad status");
    } catch {
      setFailed(true); // don't claim success on a failed submit (FB-1)
      return;
    }
    setSent(true);
    setTimeout(() => {
      setOpen(false);
      setSent(false);
      setText("");
    }, 1200);
  };

  return (
    <>
      {!open && (
        <button
          data-testid="feedback-fab"
          onClick={() => setOpen(true)}
          style={{ position: "fixed", right: 14, bottom: fabBottom, zIndex: 60, width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(201,168,97,.45)", background: "rgba(12,15,24,.92)", color: "var(--gold-soft)", fontSize: 18, cursor: "pointer", boxShadow: "0 6px 20px -8px rgba(0,0,0,.7)", backdropFilter: "blur(6px)" }}
          aria-label={t("fabAria")}
        >
          💬
        </button>
      )}
      {open && (
        <div style={{ position: "fixed", right: 14, bottom: fabBottom, zIndex: 60, width: "min(300px, calc(100vw - 28px))", background: "linear-gradient(180deg, rgba(18,22,38,.98), rgba(10,12,22,.98))", border: "1px solid rgba(201,168,97,.4)", borderRadius: 16, padding: 13, boxShadow: "0 18px 50px -12px rgba(0,0,0,.7)", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 9 }}>
            <span style={{ fontSize: 12.5, color: "var(--gold-soft)", fontWeight: 600 }}>{t("panelTitle")}</span>
            <button type="button" aria-label={t("close")} onClick={() => setOpen(false)} style={{ marginLeft: "auto", color: "var(--mute)", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          {sent ? (
            <div style={{ fontSize: 13, color: "var(--green)", padding: "10px 2px" }}>{t("sent")}</div>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("placeholder")}
                rows={3}
                style={{ width: "100%", resize: "none", background: "var(--field)", border: "1px solid var(--field-bd)", borderRadius: 10, padding: "9px 11px", color: "var(--cream)", fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
              {failed && <div role="alert" style={{ fontSize: 12, color: "var(--red)", marginTop: 6 }}>{t("failed")}</div>}
              <button
                onClick={send}
                style={{ marginTop: 9, width: "100%", border: "none", borderRadius: 10, padding: "9px 0", fontSize: 13.5, fontWeight: 600, color: "#1a1408", background: "linear-gradient(180deg,var(--gold-soft),var(--gold))", cursor: "pointer" }}
              >
                {t("send")}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
