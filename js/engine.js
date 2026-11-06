// Silnik renderujący: definicja formularza (JSON) + egzemplarz (dane) -> DOM.
import { createSketch, sketchImage } from './sketch.js';

export const COPYRIGHT = '© 2026 Motoanalityka Dariusz Sadek. Wszelkie prawa zastrzeżone. Kopiowanie, rozpowszechnianie, modyfikowanie i wykorzystywanie wzorów formularzy, w całości lub w części, bez pisemnej zgody autora jest zabronione.';
const FULL = 527.3;
const NS = 'http://www.w3.org/2000/svg';

export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'data') for (const [dk, dv] of Object.entries(v)) e.dataset[dk] = dv;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}
const sv = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); return e; };
export const grow = t => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; };
const pad = n => String(n).padStart(2, '0');
export const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

// ctx: { get(id), set(id,val), toast(msg), getExtra(prefix), addRow(prefix), header(), instLabel }
export function renderForm(def, inst, ctx) {
  const root = h('div', { class: 'form', data: { form: def.id } });
  root.append(h('div', { class: 'titleband' }, h('h1', { text: def.title }), def.subtitle ? h('p', { text: def.subtitle }) : null));
  for (const s of def.sections) root.append(renderSection(def, s, ctx));
  if (ctx.print) return root;
  const hd = ctx.header();
  root.append(h('div', { class: 'foot' },
    h('div', { class: 'sygn', text: `Sygn. / nr zlecenia: ${hd.sygnatura || '………………………'}   ·   ${def.id} ${ctx.instLabel || ''}` }),
    h('div', { text: COPYRIGHT })));
  return root;
}

function renderSection(def, s, ctx) {
  const intro = !s.title;
  const sec = h('section', { class: 'sec' + (intro ? ' intro' : ''), id: `sec-${def.id}-${s.id}` }, intro ? null : h('h2', { text: s.title }));
  for (const b of s.blocks) {
    const el = renderBlock(def, s, b, ctx);
    if (el) sec.append(el);
  }
  if (!intro && (!ctx.print || ctx.get(`${def.id}.${s.id}.uwagi`))) sec.append(h('div', { class: 'uwagi' }, fieldEl({ id: `${def.id}.${s.id}.uwagi`, label: 'Uwagi', type: 'text', rows: 2, w: FULL }, ctx, true)));
  return sec;
}

function renderBlock(def, s, b, ctx) {
  switch (b.k) {
    case 'fields': return h('div', { class: 'fields' }, b.items.map(f => fieldEl(f, ctx)));
    case 'group': return groupEl(b, ctx);
    case 'checklist': return h('div', { class: 'checklist' }, b.items.map(c => checkEl(c, ctx)));
    case 'table': return tableEl(b, ctx);
    case 'stable': return stableEl(b);
    case 'figure': return figureEl(b, ctx);
    case 'note': return h('div', { class: 'note', text: b.text });
    case 'subhead': return h('div', { class: 'subhead', text: b.text });
    case 'text': return h('p', { class: 'para' }, b.runs ? b.runs.map(r => r.b ? h('strong', { text: r.t }) : r.t) : b.text);
    case 'sig': { const w = h('div', { class: 'sigs' }); w.append(h('div', { class: 'sig', text: b.text })); return w; }
    case 'sketch': return h('div', { class: 'sketchbox' }, h('div', { class: 'lbl', text: b.label }), ctx.print ? sketchImage(ctx.get(b.id)) : createSketch(ctx.get(b.id), v => ctx.set(b.id, v)));
  }
}

function checkEl(c, ctx, cls = '') {
  if (ctx.print) return h('span', { class: 'chk pchkw ' + cls }, h('span', { class: 'pchk' + (ctx.get(c.id) === true ? ' on' : '') }), c.label ? h('span', { text: c.label }) : null);
  const i = h('input', { type: 'checkbox', data: { id: c.id } });
  i.checked = ctx.get(c.id) === true;
  if (c.aria) i.setAttribute('aria-label', c.aria);
  i.addEventListener('change', () => ctx.set(c.id, i.checked ? true : ''));
  return h('label', { class: 'chk ' + cls }, i, h('span', { class: 'box' }), c.label ? h('span', { text: c.label }) : null);
}

export function textCtl(f, ctx, labelText) {
  if (ctx.print) return h('div', { class: 'pval', text: String(ctx.get(f.id) ?? '') });
  const num = f.type === 'num' || f.type === 'time' || f.type === 'gps';
  const c = num ? h('input', { type: 'text' }) : h('textarea', { rows: f.rows || 1 });
  c.value = ctx.get(f.id) ?? '';
  c.dataset.id = f.id;
  c.setAttribute('aria-label', labelText || f.label || f.id);
  c.setAttribute('autocomplete', 'off'); c.setAttribute('autocorrect', 'on'); c.setAttribute('spellcheck', 'true');
  if (f.type === 'num') c.setAttribute('inputmode', /temp|pochyl|°/i.test(f.label || '') ? 'text' : 'decimal');
  if (f.type === 'time') { c.setAttribute('inputmode', 'numeric'); c.placeholder = 'gg:mm'; }
  c.addEventListener('input', () => { ctx.set(f.id, c.value); if (c.tagName === 'TEXTAREA') grow(c); });
  return c;
}

function fieldEl(f, ctx, bare) {
  const c = textCtl(f, ctx);
  const row = h('div', { class: 'ctl-row' }, c);
  if (!ctx.print && f.type === 'time') row.append(h('button', { type: 'button', class: 'small', text: 'Teraz', onclick: () => { c.value = nowHM(); ctx.set(f.id, c.value); } }));
  if (!ctx.print && f.type === 'gps') row.append(h('button', { type: 'button', class: 'small', text: 'GPS', onclick: () => gps(c, f, ctx) }));
  c.style.flex = '1 1 auto';
  const wrap = h('div', { class: 'fld' }, f.label ? h('label', { text: f.label }) : null, row);
  const pct = Math.min(100, (f.w || FULL) / FULL * 100);
  wrap.style.flex = `1 1 calc(${pct}% - 8px)`;
  wrap.style.maxWidth = '100%';
  if (f.type === 'time' || f.type === 'gps') wrap.style.minWidth = '200px';
  if (bare) wrap.style.flex = '1 1 100%';
  return wrap;
}

function gps(c, f, ctx) {
  if (!navigator.geolocation) return ctx.toast('Brak dostępu do lokalizacji w tym urządzeniu.');
  ctx.toast('Ustalanie położenia…');
  navigator.geolocation.getCurrentPosition(p => {
    c.value = `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`;
    ctx.set(f.id, c.value);
    ctx.toast(`Zapisano współrzędne (dokładność ok. ${Math.round(p.coords.accuracy)} m).`);
  }, e => ctx.toast('GPS: ' + (e.code === 1 ? 'brak zgody na lokalizację (Ustawienia → Prywatność → Lokalizacja).' : 'nie udało się ustalić położenia.')),
    { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 });
}

function groupEl(b, ctx) {
  const opts = h('div', { class: 'opts' });
  for (const o of b.items) {
    if (o.type === 'check') opts.append(checkEl(o, ctx));
    else opts.append(h('div', { class: 'optin' }, textCtl(o, ctx, `${b.label} – ${o.label || 'inne'}`)));
  }
  return h('div', { class: 'group' }, h('div', { class: 'glabel', text: b.label }), opts);
}

function tableEl(b, ctx) {
  const lead = b.lead != null || (b.labels || []).some(Boolean);
  const numeric = lead && (b.labels || []).every(l => /^\d+$/.test(l) || l === '');
  const leadCol = !lead ? '' : (b.leadw < 40 ? '34px ' : `minmax(150px,${Math.round(b.leadw)}fr) `);
  const cw = c => Math.max(44, Math.round(Math.max(...c.head.split(/\s+/).map(w => w.length), 1) * 7.6 + 8));
  const cols = b.cols.map(c => c.type === 'check' ? cw(c) + 'px' : `minmax(0,${Math.max(Math.round(c.w), 30)}fr)`);
  const tpl = leadCol + cols.join(' ');
  const wrap = h('div', { class: 'tbl' });
  const head = h('div', { class: 'thead' });
  head.style.gridTemplateColumns = tpl;
  const off = lead ? 1 : 0, gs = b.groups || [];
  const inGroup = i => gs.some(g => i >= g.c0 && i <= g.c1);
  const hc = (txt, col, rows, span = 1) => { const d = h('div', { text: txt }); d.style.gridColumn = `${col} / span ${span}`; d.style.gridRow = rows; return d; };
  if (lead) head.append(hc(b.lead || '', 1, gs.length ? '1 / span 2' : '1'));
  for (const g of gs) head.append(hc(g.t, g.c0 + 1 + off, '1', g.c1 - g.c0 + 1));
  b.cols.forEach((c, i) => head.append(hc(c.head, i + 1 + off, gs.length ? (inGroup(i) ? '2' : '1 / span 2') : '1')));
  if (gs.length) head.classList.add('grouped');
  wrap.append(head);
  const body = h('div', { class: 'tbody' });
  wrap.append(body);
  const mkRow = (cells, label, rowNo) => {
    const r = h('div', { class: 'trow' });
    r.style.gridTemplateColumns = tpl;
    if (lead) r.append(h('div', { class: 'rn' + (b.leadw < 40 ? '' : ' rlabel'), text: label || (numeric ? String(rowNo) : '') }));
    cells.forEach((cell, i) => {
      const col = b.cols[i];
      const hd = col.head.replace(/\n/g, ' ');
      const td = h('div', { class: 'cell' + (col.type === 'check' ? ' chkcell' : ''), data: { h: hd } });
      if (cell) {
        if (col.type === 'check') td.append(checkEl({ id: cell.id, label: '', aria: `${hd} – ${label || 'wiersz ' + rowNo}` }, ctx));
        else td.append(textCtl({ id: cell.id, type: col.type, label: hd, rows: 1 }, ctx, `${hd} – ${label || 'wiersz ' + rowNo}`));
      }
      r.append(td);
    });
    body.append(r);
  };
  b.rows.forEach((cells, i) => mkRow(cells, (b.labels || [])[i], i + 1));
  const addExtra = n => {
    const rowNo = b.rows.length + n;
    mkRow(b.cols.map((_, ci) => ({ id: `${b.prefix}.r${rowNo}.c${ci + 1}` })), '', rowNo);
  };
  for (let n = 1; n <= ctx.getExtra(b.prefix); n++) addExtra(n);
  if (!ctx.print) wrap.append(h('div', { class: 'addrow' }, h('button', {
    type: 'button', class: 'small', text: 'Dodaj wiersz', onclick: () => {
      const n = ctx.addRow(b.prefix); addExtra(n);
      const last = body.lastElementChild.querySelector('textarea,input'); if (last) last.focus();
    }
  })));
  return wrap;
}

// Rysunek wektorowy z PDF (SVG) + klikalne strefy / pola w położeniach pól PDF.
function figureEl(b, ctx) {
  const [vx, vy, vw, vh] = b.vb;
  const svg = sv('svg', { viewBox: `${vx} ${vy} ${vw} ${vh}`, class: 'figsvg', 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' });
  for (const s of b.shapes) {
    const common = { fill: s.f || 'none', stroke: s.s || 'none', 'stroke-width': s.s ? s.w : null, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' };
    if (s.eo) common['fill-rule'] = 'evenodd';
    if (s.da) common['stroke-dasharray'] = s.da.join(' ');
    svg.append(s.t === 'r' ? sv('rect', { x: s.x, y: s.y, width: s.W, height: s.H, ...common }) : sv('path', { d: s.d, ...common }));
  }
  for (const t of b.texts) {
    const e = sv('text', { x: t.x, y: t.y, 'font-size': t.sz, 'font-weight': t.b ? 700 : 400, 'font-style': t.i ? 'italic' : 'normal', fill: t.c, 'font-family': 'Libre Baskerville, Georgia, serif' });
    e.textContent = t.t; svg.append(e);
  }
  const box = h('div', { class: 'fig' }, svg);
  box.style.aspectRatio = `${vw} / ${vh}`;
  for (const sp of b.spots) {
    const left = ((sp.x - vx) / vw * 100) + '%', top = ((sp.y - vy) / vh * 100) + '%';
    let el;
    if (sp.type === 'check') {
      el = checkEl({ id: sp.id, label: '', aria: sp.label || sp.id }, ctx, 'spot');
    } else {
      const c = ctx.print ? h('div', { class: 'pval spot-in', text: String(ctx.get(sp.id) ?? '') }) : h('textarea', { rows: 1, class: 'spot-in' });
      if (!ctx.print) { c.value = ctx.get(sp.id) ?? ''; c.dataset.id = sp.id; c.setAttribute('aria-label', sp.label || sp.id); c.setAttribute('autocomplete', 'off'); c.addEventListener('input', () => ctx.set(sp.id, c.value)); }
      el = h('div', { class: 'spot spot-text' }, c);
      el.style.width = Math.max(sp.w / vw * 100, 6) + '%';
      el.style.height = (sp.h / vh * 100) + '%';
    }
    el.style.left = left; el.style.top = top;
    box.append(el);
  }
  return h('div', { class: 'figwrap' }, box);
}

// Tabela statyczna (tylko tekst), np. wymagane wskaźniki skuteczności hamowania.
function stableEl(b) {
  const n = b.heads.length;
  const tpl = `minmax(0,1.5fr) ${Array(n - 1).fill('minmax(0,1fr)').join(' ')}`;
  const wrap = h('div', { class: 'tbl stbl' });
  const head = h('div', { class: 'thead' }); head.style.gridTemplateColumns = tpl;
  for (const t of b.heads) head.append(h('div', { text: t }));
  wrap.append(head);
  for (const row of b.rows) {
    const r = h('div', { class: 'trow' }); r.style.gridTemplateColumns = tpl;
    row.forEach((c, i) => r.append(h('div', { class: 'cell', data: { h: b.heads[i] }, text: c })));
    wrap.append(r);
  }
  return wrap;
}
