// Wkład v2: załączniki „do dołączenia” -> dołączenie pliku do wskazanego miejsca, powiązanie z zadaniem, trwałość, plik sprawy.
// Użycie: node tests/e2e_wklad_zalaczniki.mjs <port> <katalog_z_plikami_testowymi>  (szkic-02.jpg)
import { chromium } from 'playwright-core';
import fs from 'fs';
const port = process.argv[2] || 8765, A = process.argv[3], root = process.cwd() + '/';
const ok = (v, m) => { console.log((v ? 'PASS ' : 'FAIL ') + m); if (!v) process.exitCode = 1; };
const wklad = fs.readFileSync(root + 'docs/wklad/przyklad_wkladu.json', 'utf8');
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1180, height: 1000 }, acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
await p.goto(`http://localhost:${port}/`); await p.waitForSelector('text=Nowa sprawa z wkładu');
await p.click('text=Nowa sprawa z wkładu'); await p.waitForSelector('dialog[open] textarea');
await p.fill('dialog textarea', wklad); await p.click('dialog button:has-text("Wczytaj")'); await p.waitForSelector('.tasks'); await p.waitForTimeout(300);
ok((await p.textContent('#tabs')).includes('Materiał z akt (2)'), 'zakładka Materiał z akt (2) po wczytaniu wkładu');
await p.click('#tabs button:has-text("Materiał z akt")'); await p.waitForSelector('.material');
ok(await p.locator('.mcard').count() === 2 && (await p.textContent('.material')).includes('DO DOŁĄCZENIA: 2'), 'dwa miejsca „do dołączenia”');
ok((await p.textContent('.mgrid')).includes('k. 12 – szkic') && (await p.textContent('.mgrid')).includes('Cel:'), 'podstawa i cel z wkładu widoczne');
// zadanie powiązane: „Do załącznika” przed dołączeniem pliku -> komunikat, brak awarii
await p.click('#tabs button:has-text("Zadania")'); await p.waitForSelector('.task');
await p.locator('.task button:has-text("Do załącznika")').first().click(); await p.waitForTimeout(200);
ok(/jeszcze nie dołączony/.test(await p.textContent('#toast')), 'zadanie → załącznik bez pliku: czytelny komunikat');
// dołączenie pliku do S1
await p.click('#tabs button:has-text("Materiał z akt")'); await p.waitForSelector('.material');
const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.locator('.mcard').first().locator('button:has-text("Dołącz plik")').click()]); await fc.setFiles(`${A}/szkic-02.jpg`); await p.waitForSelector('dialog[open] textarea');
ok((await p.inputValue('dialog textarea[aria-label="Podstawa w aktach"]')).startsWith('k. 12'), 'okno dołączania wypełnione danymi z wkładu');
await p.click('dialog button:has-text("Dołącz")'); await p.waitForFunction(() => window.__ogl.mat.list()[0].w > 0, null, { timeout: 30000 });
const a0 = await p.evaluate(() => { const a = window.__ogl.mat.list()[0]; return { id: a.id, w: a.w, wait: !!a.oczekuje, pod: a.podstawa, n: window.__ogl.mat.list().length }; });
ok(a0.id === 'S1' && !a0.wait && a0.pod.startsWith('k. 12') && a0.n === 2, 'S1 wypełniony plikiem, id i podstawa bez zmian, bez duplikatu');
ok((await p.textContent('.material')).includes('DO DOŁĄCZENIA: 1'), 'licznik: pozostał 1 do dołączenia');
// zadanie → załącznik działa teraz
await p.click('#tabs button:has-text("Zadania")'); await p.waitForSelector('.task');
await p.locator('.task button:has-text("Do załącznika")').first().click(); await p.waitForSelector('.viewer .vstage');
ok(true, 'zadanie → przeglądarka załącznika S1'); await p.click('.vbar button:has-text("Wróć")');
// eksport tekstowy wskazuje brak pliku F1
const md = await p.evaluate(() => window.__ogl.md()); ok(/F1/.test(md) && /DO DOŁĄCZENIA/.test(md), 'eksport tekstowy oznacza załącznik niedołączony');
// plik sprawy: zapis i ponowne otwarcie bez fałszywych ostrzeżeń o brakujących obrazach
await p.waitForTimeout(300);
const fs2 = await p.evaluate(async () => { const m = window.__ogl.mat.forSave(); return { ready: m.ready, miss: m.missing, items: m.items.map(i => [i.id, !!i.data, !!i.oczekuje]) }; });
ok(fs2.ready && JSON.stringify(fs2.items) === JSON.stringify([['S1', true, false], ['F1', false, true]]), 'forSave: S1 z obrazem, F1 oczekuje bez obrazu');
const r = await p.evaluate(async () => { const m = window.__ogl.mat.forSave(); const obj = { id: 'x1', attachments: JSON.parse(JSON.stringify(m.items)) }; return await window.__ogl.mat.restoreFromFile(obj); });
ok(r.n === 1 && r.missing.length === 0, 'otwarcie pliku: 1 obraz przywrócony, oczekujący nie jest zgłaszany jako brak');
ok(errs.length === 0, 'brak błędów JS: ' + errs.join(' | ')); await b.close();
