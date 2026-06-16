// 金句卡 — viral share card. Rendered as ONE inline SVG so the on-screen
// card and the exported PNG share a single source of truth.
//
// Export note: the PNG is rasterized by drawing the SVG into a <canvas>. That
// path runs in an isolated context and MUST NOT reference external font URLs
// (doing so taints the canvas → toBlob throws SecurityError). So the export
// path falls back to a generic serif; the on-screen card uses the brand font.
// TODO(font-embed): base64-embed Cormorant Garamond for pixel-perfect export.

export interface CardData {
  dedication: string; // 致 · …
  quote: string; // the 金句
  signs: string; // ☉ 双子　☽ 双鱼·十二宫　↑ 天蝎
  handle?: string; // @Molly占星
}

export type Template = "a" | "b" | "c" | "d";

interface Theme {
  bg: string; // radial gradient stops
  quote: string;
  gold: string;
  sub: string;
  ded: string;
  silhouette: string;
}

const THEMES: Record<Template, Theme> = {
  a: { bg: "#233057|#141a32|#0a0d1c|#06070f", quote: "#f0e6cf", gold: "#e0c98a", sub: "#8b9bb4", ded: "#8b9bb4", silhouette: "#0a0c16" },
  b: { bg: "#3a2233|#241327|#140a1a|#0a050e", quote: "#f3e2ec", gold: "#e6a9cb", sub: "#b48aa6", ded: "#b48aa6", silhouette: "#160a14" },
  c: { bg: "#22323a|#142028|#0a151a|#06090e", quote: "#e2f0f3", gold: "#9fd3d0", sub: "#7fa6a6", ded: "#7fa6a6", silhouette: "#0a1416" },
  d: { bg: "#e7ddc6|#dccfb4|#cfc0a0|#c2b292", quote: "#2a2417", gold: "#8a6f3a", sub: "#6e6450", ded: "#6e6450", silhouette: "#2a2417" },
};

// Greedy wrap into ≤4 lines, ~11 CJK-width units per line.
export function wrapQuote(q: string, perLine = 11, maxLines = 4): string[] {
  const clean = q.replace(/\s+/g, "");
  const lines: string[] = [];
  let cur = "";
  let w = 0;
  for (const ch of clean) {
    const cw = /[一-龥　-〿＀-￯]/.test(ch) ? 1 : 0.55;
    if (w + cw > perLine && cur) {
      lines.push(cur);
      cur = "";
      w = 0;
      if (lines.length === maxLines - 1) {
        // dump the rest onto the last line
        cur = clean.slice(clean.indexOf(ch));
        break;
      }
    }
    cur += ch;
    w += cw;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildCardSVG(
  data: CardData,
  template: Template = "a",
  opts: { forExport?: boolean; scale?: number } = {},
): string {
  const t = THEMES[template];
  const [c0, c1, c2, c3] = t.bg.split("|");
  const serif = opts.forExport
    ? "Georgia,'Songti SC',serif"
    : "'Cormorant Garamond','Noto Serif SC',Georgia,serif";
  const sans = opts.forExport ? "Helvetica,Arial,sans-serif" : "'Hanken Grotesk','Noto Sans SC',sans-serif";

  const lines = wrapQuote(data.quote);
  const lineH = 30;
  const blockH = lines.length * lineH;
  const qTop = 250 - blockH / 2 + 22; // vertically anchor quote block
  const quoteTspans = lines
    .map((ln, i) => {
      const fill = i === lines.length - 1 ? t.gold : t.quote;
      return `<text x="159" y="${qTop + i * lineH}" text-anchor="middle" font-family="${serif}" font-weight="600" font-size="21" fill="${fill}">${esc(ln)}</text>`;
    })
    .join("");

  const W = 318;
  const H = 424;
  const px = opts.scale ?? 1;

  // starfield dots
  const stars = [
    [57, 51, 1, 0.7, "#fff"], [254, 59, 1, 0.8, t.gold], [95, 127, 1, 0.5, "#fff"],
    [222, 102, 1.4, 0.6, "#b58fb0"], [38, 170, 1, 0.5, "#fff"], [280, 161, 1, 0.45, "#fff"],
    [130, 70, 0.8, 0.5, "#fff"], [200, 150, 0.8, 0.5, t.gold],
  ]
    .map(([x, y, r, o, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}"/>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * px}" height="${H * px}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="26%" r="92%">
      <stop offset="0%" stop-color="${c0}"/><stop offset="40%" stop-color="${c1}"/><stop offset="70%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/>
    </radialGradient>
    <radialGradient id="moon" cx="50%" cy="42%" r="58%">
      <stop offset="0%" stop-color="#fbf1d6"/><stop offset="42%" stop-color="#e6cf94"/><stop offset="78%" stop-color="#c9a861"/><stop offset="100%" stop-color="#8a6f3a"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e6cf94" stop-opacity=".5"/><stop offset="60%" stop-color="#c9a861" stop-opacity=".12"/><stop offset="100%" stop-color="#c9a861" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="20" fill="url(#bg)"/>
  ${stars}
  <text x="159" y="34" text-anchor="middle" font-family="${sans}" font-size="11" fill="${t.ded}" letter-spacing="0.5">${esc(data.dedication)}</text>
  <g transform="translate(0,40)">
    <circle cx="159" cy="74" r="96" fill="url(#halo)"/>
    <circle cx="159" cy="74" r="52" fill="url(#moon)"/>
    <circle cx="144" cy="62" r="8" fill="#bd9c55" opacity=".4"/>
    <circle cx="174" cy="84" r="5" fill="#bd9c55" opacity=".35"/>
    <circle cx="167" cy="54" r="3.5" fill="#bd9c55" opacity=".3"/>
    <path d="M196 40 q5 -4 10 0 q5 -4 10 0" fill="none" stroke="#8a6f3a" stroke-width="1.2" opacity=".5"/>
    <g>
      <path d="M152 116 q-6 14 -4 40 M166 116 q6 14 4 40" fill="none" stroke="${t.silhouette}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="159" cy="110" r="8.5" fill="${t.silhouette}" stroke="#c9a861" stroke-width=".7"/>
      <path d="M150 120 Q159 115 168 120 L176 158 L142 158 Z" fill="${t.silhouette}" stroke="#c9a861" stroke-width=".7"/>
    </g>
  </g>
  ${quoteTspans}
  <text x="159" y="372" text-anchor="middle" font-family="${sans}" font-size="11" fill="${t.sub}" letter-spacing="0.4">${esc(data.signs)}</text>
  <text x="22" y="408" font-family="${sans}" font-size="10" fill="${t.sub}">👁 Molly · 看穿你的本命</text>
  <text x="296" y="408" text-anchor="end" font-family="${sans}" font-size="10" fill="${t.gold}">${esc(data.handle ?? "@Molly占星")}</text>
</svg>`;
}

// ── 合盘卡 (synastry share card) ──────────────────────────────────────────────
// Same frame/themes as the natal card, but the centre is the pair + 契合度 score
// instead of the moon-figure. Only generated for a REAL pairing (§8.3: no card on
// the demo, so a fake score can never be screenshot-shared).
export interface SynastryCardData {
  pair: string;     // 你 ↔ 小鱼
  relLabel: string; // 恋人盘
  total: number;    // 0..100
  quote: string;    // the 金句 (catchLine)
  handle?: string;
}

export function buildSynastryCardSVG(
  data: SynastryCardData,
  template: Template = "a",
  opts: { forExport?: boolean; scale?: number } = {},
): string {
  const t = THEMES[template];
  const [c0, c1, c2, c3] = t.bg.split("|");
  const serif = opts.forExport ? "Georgia,'Songti SC',serif" : "'Cormorant Garamond','Noto Serif SC',Georgia,serif";
  const sans = opts.forExport ? "Helvetica,Arial,sans-serif" : "'Hanken Grotesk','Noto Sans SC',sans-serif";

  const lines = wrapQuote(data.quote, 12, 3);
  const lineH = 28;
  const qTop = 300;
  const quoteTspans = lines
    .map((ln, i) => {
      const fill = i === lines.length - 1 ? t.gold : t.quote;
      return `<text x="159" y="${qTop + i * lineH}" text-anchor="middle" font-family="${serif}" font-style="italic" font-weight="600" font-size="19" fill="${fill}">${esc(ln)}</text>`;
    })
    .join("");

  const W = 318;
  const H = 424;
  const px = opts.scale ?? 1;
  const stars = [
    [57, 51, 1, 0.7, "#fff"], [254, 59, 1, 0.8, t.gold], [95, 120, 1, 0.5, "#fff"],
    [222, 102, 1.4, 0.6, "#b58fb0"], [38, 200, 1, 0.5, "#fff"], [280, 190, 1, 0.45, "#fff"],
  ]
    .map(([x, y, r, o, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}"/>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * px}" height="${H * px}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="26%" r="92%">
      <stop offset="0%" stop-color="${c0}"/><stop offset="40%" stop-color="${c1}"/><stop offset="70%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e6cf94" stop-opacity=".45"/><stop offset="60%" stop-color="#c9a861" stop-opacity=".12"/><stop offset="100%" stop-color="#c9a861" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="20" fill="url(#bg)"/>
  ${stars}
  <text x="159" y="44" text-anchor="middle" font-family="${sans}" font-size="11" fill="${t.ded}" letter-spacing="2">${esc("M O L L Y · 合盘")}</text>
  <text x="159" y="132" text-anchor="middle" font-family="${serif}" font-weight="600" font-size="25" fill="${t.quote}">${esc(data.pair)}</text>
  <text x="159" y="160" text-anchor="middle" font-family="${sans}" font-size="11" fill="${t.sub}" letter-spacing="1.5">${esc(data.relLabel + " · 契合度")}</text>
  <circle cx="159" cy="228" r="78" fill="url(#halo)"/>
  <text x="159" y="252" text-anchor="middle" font-family="${serif}" font-weight="600" font-size="68" fill="${t.gold}">${Math.round(data.total)}<tspan font-size="28">%</tspan></text>
  ${quoteTspans}
  <text x="22" y="408" font-family="${sans}" font-size="10" fill="${t.sub}">👁 Molly · 看穿你的本命</text>
  <text x="296" y="408" text-anchor="end" font-family="${sans}" font-size="10" fill="${t.gold}">${esc(data.handle ?? "@Molly占星")}</text>
</svg>`;
}

// Rasterize an SVG string to a PNG Blob via canvas. forExport SVG must avoid
// external font URLs (canvas-taint), which buildCardSVG(forExport:true) ensures.
export function svgToPngBlob(svg: string, w: number, h: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no 2d ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob null"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("svg img load failed"));
    };
    img.src = url;
  });
}
