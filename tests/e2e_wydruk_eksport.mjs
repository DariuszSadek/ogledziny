// Wydruk do PDF (Chrome, media print) i eksport Markdown na przykładowej sprawie z wieloma formularzami.
// Użycie (z katalogu projektu): node tests/e2e_wydruk_eksport.mjs <port> <katalog_wyjściowy>
import { chromium } from 'playwright-core';
import fs from 'fs';
const port = process.argv[2] || 8765, outDir = process.argv[3] || '.';
const root = process.cwd() + '/';
const lorem = 'Opis testowy – dłuższy tekst zawijany w kilku liniach, polskie znaki: ąćęłńóśźż.';
const forms = [];
for (const id of ['00', '01', '03', '07', '09']) {
  const def = JSON.parse(fs.readFileSync(root + `forms/${id}.json`, 'utf8')); const data = {};
  for (const s of def.sections) {
    let m = 0;
    for (const b of s.blocks) {
      const items = ['fields', 'group', 'checklist'].includes(b.k) ? b.items : [];
      for (const f of items) { m++; if (f.type === 'check' || b.k === 'checklist') { if (m % 3 === 0) data[f.id] = true; } else if (m % 2 === 0) data[f.id] = f.type === 'num' ? '12,5' : f.type === 'time' ? '12:30' : (m % 4 === 0 ? lorem : 'Wartość ' + f.id); }
      if (b.k === 'table') b.rows.slice(0, 3).forEach((r, ri) => r.forEach((c, ci) => { if (c && b.cols[ci].type !== 'check') data[c.id] = ri ? `1,${ci}` : 'tekst'; }));
      if (b.k === 'figure') b.spots.forEach((sp, i) => { if (i % 7 === 0) data[sp.id] = sp.type === 'check' ? true : '118/124'; });
      if (b.k === 'sketch') data[b.id] = { v: 1, ar: 1.119, strokes: [{ t: 'pen', s: 0.0042, p: [[0.1, 0.1], [0.5, 0.2], [0.8, 0.6]] }] };
    }
    if (s.title) data[`${id}.${s.id}.uwagi`] = 'Uwaga do sekcji ' + s.id + ': ' + lorem;
  }
  forms.push({ iid: 'i' + id, formId: id, label: `${id} 1`, data, extra: {}, orphans: {} });
}
const c = { app: 'ogledziny', schema: 1, appVersion: 't', id: 't', created: new Date().toISOString(), defVersions: {}, header: { sygnatura: 'II K 123/26', organ: 'Sąd Rejonowy w Kielcach', data: '2026-11-06' }, forms, tasks: [], savedToFile: null };
fs.writeFileSync(`${outDir}/testcase.json`, JSON.stringify(c));
const ok = (v, m) => { console.log((v ? 'PASS ' : 'FAIL ') + m); if (!v) process.exitCode = 1; };
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1000, height: 1200 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
await p.goto(`http://localhost:${port}/`); await p.waitForSelector('text=Nowa sprawa');
await p.setInputFiles('#file-input', `${outDir}/testcase.json`); await p.waitForTimeout(800);
await p.evaluate(() => window.__ogl.printAll()); await p.emulateMedia({ media: 'print' });
await p.pdf({ path: `${outDir}/print_all.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
const md = await p.evaluate(() => window.__ogl.md()); fs.writeFileSync(`${outDir}/export.md`, md);
ok(fs.statSync(`${outDir}/print_all.pdf`).size > 100000, 'PDF wygenerowany (' + Math.round(fs.statSync(`${outDir}/print_all.pdf`).size / 1024) + ' kB)');
ok(/\[00\.A\.2\]/.test(md) && /II K 123\/26/.test(md) && /Zaznaczone na rysunku/.test(md) && /Szkic sytuacyjny/.test(md), 'Markdown: identyfikatory pól, nagłówek, rysunek, szkic');
ok(!/undefined|\[object Object\]|NaN/.test(md), 'Markdown bez „undefined/NaN”');
const ids = [...md.matchAll(/`\[([0-9]{2}\.[^\]]+)\]`/g)].map(m => m[1]);
ok(ids.length > 500, 'liczba pól w eksporcie: ' + ids.length);
console.log('errs', errs); await b.close();
