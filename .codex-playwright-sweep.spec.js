const fs = require('fs');
const path = require('path');
const http = require('http');
const { test, expect } = require('playwright/test');

const root = process.cwd();
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json'
};

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.venv', '.history', '.agents'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function urlFor(file) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function safeJoin(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^[/\\]+/, '');
  const full = path.join(root, normalized);
  return full.startsWith(root) ? full : null;
}

let server;
let baseURL;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    let full = safeJoin(new URL(req.url, 'http://localhost').pathname);
    if (!full) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) full = path.join(full, 'index.html');
    if (!fs.existsSync(full) && fs.existsSync(`${full}.html`)) full = `${full}.html`;
    if (!fs.existsSync(full)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(full).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(full).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const routes = walk(root).map(urlFor).filter((url) => !url.includes('/music/backend/'));
const viewports = [
  { width: 320, height: 800 },
  { width: 768, height: 900 },
  { width: 1366, height: 900 }
];

for (const viewport of viewports) {
  test.describe(`${viewport.width}px`, () => {
    test.use({ viewport });
    for (const route of routes) {
      test(route, async ({ page }) => {
        const consoleErrors = [];
        const badResponses = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', (error) => consoleErrors.push(error.message));
        page.on('response', (response) => {
          if (response.url().startsWith(baseURL) && response.status() >= 400) {
            badResponses.push(`${response.status()} ${response.url()}`);
          }
        });

        const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(250);
        const metrics = await page.evaluate(() => ({
          textLength: document.body.innerText.trim().length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        }));

        expect(response.status(), 'page status').toBeLessThan(400);
        expect(metrics.textLength, 'page text length').toBeGreaterThan(5);
        expect(metrics.scrollWidth - metrics.clientWidth, 'horizontal overflow').toBeLessThanOrEqual(2);
        expect(badResponses, 'local 4xx/5xx responses').toEqual([]);
        expect(consoleErrors, 'console/page errors').toEqual([]);
      });
    }
  });
}
