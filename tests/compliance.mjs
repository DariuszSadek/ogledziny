// Zgodność aplikacji z wzorami: renderuje każdy formularz w przeglądarce i zestawia elementy z DOM z definicją (id -> pole PDF).
// Użycie: node tests/compliance.mjs <port> <out.json>   (wymaga playwright-core i Chrome)
import { chromium } from 'playwright-core';
import fs from 'fs';
const port = process.argv[2] || 8765, out = process.argv[3] || 'compliance_dom.json';
const root = new URL('..', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--disable-gpu', '--no-sandbox'] });
const p = await (await b.newContext({ viewport: { width: 1000, height: 1200 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push('' + e));
await p.goto(`http://localhost:${port}/`); await p.click('text=Nowa sprawa'); await p.waitForSelector('.titleband');
const res = {};
for (const id of ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09']) {
  await p.click('#tabs button:has-text("+ Formularz")'); await p.click(`dialog .pick button:has-text("${id} ·")`); await p.click('dialog button:has-text("Dodaj wybrany")');
  await p.waitForSelector(`.form[data-form="${id}"]`);
  const t0 = Date.now();
  const dom = await p.evaluate(fid => {
    const root = document.querySelector(`.form[data-form="${fid}"]`);
    const out = {};
    root.querySelectorAll('[data-id]').forEach(e => { out[e.dataset.id] = e.tagName === 'INPUT' && e.type === 'checkbox' ? 'check' : 'text'; });
    return { ids: out, sketch: root.querySelectorAll('canvas.sketch').length, svgs: root.querySelectorAll('svg.figsvg').length };
  }, id);
  const def = JSON.parse(fs.readFileSync(`${root}forms/${id}.json`, 'utf8'));
  const exp = {};
  const walk = o => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object') {
      if (o.id && o.pdf) exp[o.id] = o.pdf;
      Object.values(o).forEach(walk);
    }
  };
  walk(def);
  res[id] = { domMs: Date.now() - t0, domIds: Object.keys(dom.ids).length, defIds: Object.keys(exp).length, domMissing: Object.keys(exp).filter(k => !(k in dom.ids)), domExtra: Object.keys(dom.ids).filter(k => !(k in exp) && !k.endsWith('.uwagi')), uwagi: Object.keys(dom.ids).filter(k => k.endsWith('.uwagi')).length, checks: Object.values(dom.ids).filter(v => v === 'check').length, sketches: dom.sketch, figures: dom.svgs, domTypes: dom.ids, pdfOf: exp };
  console.log(id, 'DOM', Object.keys(dom.ids).length, 'def', Object.keys(exp).length, 'ms', res[id].domMs);
}
res.errors = errs;
fs.writeFileSync(out, JSON.stringify(res));
await b.close();
