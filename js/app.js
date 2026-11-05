import { kvGet, kvPut } from './store.js';
import { h, renderForm, grow, COPYRIGHT } from './engine.js';
import { migrate, reportText, needsAttention, SCHEMA } from './migrate.js';
import { indexDef } from './defs.js';
import { APP_VERSION } from './version.js';

const $ = id => document.getElementById(id);
const FORM_IDS = ['01'];             // formularze dostępne w tej wersji (etap 3 doda 00, 02–09)
const FORM_NAMES = { '00': 'Karta czynności', '01': 'Miejsce zdarzenia', '02': 'Motocykl', '03': 'Samochód osobowy', '04': 'Samochód ciężarowy', '05': 'Furgon / autobus', '06': 'Silnik', '07': 'Ogumienie', '08': 'Rzecz', '09': 'Rejestr zdjęć i przedmiotów' };
let DEFS = {}, C = null, view = 'home', saveTimer = null, lastBufferOk = null;

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const pad = n => String(n).padStart(2, '0');

function newCase() {
  return { app: 'ogledziny', schema: SCHEMA, appVersion: APP_VERSION, id: uid(), created: new Date().toISOString(), defVersions: {},
    header: { sygnatura: '', organ: '', data: '' }, forms: [], tasks: [], savedToFile: null, rev: 0, savedRev: 0 };
}
function addInstance(formId, label) {
  const n = C.forms.filter(f => f.formId === formId).length + 1;
  const inst = { iid: uid(), formId, label: label ?? `${FORM_NAMES[formId] || formId} ${n}`, data: {}, extra: {}, orphans: {} };
  C.forms.push(inst); C.defVersions[formId] = DEFS[formId].defVersion; return inst;
}

// ---------- bufor ----------
function touch() {
  C.rev++; renderStatus();
  clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300);
}
async function persist() {
  clearTimeout(saveTimer); saveTimer = null;
  try { await kvPut('current', JSON.parse(JSON.stringify(C))); lastBufferOk = new Date(); } catch (e) { lastBufferOk = null; toast('UWAGA: bufor roboczy nie zapisał się (' + (e.name || e) + '). Zapisz plik!'); }
  renderStatus();
}
addEventListener('pagehide', () => { if (saveTimer) persist(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) persist(); });

function renderStatus() {
  const f = $('st-file');
  if (!C) { f.textContent = 'Plik: –'; f.className = ''; $('st-buffer').textContent = 'Bufor: –'; return; }
  const dirty = C.rev !== C.savedRev;
  if (C.savedToFile) { const d = new Date(C.savedToFile); f.textContent = `Plik: zapisano ${pad(d.getHours())}:${pad(d.getMinutes())}` + (dirty ? ' · są zmiany po zapisie' : ''); }
  else f.textContent = 'Plik: nie zapisano' + (dirty ? ' · są zmiany' : '');
  f.className = dirty ? 'dirty' : 'fresh';
  $('st-buffer').textContent = lastBufferOk ? `Bufor: ${saveTimer ? 'zapisuję…' : 'OK ' + pad(lastBufferOk.getHours()) + ':' + pad(lastBufferOk.getMinutes())}` : (saveTimer ? 'Bufor: zapisuję…' : 'Bufor: –');
}

// ---------- UI pomocnicze ----------
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 4500); }
function dialog(title, body, buttons) {
  const d = $('dlg'); d.replaceChildren(h('h2', { text: title }), body, h('div', { class: 'btns' }, buttons.map(([t, fn, cls]) => h('button', { type: 'button', class: cls || '', text: t, onclick: () => { d.close(); fn && fn(); } }))));
  d.showModal();
}
const ask = (title, text, okText, ok) => dialog(title, h('p', { text }), [[okText, ok, 'primary'], ['Anuluj', null]]);

// ---------- ctx dla silnika ----------
function ctxFor(inst, def) {
  return {
    get: id => inst.data[id],
    set: (id, v) => { if (v === '' || v == null) delete inst.data[id]; else inst.data[id] = v; touch(); },
    getExtra: p => inst.extra[p] || 0,
    addRow: p => { inst.extra[p] = (inst.extra[p] || 0) + 1; touch(); return inst.extra[p]; },
    toast, header: () => C.header, instLabel: inst.label,
  };
}

// ---------- widoki ----------
function setTabs() {
  const t = $('tabs'); t.replaceChildren();
  t.append(h('button', { type: 'button', class: view === 'home' ? 'on' : '', text: 'Sprawa', onclick: () => go('home') }));
  for (const f of C.forms) t.append(h('button', { type: 'button', class: view === f.iid ? 'on' : '', text: `${f.formId} · ${f.label}`, onclick: () => go(f.iid) }));
  t.append(h('button', { type: 'button', class: 'small', text: '+ Formularz', onclick: addFormDialog }));
  const on = t.querySelector('.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function go(v) { view = v; if (C) { C.lastView = v; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300); } render(); scrollTo(0, 0); }

function render() {
  const main = $('main'); main.replaceChildren();
  $('secnav').hidden = true;
  if (!C) { $('tabs').replaceChildren(); $('tabs').hidden = true; return renderStart(main); }
  $('tabs').hidden = false; setTabs();
  if (view === 'home') return renderCase(main);
  const inst = C.forms.find(f => f.iid === view);
  if (!inst) { view = 'home'; return render(); }
  const def = DEFS[inst.formId];
  if (!def) { main.append(h('div', { class: 'orphans' }, h('h3', { text: 'Brak definicji formularza' }), h('p', { text: `Formularz ${inst.formId} nie jest dostępny w tej wersji aplikacji. Dane są zachowane w pliku sprawy.` }))); return; }
  if (Object.keys(inst.orphans || {}).length) main.append(orphanBox(inst));
  main.append(renderForm(def, inst, ctxFor(inst, def)));
  main.querySelectorAll('textarea').forEach(grow);
  const nav = $('secnav'); nav.hidden = false; nav.replaceChildren();
  layoutSticky();
  for (const s of def.sections) nav.append(h('button', { type: 'button', text: s.id, title: s.title, onclick: () => document.getElementById(`sec-${def.id}-${s.id}`).scrollIntoView({ block: 'start' }) }));
  requestAnimationFrame(() => main.querySelectorAll('textarea').forEach(grow));
}
function layoutSticky() {
  const bh = $('bar').offsetHeight + ($('update-banner').hidden ? 0 : $('update-banner').offsetHeight);
  $('bar').style.top = ($('update-banner').hidden ? 0 : $('update-banner').offsetHeight) + 'px';
  $('secnav').style.top = $('bar').offsetHeight + parseFloat($('bar').style.top || 0) + 'px';
  document.documentElement.style.setProperty('--stick', (bh + $('secnav').offsetHeight + 10) + 'px');
}
addEventListener('resize', () => { document.querySelectorAll('main textarea').forEach(grow); layoutSticky(); });

function orphanBox(inst) {
  const rows = Object.entries(inst.orphans);
  const tb = h('table', {}, rows.map(([k, v]) => h('tr', {}, h('td', { text: k }), h('td', { text: typeof v === 'string' ? v : JSON.stringify(v) }))));
  return h('div', { class: 'orphans' }, h('h3', { text: `Pola, których nie dało się przenieść do bieżącej definicji (${rows.length})` }),
    h('p', { text: 'Wartości są zachowane w pliku sprawy. Przepisz je ręcznie we właściwym miejscu, a potem usuń z listy.' }), tb,
    h('div', { class: 'btns' }, h('button', { type: 'button', class: 'small danger', text: 'Usuń tę listę (już przepisane)', onclick: () => ask('Usunąć listę?', 'Wartości zostaną trwale usunięte z tej sprawy.', 'Usuń', () => { inst.orphans = {}; touch(); render(); }) })));
}

function renderStart(main) {
  main.append(h('div', { class: 'home' }, h('h1', { text: 'Oględziny' }),
    h('p', { text: 'Elektroniczne formularze oględzin – Motoanalityka Dariusz Sadek. Aplikacja działa bez internetu i nie wysyła żadnych danych.' }),
    h('div', { class: 'btns' },
      h('button', { type: 'button', class: 'primary', text: 'Nowa sprawa', onclick: startNew }),
      h('button', { type: 'button', text: 'Otwórz sprawę', onclick: openFile })),
    h('div', { class: 'copy', text: COPYRIGHT }),
    h('div', { class: 'copy', text: `Wersja ${APP_VERSION}` })));
}
function startNew() { C = newCase(); addInstance('01'); view = C.lastView = C.forms[0].iid; touch(); persist(); render(); }

function renderCase(main) {
  const hf = (k, label, ph) => { const i = h('input', { type: 'text', value: C.header[k] || '', 'aria-label': label, placeholder: ph || '' }); i.addEventListener('input', () => { C.header[k] = i.value; touch(); }); return h('div', { class: 'fld' }, h('label', { text: label }), i); };
  main.append(h('div', { class: 'home' }, h('h1', { text: 'Sprawa' }),
    h('div', { class: 'card' }, h('h2', { text: 'Dane wspólne (wpisywane raz)' }),
      h('div', { class: 'hdrgrid' }, hf('sygnatura', 'Sygnatura / nr zlecenia'), hf('organ', 'Organ'), hf('data', 'Data', 'RRRR-MM-DD'))),
    h('div', { class: 'card' }, h('h2', { text: 'Formularze w sprawie' }),
      ...C.forms.map(f => {
        const i = h('input', { type: 'text', value: f.label, 'aria-label': 'Nazwa egzemplarza' }); i.addEventListener('input', () => { f.label = i.value; touch(); });
        return h('div', { class: 'inst' }, h('strong', { text: f.formId }), i,
          h('button', { type: 'button', class: 'small', text: 'Otwórz', onclick: () => go(f.iid) }),
          h('button', { type: 'button', class: 'small danger', text: 'Usuń', onclick: () => ask('Usunąć formularz?', `Egzemplarz „${f.label}” (${f.formId}) wraz z danymi zostanie usunięty ze sprawy.`, 'Usuń', () => { C.forms = C.forms.filter(x => x !== f); touch(); render(); }) }));
      }),
      h('div', { class: 'btns' }, h('button', { type: 'button', text: '+ Dodaj formularz', onclick: addFormDialog }))),
    h('div', { class: 'card' }, h('h2', { text: 'Plik sprawy' }),
      h('div', { class: 'btns' },
        h('button', { type: 'button', class: 'primary', text: 'Zapisz plik', onclick: saveFile }),
        h('button', { type: 'button', text: 'Otwórz sprawę', onclick: openFile }),
        h('button', { type: 'button', class: 'danger', text: 'Nowa pusta sprawa', onclick: newCaseConfirm }),
        h('button', { type: 'button', text: 'Test urządzenia', onclick: diagnostics }))),
    h('div', { class: 'copy', text: COPYRIGHT }), h('div', { class: 'copy', text: `Wersja aplikacji ${APP_VERSION}` })));
}
function newCaseConfirm() {
  const dirty = C && C.rev !== C.savedRev;
  ask('Nowa pusta sprawa', dirty ? 'W bieżącej sprawie są zmiany niezapisane do pliku. Zostaną utracone (zostanie tylko ten bufor do czasu nadpisania). Zapisz plik przed kontynuacją.' : 'Bieżąca sprawa zostanie zamknięta (jest zapisana w pliku).', 'Utwórz nową', startNew);
}
function addFormDialog() {
  const list = h('div', { class: 'btns' }, FORM_IDS.map(id => h('button', { type: 'button', text: `${id} · ${FORM_NAMES[id]}`, onclick: () => { $('dlg').close(); const i = addInstance(id); touch(); go(i.iid); } })));
  dialog('Dodaj formularz', list, [['Zamknij', null]]);
}

// ---------- plik sprawy ----------
function fileName() {
  const d = new Date(), bad = /[\\/:*?"<>|\s.\x00-\x1f]/g;
  const sygn = (C.header.sygnatura || 'bez-sygnatury').trim().replace(bad, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'bez-sygnatury';
  return `${sygn}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}
function saveFile() {
  if (!C) return;
  const iso = new Date().toISOString();
  const rev = C.rev;
  const out = Object.assign({}, C, { savedToFile: iso, appVersion: APP_VERSION });
  delete out.rev; delete out.savedRev;
  const name = fileName();
  const json = JSON.stringify(out, null, 1);
  const done = how => { C.savedToFile = iso; C.savedRev = rev; persist(); toast(`Zapisano plik: ${name} (${how})`); };
  const tryShare = type => {
    const file = new File([json], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], title: name }).then(() => 'udostępnianie', e => { if (e && e.name === 'AbortError') throw e; return null; });
    return null;
  };
  // Wywołania w tej samej akcji użytkownika (bez await przed share).
  let p = null;
  try { p = tryShare('application/json'); } catch (e) { if (e.name === 'AbortError') return; }
  if (!p) { try { p = tryShare('text/plain'); } catch (e) { if (e.name === 'AbortError') return; } }
  if (p) { p.then(how => how ? done(how) : download(json, name, done), e => { if (e.name !== 'AbortError') download(json, name, done); }); }
  else download(json, name, done);
}
function download(json, name, done) {
  const a = h('a', { href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  done('pobieranie – sprawdź folder Pobrane / zapisz w Plikach');
}
function openFile() { const i = $('file-input'); i.value = ''; i.click(); }
$('file-input').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  let obj;
  try { obj = JSON.parse(await f.text()); } catch { return toast('To nie jest poprawny plik sprawy (błąd odczytu JSON).'); }
  if (obj.app !== 'ogledziny' || !Array.isArray(obj.forms)) return toast('To nie jest plik sprawy aplikacji Oględziny.');
  const doOpen = () => {
    const report = migrate(obj, DEFS);
    obj.rev = 0; obj.savedRev = 0; if (!obj.header) obj.header = { sygnatura: '', organ: '', data: '' }; if (!obj.tasks) obj.tasks = [];
    if (report.moved.length || report.orphaned.length || report.updated.length) { obj.rev = 1; }   // dane zmieniły postać – wymagają ponownego zapisu do pliku
    C = obj; view = 'home'; persist(); render(); renderStatus();
    if (needsAttention(report)) dialog('Raport otwarcia pliku', h('pre', { text: reportText(report) || 'Bez uwag.' }), [['OK', null, 'primary']]);
    else toast('Sprawa otwarta bez zmian.');
  };
  if (C && C.rev !== C.savedRev) ask('Niezapisane zmiany', 'Bieżąca sprawa ma zmiany niezapisane do pliku. Otwarcie innego pliku zastąpi bufor.', 'Otwórz mimo to', doOpen); else doOpen();
});
$('btn-save').addEventListener('click', saveFile);
$('btn-open').addEventListener('click', openFile);
$('btn-home').addEventListener('click', () => go('home'));

// ---------- test urządzenia ----------
async function diagnostics() {
  const lines = [];
  const add = (k, v) => lines.push(`${k}: ${v}`);
  add('Wersja aplikacji', APP_VERSION);
  add('Tryb ekranu początkowego (standalone)', (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) ? 'tak' : 'nie');
  add('Online', navigator.onLine ? 'tak' : 'nie');
  add('Service worker aktywny', navigator.serviceWorker && navigator.serviceWorker.controller ? 'tak' : 'nie');
  add('IndexedDB', 'indexedDB' in window ? 'jest' : 'brak');
  try { add('Trwałe przechowywanie', navigator.storage && navigator.storage.persisted ? String(await navigator.storage.persisted()) : 'n/d'); } catch { add('Trwałe przechowywanie', 'błąd'); }
  const t = (type, n) => { try { const f = new File(['{}'], n, { type }); return navigator.canShare ? String(navigator.canShare({ files: [f] })) : 'brak canShare'; } catch (e) { return 'błąd ' + e.name; } };
  add('canShare plik application/json', t('application/json', 'a.json'));
  add('canShare plik text/plain (.json)', t('text/plain', 'a.json'));
  add('Geolokalizacja', 'geolocation' in navigator ? 'jest' : 'brak');
  add('Pointer: pen/touch', `${'PointerEvent' in window} / maxTouchPoints=${navigator.maxTouchPoints}`);
  add('User-Agent', navigator.userAgent);
  dialog('Test urządzenia', h('pre', { text: lines.join('\n') }), [['OK', null, 'primary']]);
}

// ---------- aktualizacje (service worker) ----------
async function setupSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    const show = () => { $('update-banner').hidden = false; layoutSticky(); };
    if (reg.waiting && navigator.serviceWorker.controller) show();
    reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) show(); }); });
    $('update-btn').addEventListener('click', async () => { await persist(); (reg.waiting || reg.active).postMessage('SKIP_WAITING'); });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
    const check = () => reg.update().catch(() => { });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    check();
  } catch (e) { console.warn('SW', e); }
}

// ---------- start ----------
async function loadDefs() {
  for (const id of FORM_IDS) { const r = await fetch(`forms/${id}.json`); DEFS[id] = await r.json(); indexDef(DEFS[id]); }
}
(async () => {
  try { await loadDefs(); } catch (e) { $('main').append(h('p', { text: 'Błąd wczytania definicji formularzy: ' + e })); return; }
  try { const saved = await kvGet('current'); if (saved) { const rep = migrate(saved, DEFS); C = saved; view = C.forms.some(f => f.iid === C.lastView) ? C.lastView : 'home'; if (needsAttention(rep) && (rep.orphaned.length || rep.unknownForms.length)) setTimeout(() => dialog('Raport (bufor)', h('pre', { text: reportText(rep) }), [['OK', null, 'primary']]), 200); } } catch (e) { console.warn(e); }
  if (C) lastBufferOk = null;
  render(); renderStatus();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
  setupSW();
})();
