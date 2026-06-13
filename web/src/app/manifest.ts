import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Molly · 看穿你的本命",
    short_name: "Molly",
    description: "AI 占星大师 Molly — 看穿你的本命盘，每天三句话，懂你越来越深。",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#04050a",
    theme_color: "#04050a",
    lang: "zh-Hans",
    categories: ["lifestyle", "entertainment"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
