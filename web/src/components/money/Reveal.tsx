"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("money.reveal");
  const [step, setStep] = useState<"reveal" | "correct">("reveal");
  const primary = MEANING_ZH[persona.meaning.primary];
  const secondary = MEANING_ZH[persona.meaning.secondary];

  if (step === "reveal") {
    return (
      <div className="mx-auto max-w-[400px] px-5 py-8 text-center text-[#efe7d4]">
        <p className="text-[11px] tracking-[0.16em] text-[#7a8194] uppercase">{t("kicker")}</p>
        <h1 className="mt-3 font-serif text-2xl leading-relaxed text-[#efe7d4]">
          {t("headLine1")}
          <br />
          {t("headLine2")}
        </h1>
        <div className="my-4 font-serif text-3xl font-semibold tracking-wide text-[#e0c98a] [text-shadow:0_0_26px_rgba(201,168,97,0.32)]">
          {t("isLabel", { label: primary.label })}
        </div>
        <p className="mb-5 text-[12.5px] text-[#c2baa6]">
          {persona.meaning.relation === "tension"
            ? t("tagTension", { styleTag: persona.styleTag, secondary: secondary.label })
            : t("tagAligned", { styleTag: persona.styleTag, secondary: secondary.label })}
        </p>
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {persona.strengths.map((s) => (
            <span key={s} className="rounded-full border border-[#2b3a4e] bg-[rgba(124,150,170,0.08)] px-3.5 py-1.5 text-[12.5px] text-[#a9c4dd]">
              {s}
            </span>
          ))}
        </div>
        <div className="rounded-2xl border border-[rgba(201,168,97,0.4)] bg-[linear-gradient(180deg,rgba(201,168,97,0.07),rgba(201,168,97,0.015))] p-4 text-left [box-shadow:0_0_30px_-12px_rgba(201,168,97,0.4)]">
          <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[#c9a861]">{t("blindSpotLabel")}</p>
          <p className="font-serif text-[18px] leading-relaxed text-[#efe7d4]">{persona.blindSpot}</p>
        </div>
        <button
          onClick={() => setStep("correct")}
          className="mt-7 w-full rounded-[40px] bg-[linear-gradient(100deg,#9a7d44,#c9a861_45%,#e0c98a_60%,#c9a861_75%)] py-4 text-[15px] font-semibold text-[#1a1305]"
        >
          {t("seeStory")}
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
        {t("confirmLine1", { primary: primary.label })}
        <br />
        {t("confirmLine2")}
      </h2>
      <div className="mt-4 rounded-2xl border border-[#262d3d] bg-[#0f1320] p-4">
        <p className="text-center font-serif text-[19px] text-[#efe7d4]">
          {t("moreLine1")}
          <br />
          {t("moreLine2")}
        </p>
        <p className="mt-3 text-center text-[13px] leading-relaxed text-[#bcd4ea]">
          {persona.meaning.relation === "tension"
            ? t("weighTension", { primary: primary.label, secondary: secondary.label })
            : t("weighAligned", { secondary: secondary.label })}
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
        {t("continue")}
      </button>
      <p className="mt-3 text-center text-[10.5px] leading-relaxed text-[#566073]">
        {t("footnote")}
      </p>
    </div>
  );
}
