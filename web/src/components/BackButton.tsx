"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

// Shared back/close affordance so every screen's header is a real, focusable,
// labelled <button> instead of a hand-rolled <span onClick> (F / R1). Use
// variant="close" (✕) for modal-like sheets, default (←) for stack navigation.
export function BackButton({
  variant = "back",
  onClick,
  to,
}: {
  variant?: "back" | "close";
  onClick?: () => void;
  to?: string;
}) {
  const router = useRouter();
  const t = useTranslations("components.backButton");
  const handle = onClick ?? (() => (to ? router.replace(to) : router.back()));
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={variant === "close" ? t("close") : t("back")}
      style={{ fontSize: 20, lineHeight: 1, color: "var(--mute)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, margin: "-10px -12px", flex: "0 0 auto" }}
    >
      {variant === "close" ? "✕" : "←"}
    </button>
  );
}
