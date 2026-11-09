// Test kamery w aplikacji (Chromium z atrapą kamery): polityka CSP nie blokuje strumienia z getUserMedia.
// Na iPadzie test wykonuje się ręcznie: Sprawa → „Test urządzenia” → „Test kamery”.
import { chromium } from 'playwright-core';
const port = process.argv[2] || 8765;
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const ctx = await b.newContext({ permissions: ['camera'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e)); p.on('console', m => { if (/Content Security/i.test(m.text())) errs.push(m.text()); });
await p.goto(`http://localhost:${port}/`); await p.waitForSelector('text=Nowa sprawa'); await p.click('text=Nowa sprawa'); await p.waitForSelector('.titleband'); await p.click('#tabs button:has-text("Sprawa")');
await p.click('button:has-text("Test urządzenia")'); await p.waitForSelector('dialog[open]'); await p.click('dialog button:has-text("Test kamery")');
await p.waitForFunction(() => /Test kamery: (DZIAŁA|BŁĄD)/.test(document.querySelector('dialog[open]').textContent), null, { timeout: 15000 });
const t = await p.textContent('dialog[open]'); const ok = /Test kamery: DZIAŁA/.test(t) && !errs.length && await p.locator('dialog video').count() === 1;
const mem = /Pamięć aplikacji \(użyto \/ limit\): [\d.]+ MB \/ \d+ MB/.test(t);
console.log((ok ? 'PASS' : 'FAIL') + ' kamera: podgląd strumienia w aplikacji pod CSP (' + (t.match(/Test kamery: [^\n]+/) || [''])[0].slice(0, 90) + ')'); console.log((mem ? 'PASS' : 'FAIL') + ' „Test urządzenia” pokazuje użycie i limit pamięci'); if (!ok || !mem) process.exitCode = 1; console.log('errs', errs); await b.close();
