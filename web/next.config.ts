import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev indicator — it sits bottom-left, over this mobile
  // layout's first bottom-tab (今日), obscuring it during dev + E2E.
  // Next.js still surfaces compile/runtime errors.
  devIndicators: false,
};

export default nextConfig;
