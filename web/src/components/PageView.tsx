"use client";
import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { track } from "@/lib/track";

// Fires a page_view for every screen on navigation (internal test only — track()
// is a no-op unless NEXT_PUBLIC_MOLLY_TEST=1). Gives view counts across the whole
// funnel + app so drop-off is visible without instrumenting each page.
export function PageView() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return; // don't self-log the dashboard
    track("page_view", { path: pathname });
  }, [pathname]);
  return null;
}
