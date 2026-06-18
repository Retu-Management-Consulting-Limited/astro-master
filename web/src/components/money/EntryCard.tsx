"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { track } from "@/lib/track";

// S0 entry/discovery card → /money. Styling from design/19-money-mirror.html (.entry).
export function EntryCard({ surface }: { surface: "today" | "chart" }) {
  const t = useTranslations("money");
  useEffect(() => {
    track("money_entry_impression", { surface });
  }, [surface]);

  return (
    <Link
      href="/money"
      data-testid="money-entry"
      className="mt-5 block overflow-hidden rounded-[18px] border border-[rgba(201,168,97,0.42)] bg-[linear-gradient(135deg,rgba(201,168,97,0.1),rgba(12,17,29,0.5))] p-[18px] [box-shadow:0_0_34px_-14px_rgba(201,168,97,0.5)]"
    >
      <div className="mb-3 h-[38px] w-[38px] rounded-full bg-[radial-gradient(circle,#2a2160,#0a0e1a_70%)] [box-shadow:0_0_0_1px_#c9a861,0_0_14px_rgba(201,138,70,0.45)]" />
      <p className="mb-1.5 font-serif text-[20px] leading-snug text-[#efe7d4]">{t("entry.title")}</p>
      <p className="mb-3.5 text-[12.5px] leading-relaxed text-[#c2baa6]">
        {t("entry.body")}
      </p>
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#e0c98a]">{t("entry.cta")}</span>
    </Link>
  );
}
