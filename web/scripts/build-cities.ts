// Build-time: turn GeoNames cities15000.txt into a compact bilingual index.
//
//   bun run scripts/build-cities.ts
//
// Source (cities15000.zip, ~3.3MB) is downloaded to /tmp if not present. Its
// `alternatenames` column already contains Chinese (simplified + traditional)
// AND the IANA timezone id, so no extra GeoNames file is needed.
//
// Output: src/lib/astro/geo/cities.index.json
//   rows:  [lat, lng, iana, countryCode, population, displayZh, displayEn][]
//   index: { normalizedName: rowIdx[] }   (latin lowercased; CJK kept as-is)
//   countries: { ISO2: [zhName, enName] }  (curated, for country disambiguation)

import { mkdtempSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const SRC = "/tmp/cities15000.txt";
const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(HERE, "../src/lib/astro/geo/cities.index.json");

// ~40 countries where the beachhead audience (overseas Chinese) cluster.
// ISO alpha-2 → [Chinese name, English name].
const COUNTRIES: Record<string, [string, string]> = {
  AU: ["澳大利亚", "Australia"], NZ: ["新西兰", "New Zealand"], CN: ["中国", "China"],
  HK: ["香港", "Hong Kong"], MO: ["澳门", "Macau"], TW: ["台湾", "Taiwan"],
  US: ["美国", "United States"], CA: ["加拿大", "Canada"], GB: ["英国", "United Kingdom"],
  SG: ["新加坡", "Singapore"], MY: ["马来西亚", "Malaysia"], JP: ["日本", "Japan"],
  KR: ["韩国", "South Korea"], FR: ["法国", "France"], DE: ["德国", "Germany"],
  IT: ["意大利", "Italy"], ES: ["西班牙", "Spain"], NL: ["荷兰", "Netherlands"],
  CH: ["瑞士", "Switzerland"], IE: ["爱尔兰", "Ireland"], TH: ["泰国", "Thailand"],
  VN: ["越南", "Vietnam"], PH: ["菲律宾", "Philippines"], ID: ["印度尼西亚", "Indonesia"],
  IN: ["印度", "India"], AE: ["阿联酋", "United Arab Emirates"], RU: ["俄罗斯", "Russia"],
  BR: ["巴西", "Brazil"], MX: ["墨西哥", "Mexico"], ZA: ["南非", "South Africa"],
  SE: ["瑞典", "Sweden"], NO: ["挪威", "Norway"], FI: ["芬兰", "Finland"],
  DK: ["丹麦", "Denmark"], BE: ["比利时", "Belgium"], AT: ["奥地利", "Austria"],
  PT: ["葡萄牙", "Portugal"], GR: ["希腊", "Greece"], PL: ["波兰", "Poland"],
};

const hasCJK = (s: string) => /[㐀-鿿]/.test(s);
const isLatin = (s: string) => /^[\x20-\x7EÀ-ɏ]+$/.test(s);
// Normalize a search key: latin → trimmed lowercase; CJK kept verbatim.
const norm = (s: string) => (hasCJK(s) ? s.trim() : s.trim().toLowerCase());

function ensureSource() {
  if (existsSync(SRC)) return;
  const dir = mkdtempSync(join(tmpdir(), "geo-"));
  const zip = join(dir, "cities15000.zip");
  console.log("downloading cities15000.zip …");
  execSync(`curl -sS -m 120 -o "${zip}" https://download.geonames.org/export/dump/cities15000.zip`);
  execSync(`unzip -o -q "${zip}" -d /tmp`);
}

function build() {
  ensureSource();
  const text = readFileSync(SRC, "utf8");
  const lines = text.split("\n").filter(Boolean);

  type Row = [number, number, string, string, number, string, string];
  const rows: Row[] = [];
  const index: Record<string, number[]> = {};

  const addKey = (key: string, idx: number) => {
    const k = norm(key);
    if (!k) return;
    (index[k] ||= []).push(idx);
  };

  for (const line of lines) {
    const f = line.split("\t");
    const name = f[1];
    const ascii = f[2];
    const alts = f[3] ? f[3].split(",") : [];
    const lat = Number(f[4]);
    const lng = Number(f[5]);
    const cc = f[8];
    const pop = Number(f[14]) || 0;
    const iana = f[17];
    if (!iana || Number.isNaN(lat) || Number.isNaN(lng)) continue;

    const zhNames = alts.filter(hasCJK);
    const displayZh = zhNames[0] ?? "";
    const displayEn = name;

    const idx = rows.length;
    rows.push([+lat.toFixed(4), +lng.toFixed(4), iana, cc, pop, displayZh, displayEn]);

    // Searchable keys: primary name + ascii name (covers English/local-latin
    // input) + all CJK alts (covers Chinese input). Obscure latin transliteration
    // variants are dropped — they bloat the index and are essentially never typed.
    addKey(name, idx);
    if (ascii && ascii !== name) addKey(ascii, idx);
    for (const a of alts) {
      if (hasCJK(a)) addKey(a, idx);
    }
  }

  // Dedup + sort each posting list by population desc (best match first).
  for (const k of Object.keys(index)) {
    const uniq = [...new Set(index[k])];
    uniq.sort((a, b) => rows[b][4] - rows[a][4]);
    index[k] = uniq;
  }

  const out = { rows, index, countries: COUNTRIES };
  const json = JSON.stringify(out);
  writeFileSync(OUT, json);
  console.log(`wrote ${OUT}`);
  console.log(`  rows: ${rows.length}, keys: ${Object.keys(index).length}, size: ${(json.length / 1e6).toFixed(2)}MB`);
}

build();
