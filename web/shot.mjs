import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const designDir = '/Users/ddd/Documents/Claude/astro-master/design';
const outDir = '/Users/ddd/Documents/Claude/astro-master/_review_shots';
import { mkdirSync } from 'fs';
mkdirSync(outDir, { recursive: true });

const files = readdirSync(designDir).filter(f => f.endsWith('.html')).sort();
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 460, height: 900 } });

for (const f of files) {
  const url = 'file://' + path.join(designDir, f);
  await page.goto(url, { waitUntil: 'networkidle' }).catch(()=>{});
  await page.waitForTimeout(1200);
  const out = path.join(outDir, f.replace('.html', '.png'));
  await page.screenshot({ path: out, fullPage: true });
  console.log('shot', f);
}
await browser.close();
console.log('DONE');
