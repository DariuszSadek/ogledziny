// Silnik renderujący: definicja formularza (JSON) + egzemplarz (dane) -> DOM.
import { createSketch } from './sketch.js';

export const COPYRIGHT = '© 2026 Motoanalityka Dariusz Sadek. Wszelkie prawa zastrzeżone. Kopiowanie, rozpowszechnianie, modyfikowanie i wykorzystywanie wzorów formularzy, w całości lub w części, bez pisemnej zgody autora jest zabronione.';
const FULL = 527.3;

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
export const grow = t => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; };
const pad = n => String(n).padStart(2, '0');
export const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

// ctx: { get(id), set(id,val), toast(msg), getExtra(prefix), addRow(prefix), header(), instLabel }
export function renderForm(def, inst, ctx) {
  const root = h('div', { class: 'form', data: { form: def.id } });
  root.append(h('div', { class: 'titleband' }, h('h1', { text: def.title }), def.subtitle ? h('p', { text: def.subtitle }) : null));
  for (const s of def.sections) root.append(renderSection(def, s, ctx));
  const hd = ctx.header();
  root.append(h('div', { class: 'foot' },
    h('div', { class: 'sygn', text: `Sygn. / nr zlecenia: ${hd.sygnatura || '………………………'}   ·   ${def.id} ${ctx.instLabel || ''}` }),
    h('div', { text: COPYRIGHT })));
  return root;
}

function renderSection(def, s, ctx) {
  const sec = h('section', { class: 'sec', id: `sec-${def.id}-${s.id}` }, h('h2', { text: s.title }));
  for (const b of s.blocks) {
    const el = renderBlock(def, s, b, ctx);
    if (el) sec.append(el);
  }
  sec.append(h('div', { class: 'uwagi' }, fieldEl({ id: `${def.id}.${s.id}.uwagi`, label: 'Uwagi', type: 'text', rows: 2, w: FULL }, ctx, true)));
  return sec;
}

function renderBlock(def, s, b, ctx) {
  switch (b.k) {
    case 'fields': return h('div', { class: 'fields' }, b.items.map(f => fieldEl(f, ctx)));
    case 'group': return groupEl(b, ctx);
    case 'checklist': return h('div', { class: 'checklist' }, b.items.map(c => checkEl(c, ctx)));
    case 'table': return tableEl(b, ctx);
    case 'note': return h('div', { class: 'note', text: b.text });
    case 'subhead': return h('div', { class: 'subhead', text: b.text });
    case 'text': return h('div', { text: b.text });
    case 'sig': { const w = h('div', { class: 'sigs' }); w.append(h('div', { class: 'sig', text: b.text })); return w; }
    case 'sketch': return h('div', {}, h('div', { class: 'lbl', text: b.label }), createSketch(ctx.get(b.id), v => ctx.set(b.id, v)));
  }
}

function checkEl(c, ctx) {
  const i = h('input', { type: 'checkbox', data: { id: c.id } });
  i.checked = ctx.get(c.id) === true;
  i.addEventListener('change', () => ctx.set(c.id, i.checked ? true : ''));
  return h('label', { class: 'chk' }, i, h('span', { class: 'box' }), h('span', { text: c.label }));
}

export function textCtl(f, ctx, labelText) {
  const num = f.type === 'num' || f.type === 'time' || f.type === 'gps';
  let c;
  if (num) { c = h('input', { type: 'text' }); }
  else { c = h('textarea', { rows: f.rows || 1 }); }
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
  if (f.type === 'time') row.append(h('button', { type: 'button', class: 'small', text: 'Teraz', onclick: () => { c.value = nowHM(); ctx.set(f.id, c.value); } }));
  if (f.type === 'gps') row.append(h('button', { type: 'button', class: 'small', text: 'GPS', onclick: () => gps(c, f, ctx) }));
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
    else { const c = textCtl(o, ctx, `${b.label} – ${o.label || 'inne'}`); const w = h('div', { class: 'optin' }, c); opts.append(w); }
  }
  return h('div', { class: 'group' }, h('div', { class: 'glabel', text: b.label }), opts);
}

function tableEl(b, ctx) {
  const cols = b.cols.map(c => Math.max(c.w, 30));
  const tpl = (b.nr !== null && b.nr !== undefined ? '34px ' : '') + cols.map(w => `minmax(0,${Math.round(w)}fr)`).join(' ');
  const wrap = h('div', { class: 'tbl' });
  const head = h('div', { class: 'thead' });
  head.style.gridTemplateColumns = tpl;
  if (b.nr != null) head.append(h('div', { text: b.nr }));
  for (const c of b.cols) head.append(h('div', { text: c.head }));
  wrap.append(head);
  const body = h('div', { class: 'tbody' });
  wrap.append(body);
  const numbered = b.nr != null;
  const mkRow = (cells, rn, rowNo) => {
    const r = h('div', { class: 'trow' });
    r.style.gridTemplateColumns = tpl;
    if (numbered) r.append(h('div', { class: 'rn', text: rn || String(rowNo) }));
    cells.forEach((cell, i) => {
      const col = b.cols[i];
      const td = h('div', { class: 'cell' + (col.type === 'check' ? ' chkcell' : ''), data: { h: col.head } });
      if (cell) {
        if (col.type === 'check') td.append(checkEl({ id: cell.id, label: '' }, ctx));
        else td.append(textCtl({ id: cell.id, type: col.type, label: col.head, rows: 1 }, ctx, `${col.head} – wiersz ${rowNo}`));
      }
      r.append(td);
    });
    body.append(r);
  };
  b.rows.forEach((cells, i) => mkRow(cells, b.rn[i], i + 1));
  const addExtra = n => {
    const rowNo = b.rows.length + n;
    mkRow(b.cols.map((_, ci) => ({ id: `${b.prefix}.r${rowNo}.c${ci + 1}` })), '', rowNo);
  };
  for (let n = 1; n <= ctx.getExtra(b.prefix); n++) addExtra(n);
  wrap.append(h('div', { class: 'addrow' }, h('button', {
    type: 'button', class: 'small', text: 'Dodaj wiersz', onclick: () => {
      const n = ctx.addRow(b.prefix); addExtra(n);
      const last = body.lastElementChild.querySelector('textarea,input'); if (last) last.focus({ preventScroll: false });
    }
  })));
  return wrap;
}
