// Lista zadań na oględziny (z wkładu od Claude AI lub własne): czynność, opis, podstawa w aktach, przyrząd,
// wynik, jednostka, nr zdjęcia, status (wykonane / niewykonane + powód).
import { h, grow } from './engine.js';

let filter = 'all';
const tf = (t, key, ph, cls = '') => {
  const c = h('textarea', { rows: 1, class: 'tin ' + cls, placeholder: ph || '', 'aria-label': ph || key });
  c.value = t[key] || ''; return c;
};
const lab = (txt, el, cls = '') => h('div', { class: 'tf ' + cls }, h('label', { text: txt }), el);

export function taskCard(t, env) {
  const card = h('div', { class: 'task' });
  const paint = () => { card.className = `task st-${t.status || 'open'} pr-${t.priorytet || 'normalny'}`; };
  const bind = (el, key) => { el.addEventListener('input', () => { t[key] = el.value; env.touch(); if (el.tagName === 'TEXTAREA') grow(el); }); return el; };
  const head = h('div', { class: 'task-h' },
    h('span', { class: 'tid', text: t.id }),
    t.priorytet && t.priorytet !== 'normalny' ? h('span', { class: 'tpr', text: t.priorytet === 'wysoki' ? 'WYSOKI PRIORYTET' : 'niski priorytet' }) : null,
    t.sekcja ? h('span', { class: 'tsec', text: `sekcja ${t.sekcja}` }) : null,
    t.iid ? h('button', { type: 'button', class: 'small', text: 'Do formularza →', onclick: () => env.goto(t) }) : null,
    t.zrodlo === 'wlasne' ? h('span', { class: 'tsec', text: 'własne' }) : null);
  const c = bind(tf(t, 'czynnosc', 'Czynność', 'task-c'), 'czynnosc');
  const o = bind(tf(t, 'opis', 'Opis / uszczegółowienie', 'task-o'), 'opis');
  const meta = h('div', { class: 'task-meta' },
    lab('Podstawa w aktach', bind(tf(t, 'podstawa', 'k. …'), 'podstawa')),
    lab('Przyrząd', bind(tf(t, 'przyrzad', 'przyrząd'), 'przyrzad')));
  const res = h('div', { class: 'task-res' },
    lab('Wynik', bind(tf(t, 'wynik', 'wynik pomiaru / ustalenie'), 'wynik'), 'grow2'),
    lab('Jednostka', bind(tf(t, 'jednostka', 'jedn.'), 'jednostka'), 'narrow'),
    lab('Nr zdjęcia', bind(tf(t, 'nr_zdjecia', 'nr zdj.'), 'nr_zdjecia'), 'mid'));
  const pow = lab('Powód niewykonania', bind(tf(t, 'powod', 'dlaczego nie wykonano'), 'powod'), 'powod');
  const showPow = () => { pow.hidden = t.status !== 'niewykonane'; };
  const mk = (txt, val, cls) => h('button', { type: 'button', class: 'st ' + cls, text: txt, 'aria-pressed': String(t.status === val), onclick: () => { t.status = t.status === val ? '' : val; paint(); btns.forEach(b => b.el.setAttribute('aria-pressed', String(t.status === b.val))); showPow(); env.touch(); } });
  const btns = [{ val: 'wykonane', el: mk('✔ Wykonane', 'wykonane', 'ok') }, { val: 'niewykonane', el: mk('✘ Niewykonane', 'niewykonane', 'no') }];
  card.append(head, c, o, meta, res, h('div', { class: 'task-st' }, btns.map(b => b.el), h('button', { type: 'button', class: 'small danger', text: 'Usuń', onclick: () => env.remove(t) })), pow);
  paint(); showPow();
  requestAnimationFrame(() => card.querySelectorAll('textarea').forEach(grow));
  return card;
}

export function counts(C) {
  const T = C.tasks || [];
  return { all: T.length, done: T.filter(t => t.status === 'wykonane').length, no: T.filter(t => t.status === 'niewykonane').length, open: T.filter(t => !t.status).length };
}

export function renderTasksView(main, C, env0) {
  const sum = h('div', { class: 'tsum' });
  const fill = () => { const k = counts(C); sum.replaceChildren(h('span', { class: 'ok', text: `✔ wykonane ${k.done}` }), h('span', { class: 'no', text: `✘ niewykonane ${k.no}` }), h('span', { text: `otwarte ${k.open}` }), h('span', { text: `razem ${k.all}` })); };
  const env = Object.assign({}, env0, { touch: () => { env0.touch(); fill(); } });
  fill();
  const k = counts(C);
  const box = h('div', { class: 'home tasks' }, h('h1', { text: 'Zadania na oględziny' }));
  box.append(sum);
  const fb = h('div', { class: 'btns' });
  for (const [v, t] of [['all', 'Wszystkie'], ['open', 'Tylko otwarte'], ['high', 'Wysoki priorytet']]) fb.append(h('button', { type: 'button', class: 'small' + (filter === v ? ' primary' : ''), text: t, onclick: () => { filter = v; env.rerender(); } }));
  fb.append(h('button', { type: 'button', class: 'small', text: '+ Dodaj zadanie', onclick: env.addTask }), h('button', { type: 'button', class: 'small', text: 'Wkład od Claude AI…', onclick: env.wklad }));
  box.append(fb);
  if ((C.notesGeneral || []).length) box.append(h('div', { class: 'card' }, h('h2', { text: 'Do pamiętania (ogólne)' }), h('ul', {}, C.notesGeneral.map(n => h('li', { text: n })))));
  const pass = t => filter === 'all' || (filter === 'open' && !t.status) || (filter === 'high' && t.priorytet === 'wysoki');
  const groups = [...C.forms.filter(f => (C.tasks || []).some(t => t.iid === f.iid) || (f.reminders || []).length).map(f => ({ title: `${f.formId} · ${f.label}`, iid: f.iid, rem: f.reminders || [] })), { title: 'Ogólne (bez formularza)', iid: null, rem: [] }];
  let shown = 0;
  for (const g of groups) {
    const list = (C.tasks || []).filter(t => (t.iid || null) === g.iid).filter(pass);
    if (!list.length && !(g.rem.length && filter === 'all')) continue;
    const sec = h('section', { class: 'tgroup' }, h('h2', { text: g.title }));
    if (g.rem.length && filter === 'all') sec.append(h('ul', { class: 'rem' }, g.rem.map(r => h('li', { text: r }))));
    list.forEach(t => { sec.append(taskCard(t, env)); shown++; });
    box.append(sec);
  }
  if (!shown && !(C.tasks || []).length) box.append(h('p', { class: 'note', text: 'Brak zadań. Wczytaj wkład od Claude AI („Wkład od Claude AI…”) albo dodaj własne zadanie.' }));
  main.append(box);
}

export function taskPanel(inst, C, env) {
  const list = (C.tasks || []).filter(t => t.iid === inst.iid), rem = inst.reminders || [];
  if (!list.length && !rem.length) return null;
  const d = h('details', { class: 'tpanel', open: true }, h('summary', { text: `Zadania i przypomnienia do tego formularza (${list.length})` }));
  if (rem.length) d.append(h('ul', { class: 'rem' }, rem.map(r => h('li', { text: r }))));
  list.forEach(t => d.append(taskCard(t, env)));
  return d;
}
