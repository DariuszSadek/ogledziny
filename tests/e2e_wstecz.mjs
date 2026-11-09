// Zgodność wsteczna: (1) plik sprawy z wersji 0.5.x (bez załączników) otwiera się bez strat; (2) bufor zapisany przez starszą wersję bazy (IndexedDB v1) wczytuje się po aktualizacji.
// Użycie: node tests/e2e_wstecz.mjs <port> <plik_sprawy_0.5.json> <katalog_plików_testowych>
import { chromium } from 'playwright-core';
import fs from 'fs';
const port = process.argv[2] || 8765, OLD = process.argv[3], A = process.argv[4];
const ok = (v, m) => { console.log((v ? 'PASS ' : 'FAIL ') + m); if (!v) process.exitCode = 1; };
const old = JSON.parse(fs.readFileSync(OLD, 'utf8'));
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
await p.goto(`http://localhost:${port}/`); await p.waitForSelector('text=Otwórz sprawę');
await p.setInputFiles('#file-input', OLD); await p.waitForSelector('#tabs button:has-text("Materiał z akt (0)")');
const nForms = old.forms.length, nTasks = (old.tasks || []).length;
ok(await p.locator('#tabs button').count() >= nForms + 3 && new RegExp(`Zadania \\d+/${nTasks}`).test(await p.textContent('#tabs')), `plik 0.5.x: ${nForms} formularzy i ${nTasks} zadań wczytane`);
await p.click(`#tabs button:has-text("${old.forms[0].formId} ·")`); await p.waitForSelector('.titleband');
const k = Object.keys(old.forms[0].data)[0]; const v = old.forms[0].data[k];
ok(typeof v === 'string' ? await p.inputValue(`[data-id="${k}"]`) === v : await p.locator(`[data-id="${k}"]`).isChecked(), 'plik 0.5.x: dane formularza na miejscu (' + k + ')');
await p.evaluate(() => { navigator.canShare = () => false; }); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btn-save')]); await dl.saveAs('/tmp/__old2.json'); const r = JSON.parse(fs.readFileSync('/tmp/__old2.json', 'utf8')); fs.unlinkSync('/tmp/__old2.json');
ok(JSON.stringify(r.forms.map(f => f.data)) === JSON.stringify(old.forms.map(f => f.data)) && Array.isArray(r.attachments) && r.attachments.length === 0, 'zapis po otwarciu: dane identyczne, pole attachments puste');
// (2) stary bufor (IndexedDB v1 bez magazynu blobs)
const p2 = await (await b.newContext({ viewport: { width: 1180, height: 820 } })).newPage(); p2.on('pageerror', e => errs.push('' + e)); await p2.goto(`http://localhost:${port}/robots-nie-ma`).catch(() => { }); await p2.goto(`http://localhost:${port}/`); await p2.waitForSelector('text=Nowa sprawa');
await p2.evaluate(async c => { await new Promise(r => { const d = indexedDB.deleteDatabase('ogledziny'); d.onsuccess = d.onerror = d.onblocked = () => r(); }); await new Promise((res, rej) => { const o = indexedDB.open('ogledziny', 1); o.onupgradeneeded = () => o.result.createObjectStore('kv'); o.onsuccess = () => { const tx = o.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(c, 'current'); tx.oncomplete = () => { o.result.close(); res(); }; }; o.onerror = () => rej(o.error); }); }, { ...old, rev: 0, savedRev: 0, lastView: old.forms[0].iid });
await p2.reload(); await p2.waitForSelector('.titleband', { timeout: 15000 });
ok(typeof v === 'string' ? await p2.inputValue(`[data-id="${k}"]`) === v : true, 'bufor z bazy v1: odtworzony po aktualizacji do v2');
await p2.click('#tabs button:has-text("Materiał z akt")'); await p2.setInputFiles('.material input[type=file]', A + '/szkic-02.jpg'); await p2.waitForSelector('dialog[open] textarea'); await p2.click('dialog button:has-text("Dołącz")'); await p2.waitForSelector('.mcard', { timeout: 30000 });
ok(true, 'po aktualizacji bazy do v2 dołączanie załączników działa'); console.log('errs', errs); await b.close();
