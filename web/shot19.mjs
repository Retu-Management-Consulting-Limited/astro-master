import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 460, height: 820 } });
await page.goto('file:///Users/ddd/Documents/Claude/astro-master/design/19-money-mirror.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const total = await page.evaluate(() => document.body.scrollHeight);
let y = 0, i = 0;
while (y < total) {
  await page.evaluate(yy => window.scrollTo(0, yy), y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/Users/ddd/Documents/Claude/astro-master/_review_shots/19-slice-${i}.png` });
  y += 760; i++;
}
console.log('slices', i, 'total', total);
await browser.close();
