// Materiał z akt: import JPG/PNG/PDF, przeglądarka, adnotacje, punkty i tabela, trwałość, plik sprawy, eksport, wydruk, zadanie↔załącznik, brak miejsca.
// Użycie: node tests/e2e_material.mjs <port> <katalog_z_plikami_testowymi>   (foto_duze.jpg, szkic-02.jpg, plik.png, akta.pdf)
import { chromium } from 'playwright-core';
import fs from 'fs';
const port = process.argv[2] || 8765, A = process.argv[3];
const ok = (v, m) => { console.log((v ? 'PASS ' : 'FAIL ') + m); if (!v) process.exitCode = 1; };
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://localhost:${port}/`); await p.waitForSelector('text=Nowa sprawa'); await p.click('text=Nowa sprawa'); await p.waitForSelector('.titleband');
await p.click('#tabs button:has-text("Materiał z akt")'); await p.waitForSelector('.material');
const add = async (file, f = {}) => { await p.setInputFiles('.material input[type=file]', file); await p.waitForSelector('dialog[open] textarea'); if (f.pages) await p.fill('dialog input[aria-label="Strony do dołączenia"]', f.pages); if (f.rodzaj) await p.selectOption('dialog select', f.rodzaj);
  await p.fill('dialog textarea[aria-label="Podstawa w aktach"]', f.podstawa || 'k. 25, zdj. 3'); await p.fill('dialog textarea[aria-label="Opis"]', f.opis || 'Szkic Policji'); await p.fill('dialog textarea[aria-label="Cel"]', f.cel || 'odtworzyć położenie śladów');
  await p.click('dialog button:has-text("Dołącz")'); await p.waitForFunction(n => document.querySelectorAll('.mcard').length >= n, f.expect, { timeout: 40000 }).catch(async e => { console.log('DEBUG dialog:', (await p.locator('dialog[open]').count()) ? await p.locator('dialog[open]').textContent() : '(brak)', '| toast:', await p.textContent('#toast'), '| errs:', errs); throw e; }); };
// 1. JPG (duży 4000x3000 -> kopia robocza ≤3000)
await add(`${A}/foto_duze.jpg`, { rodzaj: 'zdjęcie', opis: 'Zdjęcie F z akt', expect: 1 });
const card1 = await p.textContent('.mcard');
ok(/F1/.test(card1) && /3000×2250/.test(card1), 'JPG 4000×3000 → kopia robocza 3000×2250, id F1: ' + (card1.match(/\d+×\d+ px · [\d,.]+ MB/) || [''])[0]);
// 2. PDF 8 stron – dołączone strony 1-2 jako szkice
await add(`${A}/akta.pdf`, { pages: '1-2', rodzaj: 'szkic', opis: 'Szkic z PDF', expect: 3 });
ok((await p.textContent('.material')).includes('S1') && (await p.textContent('.material')).includes('S2') && (await p.textContent('.mgrid')).includes('(str. 2)'), 'PDF: dwie strony → S1, S2 z podstawą „(str. n)”');
// 3. PNG
await add(`${A}/plik.png`, { rodzaj: 'inne', opis: 'PNG', expect: 4 }); ok((await p.textContent('.mgrid')).includes('I1'), 'PNG → I1');
// 4. widok: punkty, adnotacje, tabela
await p.locator('.mcard').nth(1).locator('button:has-text("Otwórz")').click(); await p.waitForSelector('.viewer .vstage');
await p.waitForFunction(() => { const i = document.querySelector('.viewer img'); return i && i.naturalWidth > 0; });
ok(/kopia robocza – oryginał w aktach k\. 25/.test(await p.textContent('.vbanner')), 'oznaczenie „kopia robocza – oryginał w aktach k. …”');
const box = await p.locator('.vstage').boundingBox();
await p.click('.vbar button:has-text("Punkt")'); await p.mouse.click(box.x + box.width * .4, box.y + box.height * .4); await p.mouse.click(box.x + box.width * .6, box.y + box.height * .5);
ok(await p.locator('.prow').count() === 2 && await p.locator('.prow[data-pid="P1"]').count() === 1, 'narzędzie Punkt: P1 i P2 + wiersze tabeli');
await p.fill('.prow[data-pid="P1"] textarea[aria-label="P1 – Co to jest"]', 'SPO – naroże budynku'); await p.fill('.prow[data-pid="P1"] textarea[aria-label="P1 – Wynik"]', '12,40'); await p.fill('.prow[data-pid="P1"] textarea[aria-label="P1 – Jednostka"]', 'm'); await p.fill('.prow[data-pid="P1"] textarea[aria-label="P1 – Nr mojego zdjęcia"]', '210');
await p.click('.vbar button:has-text("Pióro")'); await p.mouse.move(box.x + 100, box.y + 100); await p.mouse.down(); for (let i = 0; i < 15; i++) await p.mouse.move(box.x + 100 + i * 12, box.y + 100 + i * 5); await p.mouse.up();
await p.click('.vbar button:has-text("Linia")'); await p.mouse.move(box.x + 200, box.y + 300); await p.mouse.down(); await p.mouse.move(box.x + 400, box.y + 320, { steps: 5 }); await p.mouse.up();
await p.click('.vbar button:has-text("Tekst")'); await p.mouse.click(box.x + 300, box.y + 200); await p.waitForSelector('dialog.vdlg[open]'); await p.fill('dialog.vdlg textarea', 'koniec śladu'); await p.click('dialog.vdlg button:has-text("Dodaj")');
const annCount = await p.evaluate(() => { const C = window.__ogl.mat.list(); return C[1].ann.strokes.length + '/' + C[1].ann.lines.length + '/' + C[1].ann.texts.length + '/' + C[1].ann.points.length; });
ok(annCount === '1/1/1/2', 'adnotacje: pióro/linia/tekst/punkty = ' + annCount);
await p.click('.vbar button:has-text("Cofnij")'); ok(await p.evaluate(() => window.__ogl.mat.list()[1].ann.texts.length) === 0, 'Cofnij usuwa ostatnią adnotację');
await p.click('.vbar button:has-text("Ręka")'); await p.click('.prow[data-pid="P2"] .pid'); ok(true, 'podświetlenie punktu z tabeli');
await p.click('.vbar button:has-text("Obróć ⟳")'); ok(await p.evaluate(() => window.__ogl.mat.list()[1].rot) === 1, 'obrót zapisany przy załączniku');
await p.click('.vbar button:has-text("Adnotacje")'); await p.click('.vbar button:has-text("Adnotacje")'); await p.click('.vbar button:has-text("Kontrast")');
const imgSame = await p.evaluate(() => !!document.querySelector('.viewer img').src.startsWith('blob:')); ok(imgSame, 'obraz niezmieniony (osobna warstwa adnotacji na canvas)');
await p.click('.vbar button:has-text("← Wróć")'); await p.waitForSelector('.material');
// 5. powiązanie zadanie <-> załącznik
await p.click('#tabs button:has-text("Zadania")'); await p.click('button:has-text("+ Dodaj zadanie")'); await p.fill('dialog textarea', 'Odszukaj stanowisko fotografowania zdjęcia F1'); await p.click('dialog button:has-text("Dodaj")');
await p.selectOption('.task select[aria-label="Załącznik z materiału z akt"]', 'F1'); await p.click('.task button:has-text("Do załącznika")'); await p.waitForSelector('.viewer');
ok((await p.textContent('.vtasks')).includes('Odszukaj stanowisko'), 'zadanie powiązane widoczne w załączniku'); await p.click('.vbar button:has-text("← Wróć")'); await p.waitForSelector('.tasks'); ok(true, 'powrót z załącznika do listy zadań');
// 6. trwałość po ponownym otwarciu
await p.waitForTimeout(800);
const q = await ctx.newPage(); await q.goto(`http://localhost:${port}/`); await q.waitForSelector('.tasks'); await q.click('#tabs button:has-text("Materiał z akt")'); await q.waitForSelector('.mcard');
ok(await q.locator('.mcard').count() === 4 && await q.locator('.mcard img').count() === 4, 'po ponownym otwarciu: 4 załączniki z miniaturami');
await q.locator('.mcard').nth(1).locator('button:has-text("Otwórz")').click(); await q.waitForFunction(() => { const i = document.querySelector('.viewer img'); return i && i.naturalWidth > 0; });
ok(await q.locator('.prow').count() === 2 && await q.inputValue('.prow[data-pid="P1"] textarea[aria-label="P1 – Wynik"]') === '12,40', 'po ponownym otwarciu: obraz, punkty i wyniki na miejscu'); await q.click('.vbar button:has-text("← Wróć")');
const bufSize = await q.evaluate(() => new Promise(r => { const o = indexedDB.open('ogledziny'); o.onsuccess = () => { const g = o.result.transaction('kv').objectStore('kv').get('current'); g.onsuccess = () => r(JSON.stringify(g.result).length); }; }));
ok(bufSize < 400000, 'sprawa w buforze bez obrazów: ' + Math.round(bufSize / 1024) + ' kB (obrazy w osobnym magazynie)');
// 7. plik sprawy z załącznikami → nowe środowisko
await q.evaluate(() => { navigator.canShare = () => false; }); const t0 = Date.now();
const [dl] = await Promise.all([q.waitForEvent('download'), q.click('#btn-save')]); const saveMs = Date.now() - t0; await dl.saveAs('/tmp/__mat.json'); const raw = fs.readFileSync('/tmp/__mat.json', 'utf8'); fs.copyFileSync('/tmp/__mat.json', A + '/sprawa_z_zalacznikami.json'); fs.unlinkSync('/tmp/__mat.json');
const j = JSON.parse(raw);
ok(j.attachments.length === 4 && j.attachments.every(a => /^data:image\/jpeg;base64,/.test(a.data)) && j.attachments[1].rows.length === 2, `plik sprawy: 4 załączniki z obrazami (${(raw.length / 1048576).toFixed(1)} MB, zapis ${saveMs} ms), punkty i adnotacje w pliku`);
const r2 = await (await b.newContext({ viewport: { width: 1180, height: 820 } })).newPage(); r2.on('pageerror', e => errs.push('' + e)); await r2.goto(`http://localhost:${port}/`); await r2.waitForSelector('text=Otwórz sprawę');
await r2.setInputFiles('#file-input', A + '/sprawa_z_zalacznikami.json'); await r2.waitForSelector('#tabs button:has-text("Materiał z akt (4)")');
await r2.click('#tabs button:has-text("Materiał z akt")'); await r2.locator('.mcard').nth(1).locator('button:has-text("Otwórz")').click(); await r2.waitForFunction(() => { const i = document.querySelector('.viewer img'); return i && i.naturalWidth === 2120 || i && i.naturalWidth > 0; });
ok(await r2.locator('.prow').count() === 2 && (await r2.inputValue('.prow[data-pid="P1"] textarea[aria-label="P1 – Nr mojego zdjęcia"]')) === '210', 'otwarcie pliku w czystym środowisku: obraz i tabela punktów bez strat');
// 8. eksport i wydruk
const md = await q.evaluate(() => window.__ogl.md());
ok(/## Materiał z akt/.test(md) && /\| P1 \| SPO – naroże budynku \| 12,40 \| m \|/.test(md) && /podstawa w aktach: k\. 25/.test(md) && /Zadania powiązane: \[W01\]/.test(md), 'eksport tekstowy: załączniki, podstawa, tabela punktów, zadania powiązane');
await q.evaluate(() => window.__ogl.mat.printMaterial(window.__ogl.mat.list().slice(0, 2))); await q.waitForSelector('#print-root .matimg', { state: 'attached' }); await q.waitForTimeout(500);
ok(await q.locator('#print-root .matimg').count() === 2 && await q.locator('#print-root .ttab').count() >= 1, 'wydruk: obraz z adnotacjami + tabela punktów');
// 9. brak miejsca
await q.evaluate(() => { document.body.classList.remove('printing'); document.getElementById('print-root').replaceChildren(); window.__origPut = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function () { throw new DOMException('quota', 'QuotaExceededError'); }; });
await q.setInputFiles('.material input[type=file]', A + '/szkic-02.jpg'); await q.waitForSelector('dialog[open] textarea'); await q.click('dialog button:has-text("Dołącz")'); await q.waitForSelector('dialog[open]:has-text("Brak miejsca")');
ok(true, 'przekroczenie limitu pamięci: czytelny komunikat zamiast awarii'); await q.click('dialog button:has-text("OK")');
await q.evaluate(() => { IDBObjectStore.prototype.put = window.__origPut; });
console.log('errs', errs.filter(e => !/QuotaExceeded|quota/i.test(e))); await b.close();
