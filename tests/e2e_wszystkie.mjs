// Wszystkie formularze: wypełnienie po jednym polu każdego rodzaju, zapis pliku, ponowne otwarcie w nowym kontekście, porównanie.
import { chromium } from 'playwright-core';
import fs from 'fs';
const port = process.argv[2] || 8765;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1000, height: 1200 }, acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
await p.goto(`http://localhost:${port}/`); await p.click('text=Nowa sprawa'); await p.waitForSelector('.titleband');
await p.click('#tabs button:has-text("Sprawa")');
await p.fill('input[aria-label="Sygnatura / nr zlecenia"]', 'II K 123/26');
const ids = ['00', '02', '03', '04', '05', '06', '07', '08', '09'];
const typed = {};
for (const id of ids) {
  await p.click('#tabs button:has-text("+ Formularz")'); await p.click(`dialog .pick button:has-text("${id} ·")`); await p.click('dialog button:has-text("Dodaj wybrany")');
  await p.waitForSelector(`.form[data-form="${id}"]`);
  const t = p.locator(`.form[data-form="${id}"] textarea[data-id]:not([data-id$=".uwagi"])`).first();
  const c = p.locator(`.form[data-form="${id}"] input[type=checkbox][data-id]`).nth(3);
  const tid = await t.getAttribute('data-id'), cid = await c.getAttribute('data-id');
  await t.fill(`wartość ${id}, 12,5 ął`); await c.check({ force: true });
  typed[id] = [tid, cid];
}
await p.waitForTimeout(800);
await p.evaluate(() => { navigator.canShare = () => false; });
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btn-save')]);
await dl.saveAs('/tmp/__all.json'); fs.copyFileSync('/tmp/__all.json', 'all_out.json'); fs.unlinkSync('/tmp/__all.json');
const j = JSON.parse(fs.readFileSync('all_out.json', 'utf8'));
ok(j.forms.length === 10, 'plik: 10 formularzy (' + j.forms.length + '), rozmiar ' + Math.round(fs.statSync('all_out.json').size / 1024) + ' kB');
ok(/^II-K-123-26_\d{4}-\d\d-\d\d_\d{4}\.json$/.test(dl.suggestedFilename()), 'nazwa pliku: ' + dl.suggestedFilename());
ok(Object.keys(j.defVersions).length === 10, 'wersje definicji dla 10 formularzy');
// nowy kontekst (czyste przeglądarka) – otwarcie pliku
const ctx2 = await b.newContext({ viewport: { width: 1000, height: 1200 } });
const q = await ctx2.newPage(); q.on('pageerror', e => errs.push('' + e));
await q.goto(`http://localhost:${port}/`); await q.waitForSelector('text=Otwórz sprawę');
await q.setInputFiles('#file-input', 'all_out.json'); await q.waitForTimeout(600);
ok(await q.locator('dialog[open]').count() === 0, 'otwarcie bez raportu (bez zmian)');
ok(await q.inputValue('input[aria-label="Sygnatura / nr zlecenia"]') === 'II K 123/26', 'nagłówek wczytany');
for (const id of ids) {
  await q.click(`#tabs button:has-text("${id} ·")`); await q.waitForSelector(`.form[data-form="${id}"]`);
  const [tid, cid] = typed[id];
  ok(await q.inputValue(`[data-id="${tid}"]`) === `wartość ${id}, 12,5 ął` && await q.locator(`[data-id="${cid}"]`).isChecked(), `${id}: dane po otwarciu pliku`);
}
console.log('errs', errs); await b.close();
