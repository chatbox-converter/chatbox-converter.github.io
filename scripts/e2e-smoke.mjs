// End-to-end: load a real MagicChatbox fixture set via the UI, load it, export to VRCOSC, and check the download happened.
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
const root = '/home/user/chatbox-converter.github.io/docs';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const server = createServer((req, res) => {
  let p = join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || p.endsWith('/')) p = join(root, 'index.html');
  res.setHeader('Content-Type', types[extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(4174, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({
  viewport: { width: 1920, height: 1030 },
  acceptDownloads: true,
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto('http://localhost:4174/#/convert');
const dir =
  '/home/user/chatbox-converter.github.io/packages/core/src/formats/magicchatbox/fixtures';
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.includes('.v1.') && !f.includes('.empty.'))
  .map((f) => join(dir, f));
await page.getByLabel('Pick config files').setInputFiles(files);
await page.getByText('Load into the editor').waitFor();
const notes = await page.locator('[aria-label="Conversion notes"] li').allTextContents();
console.log('import notes:', notes.length);
await page.screenshot({
  path: '/tmp/claude-0/-home-user-chatbox-converter-github-io/55e2acfc-bb0b-5a40-a3d1-04af021bb0d6/scratchpad/shots/e2e-import.png',
});
await page.getByText('Load into the editor').click();
await page.waitForTimeout(300);
await page.screenshot({
  path: '/tmp/claude-0/-home-user-chatbox-converter-github-io/55e2acfc-bb0b-5a40-a3d1-04af021bb0d6/scratchpad/shots/e2e-loaded.png',
});
await page.goto('http://localhost:4174/#/convert');
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.getByRole('button', { name: /^VRCOSC/ }).click(),
]);
console.log('download:', download.suggestedFilename());
await page.screenshot({
  path: '/tmp/claude-0/-home-user-chatbox-converter-github-io/55e2acfc-bb0b-5a40-a3d1-04af021bb0d6/scratchpad/shots/e2e-export.png',
});
await page.goto('http://localhost:4174/#/options?section=media');
await page.waitForTimeout(300);
await page.screenshot({
  path: '/tmp/claude-0/-home-user-chatbox-converter-github-io/55e2acfc-bb0b-5a40-a3d1-04af021bb0d6/scratchpad/shots/e2e-options.png',
});
console.log('page errors:', errors);
await browser.close();
server.close();
