// Records a short 16:9 gameplay clip of the browser build.
//
// The board takes clicks by screen coordinate, not by element, so the trick
// is the hint ghost: a translucent piece the game itself draws on the
// solution cell, with pointer-events none. Clicking its centre lands on the
// right square through it — real play, not a staged animation.
import { chromium } from 'playwright';

const URL = process.env.GAME_URL ?? 'http://localhost:4180/index.html';
const OUT = process.env.OUT_DIR ?? './raw';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();

async function clickText(text, timeout = 4000) {
  const el = page.locator(`text=${text}`).first();
  await el.waitFor({ state: 'visible', timeout });
  await el.click();
}

/** Where the next piece belongs, asked of the game rather than guessed.
 *
 * Two markers, because the game uses two. A hint paints the target cell's
 * polygon with a gold stroke; the tutorial instead ends its arrow on the
 * cell with a small filled dot. Either one is the game telling us the
 * answer, so the recording never has to know a solution of its own. */
async function solutionPoint() {
  return page.evaluate(() => {
    const centre = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    };
    const hinted = Array.from(document.querySelectorAll('polygon')).find(
      (el) => el.getAttribute('stroke') === 'rgba(249,216,104,0.6)',
    );
    if (hinted) return centre(hinted);
    const arrowTip = Array.from(document.querySelectorAll('circle')).filter(
      (el) => el.getAttribute('r') === '4',
    );
    return arrowTip.length ? centre(arrowTip[arrowTip.length - 1]) : null;
  });
}

/** Level one teaches by dragging and accepts nothing else — "Перетащите
 * пешку на светящуюся клетку". Tapping only arrives with level two, so the
 * recording drags: press on the tray piece, travel in steps so the game
 * sees the move and paints its attack preview, release on the cell. */
async function dragTrayPieceToSolution() {
  const from = await page.evaluate(() => {
    const piece = document.querySelector('[aria-label*="бьёт"]');
    if (!piece) return null;
    const r = piece.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const to = await solutionPoint();
  if (!from || !to) return false;

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * i) / steps,
      from.y + ((to.y - from.y) * i) / steps,
    );
    await sleep(18);
  }
  await sleep(220);
  await page.mouse.up();
  return true;
}

async function playLevel() {
  for (let move = 0; move < 6; move++) {
    const moved = await dragTrayPieceToSolution();
    await sleep(1000);
    if (!moved) break;
    if (await page.locator('text=УРОВЕНЬ ПРОЙДЕН').count()) return true;
  }
  return (await page.locator('text=УРОВЕНЬ ПРОЙДЕН').count()) > 0;
}

await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(1500);

// Consent banner, if the build shows one.
// The consent banner sits over the menu; clear it before anything else.
await clickText('Только необходимые', 4000).catch(async () => {
  await clickText('Принять аналитику', 2000).catch(() => {});
});
await sleep(1400);

// A beat on the menu so the title reads.
await sleep(1400);
await clickText('ИГРАТЬ');
await sleep(1600);

for (let level = 0; level < 3; level++) {
  const solved = await playLevel();
  await sleep(1200);
  if (solved) {
    await clickText('ПРОДОЛЖИТЬ', 3000).catch(() => {});
    await sleep(1600);
  }
}

await sleep(1200);
await context.close();
await browser.close();
console.log('recorded to', OUT);
