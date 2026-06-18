"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useChartGuard } from "@/lib/guard";
import { BackButton } from "@/components/BackButton";
import { StoryCard } from "@/components/money/StoryCard";
import { assignVariant } from "@/lib/money/variant";
import { trackNarrativeView, trackDwell, trackAccuracy } from "@/lib/money/track";
import type { Prophecy } from "@/lib/money/types";

interface DayData {
  page: number;
  isDayOne: boolean;
  weight: "heavy" | "light" | "recap";
  hopeNote: string;
  prophecy: Prophecy;
  variant: string;
  prev: string | null; // yesterday's hopeNote, for 承前
}

// Stable per-device id so the H3 A/B arm and the chapter log are consistent.
function deviceId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("molly-money-uid");
  if (!id) {
    id = "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("molly-money-uid", id);
  }
  return id;
}

export default function MoneyTodayPage() {
  const t = useTranslations("money.today");
  const { chart, ready } = useChartGuard();
  const [data, setData] = useState<DayData | null>(null);
  const [rated, setRated] = useState(false);
  const dwell = useRef<{ at: number; page: number }>({ at: 0, page: 0 });

  useEffect(() => {
    if (!ready || !chart) return;
    const uid = deviceId();
    const variant = assignVariant(uid);
    const date = new Date().toISOString().slice(0, 10);
    const prev = localStorage.getItem("molly-money-lasthope"); // yesterday's, before overwrite
    let cancelled = false;
    fetch("/api/narrative", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chart, userId: uid, date, variant }),
    })
      .then((r) => r.json())
      .then((d: Omit<DayData, "prev">) => {
        if (cancelled) return;
        setData({ ...d, prev });
        dwell.current = { at: Date.now(), page: d.page };
        trackNarrativeView({ page: d.page, variant: d.variant, weight: d.weight });
        localStorage.setItem("molly-money-lasthope", d.hopeNote);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (dwell.current.at) trackDwell({ page: dwell.current.page, ms: Date.now() - dwell.current.at });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, chart]);

  if (!ready || !chart) return null;

  return (
    <div className="mx-auto max-w-[400px] px-5 text-[#efe7d4]" style={{ paddingTop: "max(32px, env(safe-area-inset-top))", paddingBottom: "max(32px, env(safe-area-inset-bottom))" }}>
      <div className="mb-4">
        <BackButton />
      </div>
      {!data ? (
        <p className="py-20 text-center font-serif text-[17px] text-[#c2baa6]">{t("loading")}</p>
      ) : (
        <>
          <StoryCard
            page={data.page}
            isDayOne={data.isDayOne}
            weight={data.weight}
            hopeNote={data.hopeNote}
            prophecy={data.prophecy}
            prev={data.isDayOne ? null : data.prev}
          />
          {!rated ? (
            <div className="mt-6">
              <p className="mb-3 text-center text-[12px] text-[#7a8194]">{t("ratePrompt")}</p>
              <div className="flex gap-2">
                {(["good", "meh", "off"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      trackAccuracy({ rating: r, variant: data.variant });
                      setRated(true);
                    }}
                    className="flex-1 rounded-xl border border-[#262d3d] bg-[#0f1320] py-3 text-[13.5px] text-[#c2baa6]"
                  >
                    {t(r === "good" ? "rateGood" : r === "meh" ? "rateMeh" : "rateOff")}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-center text-[12px] text-[#7fc99a]">{t("rated")}</p>
          )}
        </>
      )}
    </div>
  );
}
