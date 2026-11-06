// Testy akceptacyjne (sekcja 10 zadania) – część automatyczna. Użycie (z katalogu projektu):
//   node tests/akceptacja.mjs <port_serwera_projektu> <katalog_roboczy>
// Wymaga: playwright-core, Google Chrome, python3. Wynik: docs/raport_testow_akceptacyjnych.md
import { chromium, webkit } from 'playwright-core';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
const port = process.argv[2] || 8765, work = path.resolve(process.argv[3] || './tmp_akceptacja');
const root = process.cwd() + '/';
fs.mkdirSync(work, { recursive: true });
const CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const results = [];
const T = (id, name) => async (fn) => { let ok = false, note = ''; try { const r = await fn(); ok = r === true || (r && r.ok); note = (r && r.note) || ''; } catch (e) { note = 'WYJĄTEK: ' + String(e).split('\n')[0]; } results.push({ id, name, ok, note }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' ' + name + (note ? ' – ' + note : '')); };
const URL0 = `http://localhost:${port}/`;
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

// ---------- T1: tryb samolotowy ----------
await T('A1', 'Tryb samolotowy: otwarcie aplikacji, wypełnienie, zapis pliku')(async () => {
  const b = await chromium.launch({ executablePath: CH, headless: true, args: ['--disable-gpu', '--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 1000, height: 1200 }, acceptDownloads: true });
  const p = await ctx.newPage();
  await p.goto(URL0); await p.waitForSelector('text=Nowa sprawa'); await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(800);
  await ctx.setOffline(true);
  const q = await ctx.newPage(); await q.goto(URL0); await q.waitForSelector('text=Nowa sprawa', { timeout: 8000 });
  await q.click('text=Nowa sprawa'); await q.waitForSelector('.titleband');
  await q.fill('[data-id="01.A.6"]', 'Offline: Kielce'); await q.locator('[data-id="01.A.11"]').check({ force: true });
  await q.click('#tabs button:has-text("+ Formularz")'); await q.click('dialog .pick button:has-text("03 ·")'); await q.click('dialog button:has-text("Dodaj wybrany")');
  await q.waitForSelector('.form[data-form="03"]');
  const spot = q.locator('.form[data-form="03"] .spot input[type=checkbox]').first(); await spot.check({ force: true });
  await q.evaluate(() => { navigator.canShare = () => false; });
  const [dl] = await Promise.all([q.waitForEvent('download'), q.click('#btn-save')]);
  const f = path.join(work, 'offline.json'); await dl.saveAs(f);
  const j = readJson(f); await b.close();
  const d1 = j.forms[0].data;
  return { ok: d1['01.A.6'] === 'Offline: Kielce' && d1['01.A.11'] === true && j.forms.length === 2 && Object.keys(j.forms[1].data).length === 1, note: `plik ${dl.suggestedFilename()}, ${j.forms.length} formularze` };
});

// ---------- T2: zamknięcie i ponowne otwarcie (trwałość bufora na dysku) ----------
await T('A2', 'Zamknięcie przeglądarki i ponowne otwarcie: dane z bufora na miejscu')(async () => {
  const ud = path.join(work, 'profil'); fs.rmSync(ud, { recursive: true, force: true });
  let c = await chromium.launchPersistentContext(ud, { executablePath: CH, headless: true, args: ['--disable-gpu', '--no-sandbox'] });
  let p = c.pages()[0] || await c.newPage(); await p.goto(URL0); await p.waitForSelector('text=Nowa sprawa'); await p.click('text=Nowa sprawa'); await p.waitForSelector('.titleband');
  await p.fill('[data-id="01.C.16"]', '7,5'); await p.fill('[data-id="01.B.22"]', '40.5'); await p.locator('[data-id="01.C.1"]').first().check({ force: true }).catch(() => { });
  await p.locator('#sec-01-G button:has-text("Dodaj wiersz")').click(); await p.fill('[data-id="01.G.t1.r29.c1"]', 'wiersz dodany');
  await p.waitForTimeout(700); await c.close();
  c = await chromium.launchPersistentContext(ud, { executablePath: CH, headless: true, args: ['--disable-gpu', '--no-sandbox'] });
  p = c.pages()[0] || await c.newPage(); await p.goto(URL0); await p.waitForSelector('.titleband', { timeout: 8000 });
  const r = [await p.inputValue('[data-id="01.C.16"]'), await p.inputValue('[data-id="01.B.22"]'), await p.inputValue('[data-id="01.G.t1.r29.c1"]')];
  await c.close();
  return { ok: r[0] === '7,5' && r[1] === '40.5' && r[2] === 'wiersz dodany', note: 'przecinek i kropka zachowane dosłownie; wiersz dodany' };
});

// ---------- T3: plik z „iPada” otwiera się na „MacBooku” bez strat ----------
await T('A3', 'Plik zapisany na jednym urządzeniu otwiera się na innym bez strat (wszystkie 10 formularzy)')(async () => {
  const b = await chromium.launch({ executablePath: CH, headless: true, args: ['--disable-gpu', '--no-sandbox'] });
  const mk = async () => { const x = await b.newContext({ viewport: { width: 1000, height: 1200 }, acceptDownloads: true }); const p = await x.newPage(); await p.goto(URL0); await p.waitForSelector('text=Nowa sprawa'); return p; };
  const A = await mk(); await A.click('text=Nowa sprawa'); await A.waitForSelector('.titleband');
  await A.click('#tabs button:has-text("Sprawa")'); await A.fill('input[aria-label="Sygnatura / nr zlecenia"]', 'III K 5/26');
  const typed = {};
  for (const id of ['00', '02', '03', '04', '05', '06', '07', '08', '09']) {
    await A.click('#tabs button:has-text("+ Formularz")'); await A.click(`dialog .pick button:has-text("${id} ·")`); await A.click('dialog button:has-text("Dodaj wybrany")'); await A.waitForSelector(`.form[data-form="${id}"]`);
    const t = A.locator(`.form[data-form="${id}"] textarea[data-id]:not([data-id$=".uwagi"])`).first(), c = A.locator(`.form[data-form="${id}"] input[type=checkbox][data-id]`).nth(2);
    typed[id] = [await t.getAttribute('data-id'), await c.getAttribute('data-id')]; await t.fill(`wpis ${id}: 3,14 ąęłó`); await c.check({ force: true });
  }
  await A.waitForTimeout(600); await A.evaluate(() => { navigator.canShare = () => false; });
  const [dl] = await Promise.all([A.waitForEvent('download'), A.click('#btn-save')]); const f = path.join(work, 'przenosny.json'); await dl.saveAs(f);
  const B = await mk(); await B.setInputFiles('#file-input', f); await B.waitForTimeout(700);
  const noReport = await B.locator('dialog[open]').count() === 0;
  await B.evaluate(() => { navigator.canShare = () => false; }); const [dl2] = await Promise.all([B.waitForEvent('download'), B.click('#btn-save')]); const f2 = path.join(work, 'przenosny2.json'); await dl2.saveAs(f2);
  await b.close();
  const a = readJson(f), c = readJson(f2); const strip = o => ({ ...o, savedToFile: 0, appVersion: 0 });
  const same = JSON.stringify(strip(a)) === JSON.stringify(strip(c));
  return { ok: noReport && same && a.forms.length === 10, note: `${a.forms.length} formularzy, ${Math.round(fs.statSync(f).size / 1024)} kB, zapis→otwarcie→zapis identyczny: ${same}` };
});

// ---------- T4: starsza wersja definicji ----------
await T('A4', 'Plik ze starszej wersji definicji otwiera się po aktualizacji (raport, brak strat po cichu)')(async () => {
  const j = readJson(path.join(work, 'przenosny.json'));
  j.defVersions['01'] = '0.9.0'; j.forms.find(f => f.formId === '01').data['01.Z.99'] = 'pole z dawnej wersji';
  const old = path.join(work, 'stary.json'); fs.writeFileSync(old, JSON.stringify(j));
  const b = await chromium.launch({ executablePath: CH, headless: true, args: ['--disable-gpu', '--no-sandbox'] });
  const p = await (await b.newContext({ acceptDownloads: true })).newPage(); await p.goto(URL0); await p.waitForSelector('text=Nowa sprawa');
  await p.setInputFiles('#file-input', old); await p.waitForSelector('dialog[open]');
  const rep = await p.textContent('dialog'); await p.click('dialog button:has-text("OK")');
  await p.evaluate(() => { navigator.canShare = () => false; }); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#btn-save')]); const f = path.join(work, 'stary_zapis.json'); await dl.saveAs(f); await b.close();
  const r = readJson(f), f01 = r.forms.find(x => x.formId === '01');
  const unit = execSync('node tests/migrate_alias.mjs', { cwd: process.cwd() }).toString(), mig = execSync('node tests/migrate_poprzednia_wersja.mjs HEAD~1', { cwd: process.cwd() }).toString();
  return { ok: /0\.9\.0/.test(rep) && /01\.Z\.99/.test(rep) && f01.orphans['01.Z.99'] === 'pole z dawnej wersji' && !/FAIL/.test(unit + mig), note: 'raport pokazuje zmianę wersji i pole nieprzeniesione; pole zachowane w pliku; testy aliasów i migracji 00 (poprzednia wersja) OK' };
});

// ---------- T5: raport zgodności ----------
await T('A5', 'Raport zgodności: 0 brakujących pól')(async () => {
  const r = readJson(root + 'docs/raport_zgodnosci.json');
  return { ok: r.ok === true && r.total.missing === 0, note: `pola PDF ${r.total.pdf}, w aplikacji ${r.total.dom - r.total.app_only}, brakujących ${r.total.missing}` };
});

// ---------- T6: aktualizacja bez utraty danych ----------
await T('A6', 'Aktualizacja aplikacji: baner „dostępna nowa wersja”, nowa wersja cache, dane z bufora zachowane')(async () => {
  const dir = path.join(work, 'kopia'); fs.rmSync(dir, { recursive: true, force: true });
  execSync(`rsync -a --exclude .git --exclude tests --exclude tmp_akceptacja "${root}" "${dir}/"`);
  const srv = spawn('python3', ['-m', 'http.server', '8771'], { cwd: dir, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1200));
  try {
    const b = await chromium.launch({ executablePath: CH, headless: true, args: ['--disable-gpu', '--no-sandbox'] });
    const p = await (await b.newContext({ viewport: { width: 1000, height: 1200 } })).newPage(); await p.goto('http://localhost:8771/'); await p.waitForSelector('text=Nowa sprawa');
    await p.click('text=Nowa sprawa'); await p.waitForSelector('.titleband'); await p.fill('[data-id="01.A.6"]', 'przed aktualizacją'); await p.waitForTimeout(800);
    await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(500);
    const v1 = await p.evaluate(async () => (await caches.keys()).join(','));
    fs.appendFileSync(path.join(dir, 'css/app.css'), '\n/* zmiana testowa */\n'); execSync('python3 tools/build.py 9.9.9', { cwd: dir });
    await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); }); await p.waitForTimeout(2000);
    const banner = await p.locator('#update-banner').isVisible();
    await p.click('#update-btn'); await p.waitForTimeout(2500);
    await p.waitForSelector('.titleband', { timeout: 8000 });
    const val = await p.inputValue('[data-id="01.A.6"]'); const v2 = await p.evaluate(async () => (await caches.keys()).join(',')); const ver = await p.evaluate(async () => (await import('/js/version.js')).APP_VERSION);
    await b.close();
    const okAll = banner && val === 'przed aktualizacją' && v1 !== v2 && /9\.9\.9/.test(v2) && /^9\.9\.9/.test(ver);
    return { ok: okAll, note: `cache ${v1} → ${v2}; baner: ${banner}; dane po aktualizacji: „${val}”; wersja w aplikacji: ${ver}` };
  } finally { srv.kill(); }
});

// ---------- T7: brak ruchu sieciowego poza własnymi plikami ----------
await T('A7', 'Prywatność: zero żądań poza własnym serwerem; polityka CSP blokuje połączenia zewnętrzne')(async () => {
  const b = await chromium.launch({ executablePath: CH, headless: true, args: ['--disable-gpu', '--no-sandbox'] });
  const p = await (await b.newContext()).newPage(); const reqs = [];
  p.on('request', r => reqs.push(r.url()));
  await p.goto(URL0); await p.waitForSelector('text=Nowa sprawa'); await p.click('text=Nowa sprawa'); await p.waitForSelector('.titleband');
  await p.click('#tabs button:has-text("+ Formularz")'); await p.click('dialog .pick button:has-text("03 ·")'); await p.click('dialog button:has-text("Dodaj wybrany")'); await p.waitForTimeout(800);
  const ext = reqs.filter(u => !u.startsWith(URL0) && !u.startsWith('data:') && !u.startsWith('blob:'));
  const blocked = await p.evaluate(async () => { try { await fetch('https://example.com/'); return false; } catch { return true; } });
  const csp = await p.evaluate(() => document.querySelector('meta[http-equiv="Content-Security-Policy"]').content);
  await b.close();
  return { ok: ext.length === 0 && blocked && /default-src 'none'/.test(csp) && /connect-src 'self'/.test(csp), note: `żądań zewnętrznych: ${ext.length}; fetch na example.com zablokowany: ${blocked}` };
});

// ---------- T8: repozytorium bez danych spraw ----------
await T('A8', 'Repozytorium: brak plików spraw, PDF i danych osobowych (kontrola przed commitem)')(async () => {
  const files = execSync('git ls-files', { cwd: process.cwd() }).toString().split('\n').filter(Boolean);
  const bad = files.filter(f => (/\.(pdf|heic|jpe?g)$/i.test(f)) || (f.endsWith('.json') && !/^(forms\/\d\d\.json|docs\/slownik_pol\.json|docs\/raport_zgodnosci\.json)$/.test(f)));
  const hook = fs.existsSync(root + '.git/hooks/pre-commit');
  let leak = false; for (const f of files.filter(f => /\.(json|md|js|html)$/.test(f))) { const t = fs.readFileSync(root + f, 'utf8'); if (/"app"\s*:\s*"ogledziny"[\s\S]{0,400}"forms"\s*:\s*\[/.test(t) && !f.startsWith('tests/')) leak = true; }
  return { ok: !bad.length && hook && !leak, note: `${files.length} plików w repozytorium, niedozwolonych: ${bad.length}, hook pre-commit: ${hook}` };
});

// ---------- T9: wydruk i eksport ----------
await T('A9', 'Wydruk do PDF i eksport dla Claude')(async () => {
  const out = execSync(`node tests/e2e_wydruk_eksport.mjs ${port} "${work}"`, { cwd: process.cwd() }).toString();
  return { ok: !/FAIL/.test(out), note: out.split('\n').filter(l => /PDF|liczba pól/.test(l)).map(l => l.replace('PASS ', '')).join('; ') };
});

// ---------- T10: silnik Safari (WebKit) – wszystkie formularze renderują się bez błędów ----------
await T('A10', 'Silnik Safari (WebKit): wszystkie formularze renderują się, liczba pól zgodna z definicją')(async () => {
  const b = await webkit.launch(); const p = await (await b.newContext({ viewport: { width: 834, height: 1194 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
  await p.goto(URL0); await p.waitForSelector('text=Nowa sprawa'); await p.click('text=Nowa sprawa'); await p.waitForSelector('.titleband');
  let bad = [];
  for (const id of ['00', '02', '03', '04', '05', '06', '07', '08', '09']) {
    await p.click('#tabs button:has-text("+ Formularz")'); await p.click(`dialog .pick button:has-text("${id} ·")`); await p.click('dialog button:has-text("Dodaj wybrany")'); await p.waitForSelector(`.form[data-form="${id}"]`);
    const n = await p.locator(`.form[data-form="${id}"] [data-id]`).count(); const def = readJson(root + `forms/${id}.json`);
    let exp = 0; const w = o => { if (Array.isArray(o)) o.forEach(w); else if (o && typeof o === 'object') { if (o.id && o.pdf) exp++; Object.values(o).forEach(w); } }; w(def);
    const uw = def.sections.filter(s => s.title).length; if (n !== exp + uw) bad.push(`${id}: ${n}≠${exp + uw}`);
  }
  await b.close();
  return { ok: !bad.length && !errs.length, note: bad.join(', ') || 'zgodne' };
});

// ---------- raport ----------
const pass = results.filter(r => r.ok).length;
const md = ['# Raport testów akceptacyjnych (część automatyczna)', '', `Wygenerowano: ${new Date().toISOString()} (tests/akceptacja.mjs). Wynik: **${pass} / ${results.length}** zaliczonych.`, '',
  'Testy automatyczne wykonano na MacBooku w Chrome i silniku Safari (WebKit), nie na iPadzie. Testy na urządzeniach są w instrukcji (część „Próba w terenie”).', '',
  '| Nr | Test | Wynik | Szczegóły |', '|---|---|---|---|', ...results.map(r => `| ${r.id} | ${r.name} | ${r.ok ? 'PASS' : '**FAIL**'} | ${r.note.replace(/\|/g, '/')} |`), '',
  '## Odniesienie do sekcji 10 zadania', '',
  '- Tryb samolotowy: otwarcie, wypełnienie, zapis pliku → A1 (offline w Chrome) + próba na iPadzie (instrukcja).',
  '- Zamknięcie i ponowne otwarcie: dane z bufora → A2 (zamknięcie przeglądarki, nowy start na tym samym profilu) + próba na iPadzie.',
  '- Plik z iPada na MacBooku bez strat → A3 (zapis i odczyt w osobnych profilach; zapis→otwarcie→zapis identyczny) + próba międzyurządzeniowa (instrukcja).',
  '- Starsza wersja definicji po aktualizacji → A4 i A6.',
  '- Raport zgodności: 0 brakujących pól → A5.', ''];
fs.writeFileSync(root + 'docs/raport_testow_akceptacyjnych.md', md.join('\n') + '\n');
console.log(`\n${pass}/${results.length}`); process.exitCode = pass === results.length ? 0 : 1;
