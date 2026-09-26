// Usage: node scripts/screenshot.mjs <outDir>  — serves docs/ and screenshots every page at 1920x1030.
// Set CHROMIUM to override the browser executable (default: Playwright's managed Chromium).
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = '/home/user/chatbox-converter.github.io/docs';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || p.endsWith('/')) p = join(root, 'index.html');
  res.setHeader('Content-Type', types[extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(4173, r));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM === undefined ? {} : { executablePath: process.env.CHROMIUM }),
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1030 },
  deviceScaleFactor: 1,
});
const out = process.argv[2] ?? 'shots';
for (const [name, hash] of [
  ['integrations', '#/integrations'],
  ['status', '#/status'],
  ['options', '#/options'],
  ['convert', '#/convert'],
]) {
  await page.goto(`http://localhost:4173/${hash}`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await browser.close();
server.close();
