"use client";
import { useRouter } from "next/navigation";

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
  const handle = onClick ?? (() => (to ? router.replace(to) : router.back()));
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={variant === "close" ? "关闭" : "返回"}
      style={{ fontSize: 20, lineHeight: 1, color: "var(--mute)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, margin: "-10px -12px", flex: "0 0 auto" }}
    >
      {variant === "close" ? "✕" : "←"}
    </button>
  );
}
