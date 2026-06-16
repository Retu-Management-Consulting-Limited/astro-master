"use client";
import { useState } from "react";
import { MEANING_ZH, type MeaningKey, type MoneyPersona } from "@/lib/money/types";

// S1 钩尖揭示 + S1b meaning 修正 (v4「看得更多」framing). Styling lifted from
// design/19-money-mirror.html (Dark Celestial Luxe). The screen asserts the
// confident meaning, then deepens — it never asks "我说错了吗".
export function Reveal({
  persona,
  onContinue,
  onCorrect,
}: {
  persona: MoneyPersona;
  onContinue: () => void;
  onCorrect: (m: MeaningKey) => void;
}) {
  const [step, setStep] = useState<"reveal" | "correct">("reveal");
  const primary = MEANING_ZH[persona.meaning.primary];
  const secondary = MEANING_ZH[persona.meaning.secondary];

  if (step === "reveal") {
    return (
      <div className="mx-auto max-w-[400px] px-5 py-8 text-center text-[#efe7d4]">
        <p className="text-[11px] tracking-[0.16em] text-[#7a8194] uppercase">钱，对你到底意味着什么</p>
        <h1 className="mt-3 font-serif text-2xl leading-relaxed text-[#efe7d4]">
          我知道，钱对你
          <br />
          从来不只是钱。
        </h1>
        <div className="my-4 font-serif text-3xl font-semibold tracking-wide text-[#e0c98a] [text-shadow:0_0_26px_rgba(201,168,97,0.32)]">
          是{primary.label}
        </div>
        <p className="mb-5 text-[12.5px] text-[#c2baa6]">
          {persona.styleTag} · {persona.meaning.relation === "tension" ? `也藏着「${secondary.label}」的拉扯` : `与「${secondary.label}」同向`}
        </p>
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {persona.strengths.map((s) => (
            <span key={s} className="rounded-full border border-[#2b3a4e] bg-[rgba(124,150,170,0.08)] px-3.5 py-1.5 text-[12.5px] text-[#a9c4dd]">
              {s}
            </span>
          ))}
        </div>
        <div className="rounded-2xl border border-[rgba(201,168,97,0.4)] bg-[linear-gradient(180deg,rgba(201,168,97,0.07),rgba(201,168,97,0.015))] p-4 text-left [box-shadow:0_0_30px_-12px_rgba(201,168,97,0.4)]">
          <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#c9a861]">你的盲点 · 也是你的暗面</p>
          <p className="font-serif text-[18px] leading-relaxed text-[#efe7d4]">{persona.blindSpot}</p>
        </div>
        <button
          onClick={() => setStep("correct")}
          className="mt-7 w-full rounded-[40px] bg-[linear-gradient(100deg,#9a7d44,#c9a861_45%,#e0c98a_60%,#c9a861_75%)] py-4 text-[15px] font-semibold text-[#1a1305]"
        >
          看我的金钱故事 →
        </button>
      </div>
    );
  }

  // S1b — 看得更多, not 可能看错: confident assertion stays, then reveal the other side.
  const picks: MeaningKey[] = [persona.meaning.primary, persona.meaning.secondary, "control", "status", "care"].filter(
    (v, i, a) => a.indexOf(v) === i,
  ) as MeaningKey[];
  return (
    <div className="mx-auto max-w-[400px] px-5 py-8 text-[#efe7d4]">
      <h2 className="mt-3 text-center font-serif text-xl leading-relaxed">
        钱对你是「{primary.label}」——
        <br />
        这点，我很确定。
      </h2>
      <div className="mt-4 rounded-2xl border border-[#262d3d] bg-[#0f1320] p-4">
        <p className="text-center font-serif text-[19px] text-[#efe7d4]">
          但我还看到你
          <br />
          藏起来的另一面。
        </p>
        <p className="mt-3 text-center text-[13px] leading-relaxed text-[#bcd4ea]">
          {persona.meaning.relation === "tension"
            ? `你想要「${primary.label}」，又放不下「${secondary.label}」。此刻的你，哪一股更重？`
            : `「${secondary.label}」也在你心里。此刻的你，哪一股更重？`}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {picks.map((k) => (
          <button
            key={k}
            onClick={() => onCorrect(k)}
            className="rounded-full border border-[#2b3a4e] px-3.5 py-2 text-[13px] text-[#a9c4dd] hover:border-[#8fb6d8] hover:text-[#cfe2f2]"
          >
            {MEANING_ZH[k].label}
          </button>
        ))}
      </div>
      <button
        onClick={onContinue}
        className="mt-6 w-full rounded-[40px] bg-[linear-gradient(100deg,#9a7d44,#c9a861_45%,#e0c98a_60%,#c9a861_75%)] py-4 text-[15px] font-semibold text-[#1a1305]"
      >
        继续 →
      </button>
      <p className="mt-3 text-center text-[10.5px] leading-relaxed text-[#566073]">
        不是我猜错——是我连你藏起来的那面也看到了。
      </p>
    </div>
  );
}
