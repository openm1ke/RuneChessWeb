// Fresh landscape screenshots of the web build, one per screen the menu
// now offers. Driven the same way the video was: the game is played, not
// posed, so what lands in the shots is what a player sees.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const URL = process.env.GAME_URL ?? 'http://localhost:4180/index.html';
const OUT = process.env.OUT_DIR ?? './shots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('снято:', name);
};
const tap = async (text, timeout = 5000) => {
  const el = page.locator(`text=${text}`).first();
  await el.waitFor({ state: 'visible', timeout });
  await el.click();
};
const solutionPoint = () =>
  page.evaluate(() => {
    const centre = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    };
    const hinted = Array.from(document.querySelectorAll('polygon')).find(
      (el) => el.getAttribute('stroke') === 'rgba(249,216,104,0.6)');
    if (hinted) return centre(hinted);
    const tips = Array.from(document.querySelectorAll('circle')).filter(
      (el) => el.getAttribute('r') === '4');
    return tips.length ? centre(tips[tips.length - 1]) : null;
  });

async function dragOnce() {
  const from = await page.evaluate(() => {
    const p = document.querySelector('[aria-label*="бьёт"]');
    if (!p) return null;
    const r = p.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const to = await solutionPoint();
  if (!from || !to) return false;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 16, from.y + ((to.y - from.y) * i) / 16);
    await sleep(16);
  }
  await sleep(150);
  await page.mouse.up();
  await sleep(800);
  return true;
}

await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(1800);
for (const t of ['Только необходимые', 'Принять аналитику']) {
  const el = page.locator(`text=${t}`).first();
  if (await el.count()) { await el.click().catch(() => {}); break; }
}
await sleep(1500);
await shot('01-menu');

// Play far enough that the board has pieces, beams and lit coins on it.
await tap('ИГРАТЬ');
await sleep(1600);
for (let level = 0; level < 4; level++) {
  for (let move = 0; move < 5; move++) {
    if (!(await dragOnce())) break;
    if (await page.locator('text=УРОВЕНЬ ПРОЙДЕН').count()) break;
  }
  if (level === 3) break;
  await tap('ПРОДОЛЖИТЬ', 4000).catch(() => {});
  await sleep(1500);
}
await sleep(600);
await shot('02-gameplay');

await tap('ПРОДОЛЖИТЬ', 4000).catch(() => {});
await sleep(1500);
await dragOnce();
await sleep(1000);
await shot('03-gameplay-beams');

/** Every sub-screen carries the same labelled round control back to the
 * menu; the achievements sheet closes instead. */
async function backToMenu() {
  for (const label of ['Назад в меню', 'Закрыть', 'Назад']) {
    const el = page.locator(`[aria-label="${label}"]`).first();
    if (await el.count()) {
      await el.click().catch(() => {});
      await sleep(1500);
      if (await page.locator('text=ЗАДАНИЕ ДНЯ').count()) return true;
    }
  }
  return (await page.locator('text=ЗАДАНИЕ ДНЯ').count()) > 0;
}

await backToMenu();
await sleep(1200);

for (const [label, name] of [
  ['УРОВНИ', '04-levels'],
  ['ДОСТИЖЕНИЯ', '05-achievements'],
  ['ЗАДАНИЕ ДНЯ', '06-daily'],
]) {
  await tap(label, 5000).catch(() => {});
  await sleep(2000);
  await shot(name);
  await backToMenu();
}

// The cosmetics screen hangs off the star counter in the menu's top bar.
const stars = page.locator('[aria-label*="звёзд"], [aria-label*="Звёзд"]').first();
if (await stars.count()) {
  await stars.click().catch(() => {});
  await sleep(1200);
  await tap('ПОСМОТРЕТЬ ОФОРМЛЕНИЯ', 3000).catch(() => {});
  await sleep(2000);
  await shot('07-cosmetics');
  await backToMenu();
}

const settings = page.locator('[aria-label*="астройк"]').first();
if (await settings.count()) {
  await settings.click().catch(() => {});
  await sleep(1800);
  await shot('08-settings');
}

await browser.close();
console.log('готово');
