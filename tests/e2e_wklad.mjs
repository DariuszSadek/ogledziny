// Wkład w przeglądarce: wklejenie JSON od Claude AI -> nowa sprawa, zakładka Zadania, statusy, panel w formularzu, trwałość, eksport, wydruk.
import { chromium } from 'playwright-core';
import fs from 'fs';
const port = process.argv[2] || 8765, root = process.cwd() + '/';
const ok = (v, m) => { console.log((v ? 'PASS ' : 'FAIL ') + m); if (!v) process.exitCode = 1; };
const wklad = fs.readFileSync(root + 'docs/claude_ai/przyklad_wkladu.json', 'utf8');
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1000, height: 1300 }, acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
await p.goto(`http://localhost:${port}/`); await p.waitForSelector('text=Nowa sprawa z wkładu');
await p.click('text=Nowa sprawa z wkładu'); await p.waitForSelector('dialog[open] textarea');
// najpierw błędny JSON -> komunikat i zachowanie tekstu
await p.fill('dialog textarea', '{ to nie jest json'); await p.click('dialog button:has-text("Wczytaj")');
await p.waitForSelector('dialog[open] .warnp'); ok(/JSON/.test(await p.textContent('dialog .warnp')), 'błędny JSON: komunikat w oknie');
await p.fill('dialog textarea', 'Oto wkład:\n```json\n' + wklad + '\n```'); await p.click('dialog button:has-text("Wczytaj")');
await p.waitForSelector('.tasks'); await p.waitForTimeout(400);
ok(await p.locator('.task').count() === 4, 'zakładka Zadania: 4 zadania');
ok((await p.textContent('#tabs')).includes('Zadania 0/4'), 'licznik zadań w zakładce');
ok(await p.locator('#tabs button').count() >= 8, 'zakładki formularzy utworzone (' + await p.locator('#tabs button').count() + ')');
// status i wynik
const t1 = p.locator('.task').first();
await t1.locator('textarea[aria-label="wynik pomiaru / ustalenie"]').fill('12,34'); await t1.locator('textarea[aria-label="jedn."]').fill('m'); await t1.locator('textarea[aria-label="nr zdj."]').fill('101-104');
await t1.locator('button.st.ok').click();
const t2 = p.locator('.task').nth(1); await t2.locator('button.st.no').click(); await t2.locator('textarea[aria-label="dlaczego nie wykonano"]').fill('ślady zamyte deszczem');
ok((await p.textContent('.tsum')).includes('wykonane 1') && (await p.textContent('.tsum')).includes('niewykonane 1'), 'podsumowanie statusów');
// filtr
await p.click('button:has-text("Tylko otwarte")'); ok(await p.locator('.task').count() === 2, 'filtr: tylko otwarte');
await p.click('button:has-text("Wszystkie")');
// panel w formularzu + wypełnione pola
await p.click('#tabs button:has-text("03 ·")'); await p.waitForSelector('.tpanel');
ok(await p.inputValue('[data-id="03.B.1"]') === 'Opel' && await p.locator('[data-id="03.B.10"]').isChecked(), 'formularz 03 wstępnie wypełniony');
ok((await p.textContent('.tpanel')).includes('Sprawdź, czy pojazd po zdarzeniu') && (await p.locator('.tpanel textarea.task-c').first().inputValue()).includes('DOT'), 'panel zadań i przypomnień w formularzu');
// przejście "Do formularza" z zadania
await p.click('#tabs button:has-text("Zadania")'); await p.locator('.task').nth(2).locator('button:has-text("Do formularza")').click(); await p.waitForSelector('.form[data-form="03"]');
ok(true, 'przejście z zadania do formularza');
// własne zadanie
await p.click('#tabs button:has-text("Zadania")'); await p.click('button:has-text("+ Dodaj zadanie")'); await p.fill('dialog textarea', 'Własne zadanie biegłego'); await p.click('dialog button:has-text("Dodaj")');
ok(await p.locator('.task').count() === 5, 'dodanie własnego zadania');
await p.waitForTimeout(700);
// trwałość (nowa strona)
const q = await ctx.newPage(); await q.goto(`http://localhost:${port}/`); await q.waitForSelector('.tasks');
ok(await q.locator('.task').count() === 5 && (await q.textContent('.tsum')).includes('wykonane 1'), 'zadania i statusy po ponownym otwarciu (bufor)');
// eksport i wydruk
const md = await q.evaluate(() => window.__ogl.md());
ok(/Zadania na oględziny – stan wykonania/.test(md) && /wynik: 12,34 m/.test(md) && /zdjęcia: 101-104/.test(md) && /powód: ślady zamyte deszczem/.test(md) && /NIEWYKONANE/.test(md), 'eksport Markdown: stan wykonania zadań');
ok(/Przypomnienia do tego formularza/.test(md) && /BRAK W AKTACH/.test(md), 'eksport: przypomnienia i uwagi ogólne');
// zapis pliku i otwarcie – zadania w pliku
await q.evaluate(() => { navigator.canShare = () => false; });
const [dl] = await Promise.all([q.waitForEvent('download'), q.click('#btn-save')]); await dl.saveAs('/tmp/__w.json');
const j = JSON.parse(fs.readFileSync('/tmp/__w.json', 'utf8')); fs.unlinkSync('/tmp/__w.json');
ok(j.tasks.length === 5 && j.tasks[0].status === 'wykonane' && j.forms.some(f => (f.reminders || []).length), 'plik sprawy zawiera zadania, statusy i przypomnienia');
await q.evaluate(() => window.__ogl.printAll()); await q.emulateMedia({ media: 'print' });
const hasList = await q.evaluate(() => !!document.querySelector('#print-root .ttab'));
ok(hasList, 'wydruk całej sprawy zawiera listę zadań');
console.log('errs', errs); await b.close();
