// Przeglądarka materiału z akt w terenie: pełny ekran, powiększanie/przesuwanie, obrót, adnotacje (Apple Pencil),
// punkty P1, P2…, tabela „Punkty i pomiary”. Obraz pozostaje bez zmian – adnotacje to osobna warstwa wektorowa.
import { h, grow } from './engine.js';
import { drawAnn, emptyAnn, COLORS } from './attach.js';

const TOOLS = [['hand', 'Ręka'], ['pen', 'Pióro'], ['point', 'Punkt'], ['line', 'Linia'], ['text', 'Tekst'], ['eraser', 'Gumka']];
const clone = o => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

function askText(title) {
  return new Promise(res => {
    const d = h('dialog', { class: 'vdlg' });
    const ta = h('textarea', { rows: 2, 'aria-label': title, placeholder: 'np. SPO, koniec śladu, 12,4 m' }); ta.style.overflow = 'auto';
    const done = v => { d.close(); d.remove(); res(v); };
    d.append(h('h2', { text: title }), ta, h('div', { class: 'btns' }, h('button', { type: 'button', class: 'primary', text: 'Dodaj', onclick: () => done(ta.value.trim() || null) }), h('button', { type: 'button', text: 'Anuluj', onclick: () => done(null) })));
    d.addEventListener('cancel', () => done(null));
    document.body.append(d); d.showModal(); setTimeout(() => ta.focus(), 50);
  });
}

export async function openViewer(att, env) {
  const blob = await env.getBlob(att);
  if (!blob) { env.toast('Brak obrazu tego załącznika w pamięci urządzenia (np. po wyczyszczeniu danych). Dołącz plik ponownie – adnotacje i tabela są zachowane.'); return; }
  const url = URL.createObjectURL(blob);
  att.ann = att.ann || emptyAnn(); att.rows = att.rows || [];
  const W = att.w, H = att.h;
  let tool = 'hand', color = 'red', fingerDraw = false, annVisible = true, contrast = false, hl = null, hlT = 0, placing = null;
  let rot = ((att.rot || 0) % 4 + 4) % 4, s = 1, tx = 0, ty = 0;
  const hist = [];
  const snap = () => ({ ann: clone(att.ann), rows: clone(att.rows) });
  const pushHist = st => { hist.push(st || snap()); if (hist.length > 80) hist.shift(); };

  // ---------- DOM ----------
  const root = h('div', { class: 'viewer', role: 'dialog', 'aria-label': `Materiał z akt ${att.id}` });
  const stage = h('div', { class: 'vstage' });
  const pan = h('div', { class: 'vpan' }), rotL = h('div', { class: 'vrot' });
  const img = h('img', { src: url, alt: `Załącznik ${att.id}`, draggable: 'false' });
  const cv = h('canvas', { class: 'vann', width: W, height: H });
  rotL.style.width = W + 'px'; rotL.style.height = H + 'px'; rotL.append(img, cv); pan.append(rotL); stage.append(pan);
  const banner = h('div', { class: 'vbanner' }); const hint = h('div', { class: 'vhint', hidden: true });
  stage.append(banner, hint);
  const ctx = cv.getContext('2d');
  const panel = h('div', { class: 'vpanel' });
  const toolBtns = {};
  const bar = h('div', { class: 'vbar' });
  const btn = (text, fn, cls = '') => { const b = h('button', { type: 'button', class: 'small ' + cls, text, onclick: fn }); bar.append(b); return b; };

  const paintBanner = () => { banner.textContent = `kopia robocza – oryginał w aktach ${att.podstawa || '(k. … – nie wpisano podstawy)'}`; };
  const setHint = t => { hint.hidden = !t; hint.textContent = t || ''; };
  const apply = () => { pan.style.transform = `translate(${tx}px,${ty}px) scale(${s})`; rotL.style.transform = `rotate(${rot * 90}deg)`; };
  const vw = () => stage.clientWidth || 800, vh = () => stage.clientHeight || 600;
  const fit = () => { const dw = rot % 2 ? H : W, dh = rot % 2 ? W : H; s = Math.min(vw() / dw, vh() / dh) * 0.97; tx = vw() / 2 - s * W / 2; ty = vh() / 2 - s * H / 2; apply(); };
  const redraw = () => { ctx.clearRect(0, 0, W, H); if (annVisible) drawAnn(ctx, att.ann, W, hl); };
  // współrzędne: ekran <-> obraz (z uwzględnieniem obrotu wokół środka obrazu)
  const toImg = (cx, cy) => { const r = stage.getBoundingClientRect(); const lx = (cx - r.left - tx) / s - W / 2, ly = (cy - r.top - ty) / s - H / 2, a = -rot * Math.PI / 2; return [lx * Math.cos(a) - ly * Math.sin(a) + W / 2, lx * Math.sin(a) + ly * Math.cos(a) + H / 2]; };
  const toScr = (ix, iy) => { const dx = ix - W / 2, dy = iy - H / 2, a = rot * Math.PI / 2; return [(dx * Math.cos(a) - dy * Math.sin(a) + W / 2) * s + tx, (dx * Math.sin(a) + dy * Math.cos(a) + H / 2) * s + ty]; };
  const norm = (cx, cy) => { const [x, y] = toImg(cx, cy); return [+(x / W).toFixed(4), +(y / W).toFixed(4)]; };
  const zoomAt = (sx, sy, k) => { const ns = Math.min(14, Math.max(0.04, s * k)); tx = sx - (sx - tx) / s * ns; ty = sy - (sy - ty) / s * ns; s = ns; apply(); };

  // ---------- punkty i wiersze ----------
  const nextPid = () => 'P' + (1 + Math.max(0, ...att.rows.map(r => +r.pid.slice(1) || 0), ...att.ann.points.map(p => +p.pid.slice(1) || 0)));
  const rowOf = pid => att.rows.find(r => r.pid === pid);
  const pointOf = pid => att.ann.points.find(p => p.pid === pid);
  function highlight(pid, center = true) {
    hl = pid; redraw(); clearTimeout(hlT); hlT = setTimeout(() => { hl = null; redraw(); }, 3500);
    const p = pointOf(pid);
    if (p && center) { const [sx, sy] = toScr(p.x * W, p.y * W); if (sx < 60 || sy < 60 || sx > vw() - 60 || sy > vh() - 60) { tx += vw() / 2 - sx; ty += vh() / 2 - sy; apply(); } }
  }
  const rowCard = r => {
    const card = h('div', { class: 'prow', data: { pid: r.pid } });
    const fld = (label, key, cls = '', ph = '') => { const t = h('textarea', { rows: 1, class: 'tin', 'aria-label': `${r.pid} – ${label}`, placeholder: ph }); t.value = r[key] || ''; t.addEventListener('input', () => { r[key] = t.value; env.touch(); grow(t); }); t.addEventListener('focus', () => { if (pointOf(r.pid)) highlight(r.pid); }); return h('div', { class: 'tf ' + cls }, h('label', { text: label }), t); };
    const head = h('div', { class: 'prow-h' }, h('button', { type: 'button', class: 'pid', text: r.pid, 'aria-label': `Pokaż ${r.pid} na obrazie`, onclick: () => { if (pointOf(r.pid)) highlight(r.pid); else env.toast(`${r.pid} nie ma jeszcze punktu na obrazie – użyj „Wskaż na obrazie”.`); } }));
    const where = h('button', { type: 'button', class: 'small', text: pointOf(r.pid) ? 'Przesuń punkt' : 'Wskaż na obrazie', onclick: () => { setTool('hand'); placing = r.pid; setHint(`Dotknij obrazu, aby ${pointOf(r.pid) ? 'przesunąć' : 'wskazać'} ${r.pid} (Pencilem lub palcem)`); } });
    const del = h('button', { type: 'button', class: 'small danger', text: 'Usuń wiersz', onclick: () => {
      const filled = ['co', 'wynik', 'jednostka', 'przyrzad', 'nr_zdjecia', 'uwagi'].some(k => r[k]);
      if (filled && !confirm(`Usunąć ${r.pid} wraz z wpisami?`)) return;
      pushHist(); att.rows = att.rows.filter(x => x !== r); att.ann.points = att.ann.points.filter(p => p.pid !== r.pid); env.touch(); redraw(); renderRows();
    } });
    head.append(where, del);
    card.append(head, fld('Co to jest', 'co', 'full', 'np. koniec śladu hamowania, SPO, koło pojazdu A'),
      h('div', { class: 'task-res' }, fld('Wynik', 'wynik', 'grow2', 'zmierzona odległość'), fld('Jednostka', 'jednostka', 'narrow', 'm'), fld('Nr mojego zdjęcia', 'nr_zdjecia', 'mid')),
      fld('Przyrząd', 'przyrzad', '', 'np. kółko Nivel M100'), fld('Uwagi', 'uwagi'));
    return card;
  };
  let rowsBox;
  function renderRows() {
    rowsBox.replaceChildren(...att.rows.map(rowCard), ...(att.rows.length ? [] : [h('p', { class: 'note', text: 'Brak punktów. Wybierz narzędzie „Punkt” i dotknij obrazu (Pencilem) – powstanie P1 i wiersz do wpisania pomiaru.' })]));
    rowsBox.querySelectorAll('textarea').forEach(grow);
  }

  // ---------- rysowanie / gesty ----------
  const ptrs = new Map(); let drawId = null, cur = null, pair = null, moved = 0, startT = 0, startXY = null, lastEraseDone = false;
  const isDraw = e => tool !== 'hand' && (e.pointerType === 'pen' || e.pointerType === 'mouse' || (e.pointerType === 'touch' && fingerDraw));
  const dseg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  function eraseAt(pt) {
    const R = 0.018 * Math.max(1, 1 / Math.max(s * W / vw(), .3)) , A = att.ann; let hit = false;
    const near = (arr, test) => { const i = arr.findIndex(test); if (i >= 0) { arr.splice(i, 1); hit = true; } };
    near(A.points, p => Math.hypot(p.x - pt[0], p.y - pt[1]) < R * 1.4);
    near(A.strokes, st => st.p.some(q => Math.hypot(q[0] - pt[0], q[1] - pt[1]) < R));
    near(A.lines, l => dseg(pt, l.a, l.b) < R);
    near(A.texts, t => Math.abs(pt[0] - t.p[0] - .05) < .06 && Math.abs(pt[1] - t.p[1] - .01) < .02);
    if (hit) { redraw(); renderRows(); }
  }
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.vhint,.vbanner')) return;
    stage.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    moved = 0; startT = Date.now(); startXY = [e.clientX, e.clientY];
    if (placing && ptrs.size === 1) { const id = placing; placing = null; setHint(''); pushHist(); const [x, y] = norm(e.clientX, e.clientY); const ex = pointOf(id); if (ex) { ex.x = x; ex.y = y; } else att.ann.points.push({ pid: id, x, y }); env.touch(); redraw(); renderRows(); highlight(id, false); drawId = null; return; }
    if (isDraw(e) && drawId === null) {
      drawId = e.pointerId; e.preventDefault();
      const pt = norm(e.clientX, e.clientY);
      if (tool === 'pen') { pushHist(); cur = { c: color, s: e.pointerType === 'pen' ? 0.0028 : 0.0035, p: [pt] }; att.ann.strokes.push(cur); }
      else if (tool === 'line') { pushHist(); cur = { c: color, s: 0.0035, a: pt, b: pt }; att.ann.lines.push(cur); }
      else if (tool === 'point') { pushHist(); const pid = nextPid(); att.ann.points.push({ pid, x: pt[0], y: pt[1] }); if (!rowOf(pid)) att.rows.push({ pid, co: '', wynik: '', jednostka: '', przyrzad: '', nr_zdjecia: '', uwagi: '' }); env.touch(); redraw(); renderRows(); highlight(pid, false); showPanel(true); const last = rowsBox.querySelector(`.prow[data-pid="${pid}"] textarea`); if (last && e.pointerType !== 'pen') last.focus(); }
      else if (tool === 'eraser') { pushHist(); lastEraseDone = false; eraseAt(pt); }
      else if (tool === 'text') { cur = { text: true, pt }; }
      redraw();
    }
  });
  stage.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (drawId === e.pointerId) {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const pt = norm(ev.clientX, ev.clientY);
        if (tool === 'pen' && cur) cur.p.push(pt); else if (tool === 'line' && cur) cur.b = pt; else if (tool === 'eraser') eraseAt(pt);
      }
      moved += Math.hypot(e.clientX - p.x, e.clientY - p.y); p.x = e.clientX; p.y = e.clientY; redraw(); return;
    }
    const others = [...ptrs.entries()].filter(([id]) => id !== drawId);
    if (others.length >= 2) {
      const [[ida, a], [idb, b]] = others; const old = { a: { ...a }, b: { ...b } };
      const np = { x: e.clientX, y: e.clientY }; if (e.pointerId === ida) { a.x = np.x; a.y = np.y; } else if (e.pointerId === idb) { b.x = np.x; b.y = np.y; } else return;
      const r = stage.getBoundingClientRect(), d0 = Math.hypot(old.a.x - old.b.x, old.a.y - old.b.y) || 1, d1 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const c0 = [(old.a.x + old.b.x) / 2 - r.left, (old.a.y + old.b.y) / 2 - r.top], c1 = [(a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top];
      const ns = Math.min(14, Math.max(0.04, s * d1 / d0)); tx = c1[0] - (c0[0] - tx) / s * ns; ty = c1[1] - (c0[1] - ty) / s * ns; s = ns; apply(); moved += 20;
    } else if (others.length === 1) { tx += e.clientX - p.x; ty += e.clientY - p.y; moved += Math.hypot(e.clientX - p.x, e.clientY - p.y); p.x = e.clientX; p.y = e.clientY; apply(); }
  });
  const up = async e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    ptrs.delete(e.pointerId);
    if (drawId === e.pointerId) {
      drawId = null;
      if (tool === 'line' && cur) { if (Math.hypot(cur.b[0] - cur.a[0], cur.b[1] - cur.a[1]) < 0.004) { att.ann.lines = att.ann.lines.filter(l => l !== cur); hist.pop(); } }
      if (tool === 'pen' && cur && cur.p.length < 2) { /* kropka – zostaje */ }
      if (tool === 'text' && cur && cur.text) { const pt = cur.pt; cur = null; const t = await askText('Tekst na obrazie'); if (t) { pushHist(); att.ann.texts.push({ p: pt, t, c: color }); env.touch(); redraw(); } return; }
      cur = null; env.touch(); redraw(); return;
    }
    // stuknięcie w trybie „Ręka”: wybór punktu
    if (e.type === 'pointerup' && moved < 8 && Date.now() - startT < 600 && ptrs.size === 0 && tool === 'hand' && !placing) {
      const pt = norm(e.clientX, e.clientY); let best = null, bd = 0.03;
      for (const q of att.ann.points) { const d = Math.hypot(q.x - pt[0], q.y - pt[1]); if (d < bd) { bd = d; best = q; } }
      if (best) { highlight(best.pid, false); showPanel(true); const c = rowsBox.querySelector(`.prow[data-pid="${best.pid}"]`); if (c) { c.scrollIntoView({ block: 'nearest' }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 2500); } }
    }
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', e => { e.preventDefault(); const r = stage.getBoundingClientRect(); if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.01)); else if (e.shiftKey) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.002)); else { tx -= e.deltaX; ty -= e.deltaY; apply(); } }, { passive: false });
  let gs = 1; const touching = () => [...ptrs.values()].some(p => p.type === 'touch');
  stage.addEventListener('gesturestart', e => { e.preventDefault(); gs = 1; });
  stage.addEventListener('gesturechange', e => { e.preventDefault(); if (touching()) return; const r = stage.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.scale / gs); gs = e.scale; });
  stage.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- pasek narzędzi ----------
  btn('← Wróć', () => close(), 'primary');
  bar.append(h('strong', { class: 'vtitle', text: `${att.id} · ${att.rodzaj}` }));
  const setTool = t => { tool = t; placing = t === 'hand' ? placing : null; if (t !== 'hand') setHint(''); for (const [k, b] of Object.entries(toolBtns)) b.setAttribute('aria-pressed', String(k === t)); stage.dataset.tool = t; };
  for (const [k, label] of TOOLS) toolBtns[k] = btn(label, () => setTool(k), 'tool');
  const colBtns = Object.entries(COLORS).map(([k, c]) => { const b = h('button', { type: 'button', class: 'col', 'aria-label': 'Kolor ' + k, 'aria-pressed': String(k === color), onclick: () => { color = k; colBtns.forEach(x => x.el.setAttribute('aria-pressed', String(x.k === k))); } }); b.style.background = c; bar.append(b); return { k, el: b }; });
  btn('Cofnij', () => { const st = hist.pop(); if (!st) return env.toast('Nie ma czego cofnąć.'); att.ann = st.ann; att.rows = st.rows; env.touch(); redraw(); renderRows(); });
  const bAnn = btn('Adnotacje', () => { annVisible = !annVisible; bAnn.setAttribute('aria-pressed', String(annVisible)); redraw(); }, 'tool'); bAnn.setAttribute('aria-pressed', 'true');
  btn('Obróć ⟲', () => { rot = (rot + 3) % 4; att.rot = rot; env.touch(); fit(); }); btn('Obróć ⟳', () => { rot = (rot + 1) % 4; att.rot = rot; env.touch(); fit(); });
  btn('Dopasuj', fit);
  const bCon = btn('Kontrast', () => { contrast = !contrast; img.classList.toggle('hc', contrast); bCon.setAttribute('aria-pressed', String(contrast)); }, 'tool'); bCon.setAttribute('aria-pressed', 'false');
  const bFin = btn('Palec: przesuwa', () => { fingerDraw = !fingerDraw; bFin.textContent = fingerDraw ? 'Palec: rysuje' : 'Palec: przesuwa'; }); bFin.title = 'Apple Pencil zawsze rysuje; palec domyślnie przesuwa i powiększa obraz';
  const bPan = btn('Tabela', () => showPanel(panel.hidden), 'tool');
  btn('Drukuj', () => env.print(att));
  function showPanel(on) { panel.hidden = !on; bPan.setAttribute('aria-pressed', String(on)); setTimeout(fit, 30); }

  // ---------- panel: dane załącznika + tabela punktów ----------
  const meta = h('details', { class: 'vmeta', open: true }, h('summary', { text: `${att.id} – dane załącznika` }));
  const sel = h('select', { 'aria-label': 'Rodzaj' }, ['szkic', 'zdjęcie', 'inne'].map(x => h('option', { value: x, text: x })));
  sel.value = att.rodzaj; sel.addEventListener('change', () => { att.rodzaj = sel.value; env.touch(); });
  const mf = (label, key, ph) => { const t = h('textarea', { rows: 1, class: 'tin', 'aria-label': label, placeholder: ph }); t.value = att[key] || ''; t.addEventListener('input', () => { att[key] = t.value; env.touch(); grow(t); if (key === 'podstawa') paintBanner(); }); return h('div', { class: 'tf' }, h('label', { text: label }), t); };
  meta.append(h('div', { class: 'tf' }, h('label', { text: 'Rodzaj' }), sel), mf('Podstawa w aktach (k. …, nr zdjęcia)', 'podstawa', 'k. 25, zdj. 3'), mf('Opis', 'opis', 'co przedstawia'), mf('Cel – po co to w terenie', 'cel', 'np. odtworzyć stanowisko fotografującego'));
  const tl = env.tasksFor(att.id);
  if (tl.length) meta.append(h('div', { class: 'vtasks' }, h('strong', { text: 'Zadania powiązane:' }), ...tl.map(t => h('div', { class: 'vtask' }, h('span', { text: `${t.id}: ${t.czynnosc}` }), h('button', { type: 'button', class: 'small', text: 'Do zadania →', onclick: () => { close(); env.gotoTask(t); } })))));
  rowsBox = h('div', { class: 'prows' });
  panel.append(meta, h('h3', { class: 'vh3', text: 'Punkty i pomiary' }), rowsBox,
    h('div', { class: 'btns' }, h('button', { type: 'button', class: 'small', text: '+ Dodaj wiersz', onclick: () => { pushHist(); const pid = nextPid(); att.rows.push({ pid, co: '', wynik: '', jednostka: '', przyrzad: '', nr_zdjecia: '', uwagi: '' }); env.touch(); renderRows(); const t = rowsBox.querySelector(`.prow[data-pid="${pid}"] textarea`); if (t) t.focus(); } })));
  const main = h('div', { class: 'vmain' }, stage, panel);
  root.append(bar, main); document.body.append(root); document.body.classList.add('noscroll');
  paintBanner(); setTool('hand'); renderRows(); redraw();
  const ro = new ResizeObserver(() => { if (s <= 0.0001 || !ready) return; fit(); }); let ready = false;
  requestAnimationFrame(() => { fit(); ready = true; ro.observe(stage); });
  const onKey = e => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) close(); if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !/TEXTAREA|INPUT/.test((e.target || {}).tagName || '')) { e.preventDefault(); const st = hist.pop(); if (st) { att.ann = st.ann; att.rows = st.rows; env.touch(); redraw(); renderRows(); } } };
  document.addEventListener('keydown', onKey);
  function close() { clearTimeout(hlT); ro.disconnect(); document.removeEventListener('keydown', onKey); root.remove(); document.body.classList.remove('noscroll'); URL.revokeObjectURL(url); env.touch(); env.onClose(); }
  return { close };
}
