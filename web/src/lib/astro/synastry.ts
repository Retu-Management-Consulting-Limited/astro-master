import type { Chart, BodyName } from "./chart";

export type RelType = "lover" | "partner" | "colleague" | "friend" | "family";

export interface SynDim {
  key: string;
  label: string;
  value: number; // 0..100
}
export interface SynResult {
  type: RelType;
  total: number;
  dims: SynDim[];
}

const lon = (c: Chart, b: BodyName) => c.placements.find((p) => p.body === b)!.lon;
const sep = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};
const near = (angle: number, targets: number[], orb = 8) => {
  let best = 0;
  for (const t of targets) {
    const o = Math.abs(angle - t);
    if (o <= orb) best = Math.max(best, 1 - o / orb);
  }
  return best;
};

type Pair = [BodyName, BodyName];
type Mode = "harmony" | "mixed" | "tensionGood";

function dimScore(a: Chart, b: Chart, pairs: Pair[], mode: Mode): number {
  let harmony = 0, tension = 0, n = 0;
  for (const [x, y] of pairs) {
    // both directions
    for (const s of [sep(lon(a, x), lon(b, y)), sep(lon(a, y), lon(b, x))]) {
      harmony += near(s, [0, 60, 120]);
      tension += near(s, [90, 180]);
      n++;
    }
  }
  const h = n ? harmony / n : 0;
  const t = n ? tension / n : 0;
  let v: number;
  if (mode === "harmony") v = 38 + 52 * h - 16 * t;
  else if (mode === "mixed") v = 44 + 30 * h + 26 * t; // chemistry likes some friction
  else v = 40 + 20 * h + 40 * t; // tensionGood: drive/spark
  return Math.max(2, Math.min(99, Math.round(v)));
}

const CONFIG: Record<RelType, { key: string; label: string; pairs: Pair[]; mode: Mode }[]> = {
  lover: [
    { key: "spark", label: "❤️‍🔥 心动", pairs: [["Venus", "Mars"], ["Mars", "Venus"]], mode: "mixed" },
    { key: "safety", label: "🛟 安全感", pairs: [["Moon", "Saturn"], ["Moon", "Moon"]], mode: "harmony" },
    { key: "understand", label: "💬 懂你", pairs: [["Sun", "Moon"], ["Mercury", "Mercury"]], mode: "harmony" },
    { key: "longterm", label: "⏳ 长久", pairs: [["Saturn", "Sun"], ["Sun", "Saturn"]], mode: "harmony" },
  ],
  partner: [
    { key: "sync", label: "🤝 默契", pairs: [["Mercury", "Mercury"], ["Moon", "Mercury"]], mode: "harmony" },
    { key: "complement", label: "🧩 互补", pairs: [["Mars", "Saturn"], ["Sun", "Jupiter"]], mode: "tensionGood" },
    { key: "trust", label: "🔒 信任", pairs: [["Saturn", "Sun"], ["Saturn", "Moon"]], mode: "harmony" },
    { key: "money", label: "💰 合财", pairs: [["Venus", "Jupiter"], ["Jupiter", "Venus"]], mode: "harmony" },
  ],
  colleague: [
    { key: "fit", label: "🤝 配合", pairs: [["Mercury", "Mercury"], ["Mars", "Mars"]], mode: "harmony" },
    { key: "complement", label: "🧩 互补", pairs: [["Sun", "Saturn"], ["Mars", "Jupiter"]], mode: "tensionGood" },
    { key: "boundary", label: "🚧 边界", pairs: [["Saturn", "Moon"]], mode: "harmony" },
  ],
  friend: [
    { key: "heart", label: "💛 真心", pairs: [["Moon", "Moon"], ["Venus", "Venus"]], mode: "harmony" },
    { key: "talk", label: "💬 能聊", pairs: [["Mercury", "Mercury"], ["Mercury", "Jupiter"]], mode: "harmony" },
    { key: "boundary", label: "🚧 界限", pairs: [["Saturn", "Mars"]], mode: "harmony" },
  ],
  family: [
    { key: "understand", label: "💗 理解", pairs: [["Moon", "Sun"], ["Moon", "Moon"]], mode: "harmony" },
    { key: "wound", label: "🩹 伤害", pairs: [["Moon", "Saturn"], ["Mars", "Moon"]], mode: "harmony" },
    { key: "reconcile", label: "🕊️ 和解", pairs: [["Venus", "Saturn"], ["Jupiter", "Moon"]], mode: "harmony" },
  ],
};

export function synastry(a: Chart, b: Chart, type: RelType): SynResult {
  const dims = CONFIG[type].map((d) => ({ key: d.key, label: d.label, value: dimScore(a, b, d.pairs, d.mode) }));
  const total = Math.round(dims.reduce((s, d) => s + d.value, 0) / dims.length);
  return { type, total, dims };
}
