"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useChartGuard } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { moneyPersona } from "@/lib/money/persona";
import { Reveal } from "@/components/money/Reveal";
import { track } from "@/lib/track";
import { trackMeaningCorrected } from "@/lib/money/track";
import type { MeaningKey } from "@/lib/money/types";

export default function MoneyRevealPage() {
  const { chart, ready } = useChartGuard();
  const router = useRouter();

  useEffect(() => {
    if (ready && chart) track("money_reveal_view");
  }, [ready, chart]);

  if (!ready || !chart) return null;
  const persona = moneyPersona(chart);

  const onCorrect = (picked: MeaningKey) => {
    if (picked !== persona.meaning.primary) {
      trackMeaningCorrected({ from: persona.meaning.primary, to: picked });
    }
    router.push("/money/today");
  };

  return (
    <>
      <div className="mx-auto max-w-[400px] px-5" style={{ paddingTop: "max(24px, env(safe-area-inset-top))" }}>
        <BackButton />
      </div>
      <Reveal persona={persona} onContinue={() => router.push("/money/today")} onCorrect={onCorrect} />
    </>
  );
}
