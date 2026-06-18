"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { publicLocales } from "@/i18n/exposure";

// 语言名按惯例用该语言自身书写（中文 / Русский），故 zh 自名「中文」是合法
// native-script 字面量，非待抽取 UI 文案。标记豁免 no-cjk guard。
const LABELS: Record<string, string> = { zh: "中文", ru: "Русский" }; /* i18n-allow-cjk */

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  // RU_PUBLIC 关时只列默认 locale（ru 不向用户暴露）。已在 ru 页时仍含 ru
  // 兜底，避免当前选中项从下拉里消失（理论上 proxy 会先把 /ru 重定向走，
  // 但防御性保留 → select value 必有对应 option）。
  const options = Array.from(new Set([...publicLocales(), locale]));

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 15px", fontSize: 14.5, color: "var(--cream)" }}>
      <span>{t("language")}</span>
      <select
        data-testid="locale-switcher"
        aria-label={t("language")}
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
        style={{
          marginLeft: "auto",
          background: "rgba(255,255,255,.04)",
          border: "1px solid var(--field-bd)",
          borderRadius: 9,
          color: "var(--cream)",
          fontSize: 13.5,
          padding: "6px 10px",
          cursor: "pointer",
        }}
      >
        {options.map((l) => (
          <option key={l} value={l} style={{ background: "#11131c", color: "var(--cream)" }}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
