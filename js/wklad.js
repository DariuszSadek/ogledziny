// „Wkład do formularzy” z analizy: wstępne wypełnienie formularzy + lista zadań na oględziny.
// Format: docs/format_wkladu.md (kopia dla projektu analizy w ~/A_Oględziny/Paczka_wkladu/). Nic nie jest odrzucane po cichu – raport.
import { indexDef, extraRowKey } from './defs.js';
export const FORMAT = 'ogledziny-wklad';
const idxCache = new Map();
const idxOf = def => { if (!idxCache.has(def.id)) idxCache.set(def.id, indexDef(def)); return idxCache.get(def.id); };
const str = v => (v == null ? '' : String(v)).trim();
const STAT = new Set(['', 'wykonane', 'niewykonane']);

export function parseWklad(text) {
  let t = String(text || '').trim();
  const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(t); if (m) t = m[1].trim();         // odpowiedź w bloku kodu
  const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a > 0 && b > a) t = t.slice(a, b + 1);
  return JSON.parse(t);
}

// Zwraca raport; modyfikuje C (sprawa) – tworzy egzemplarze formularzy i zadania.
export function applyWklad(w, C, DEFS, uid) {
  const R = { forms: 0, fields: 0, tasks: 0, reminders: 0, rejected: [], warnings: [] };
  if (!w || w.format !== FORMAT) throw new Error(`To nie jest wkład (brak "format": "${FORMAT}").`);
  if (w.wersja !== 1 && w.wersja !== 2) R.warnings.push(`Wersja wkładu ${w.wersja} – aplikacja zna wersje 1 i 2; wczytano, co się dało.`);
  R.attachments = 0;
  const sp = w.sprawa || {};
  C.header = C.header || { sygnatura: '', organ: '', data: '' };
  for (const k of ['sygnatura', 'organ', 'data']) if (str(sp[k]) && !str(C.header[k])) C.header[k] = str(sp[k]);
  if (str(sp.opis)) C.opis = C.opis ? C.opis + '\n' + str(sp.opis) : str(sp.opis);
  C.tasks = C.tasks || [];
  // Załączniki z akt (wersja 2): puste miejsca „do dołączenia” – plik dołącza biegły (S = szkic, F = zdjęcie, I = inne).
  C.attachments = C.attachments || [];
  const aref = new Map(), PFX = { szkic: 'S', 'zdjęcie': 'F', inne: 'I' }, FROMP = { S: 'szkic', F: 'zdjęcie', I: 'inne' };
  const nextAtt = p => p + (1 + Math.max(0, ...C.attachments.filter(a => a.id.startsWith(p)).map(a => +a.id.slice(1) || 0)));
  (w.zalaczniki || []).forEach((z, i) => {
    const wid = str(z.id), pm = /^([SFI])\d+$/.exec(wid);
    let rodzaj = str(z.rodzaj).toLowerCase(); if (rodzaj === 'zdjecie') rodzaj = 'zdjęcie';
    if (!PFX[rodzaj]) { if (pm) rodzaj = FROMP[pm[1]]; else { R.rejected.push({ co: `załącznik #${i + 1}${wid ? ' (' + wid + ')' : ''}`, dlaczego: 'brak poprawnego „rodzaj” (szkic | zdjęcie | inne)' }); return; } }
    if (pm && FROMP[pm[1]] !== rodzaj) R.warnings.push(`Załącznik ${wid}: rodzaj „${rodzaj}” nie pasuje do litery identyfikatora – nadano nowy numer.`);
    let id = wid && pm && FROMP[pm[1]] === rodzaj && !C.attachments.some(a => a.id === wid) ? wid : nextAtt(PFX[rodzaj]);
    if (wid && id !== wid && pm && FROMP[pm[1]] === rodzaj) R.warnings.push(`Załącznik ${wid}: ten identyfikator jest już w sprawie – nadano ${id}.`);
    if (!str(z.podstawa)) R.warnings.push(`Załącznik ${id}: brak „podstawa” (k. … w aktach) – uzupełnij przy dołączaniu pliku.`);
    C.attachments.push({ id, uid: uid(), rodzaj, podstawa: str(z.podstawa), opis: str(z.opis), cel: str(z.cel), name: '', w: 0, h: 0, bytes: 0, rot: 0,
      ann: { v: 1, strokes: [], lines: [], texts: [], points: [] }, rows: [], thumb: '', oczekuje: true, zrodlo: 'wklad' });
    if (wid) aref.set(wid, id); aref.set(id, id); R.attachments++;
  });
  const refs = new Map();                                   // ref z wkładu -> iid
  const usedRefs = new Set(C.forms.map(f => f.ref).filter(Boolean));
  (w.formularze || []).forEach((f, i) => {
    const id = str(f.formularz).padStart(2, '0'), def = DEFS[id];
    if (!def) { R.rejected.push({ co: `formularz #${i + 1} (${str(f.formularz)})`, dlaczego: 'nieznany numer formularza (dozwolone 00–09)' }); return; }
    let ref = str(f.ref) || `F${C.forms.length + 1}`; while (usedRefs.has(ref)) ref += '*'; usedRefs.add(ref);
    const n = C.forms.filter(x => x.formId === id).length + 1;
    const inst = { iid: uid(), formId: id, ref, label: str(f.etykieta) || `${id} ${n}`, data: {}, extra: {}, orphans: {}, reminders: [] };
    const idx = idxOf(def);
    for (const [k, v] of Object.entries(f.pola || {})) {
      let type = idx.types.get(k), ex = null;
      if (!type) { ex = extraRowKey(idx, k); if (ex) type = idx.tables.get(ex.prefix).coltypes[+/\.c(\d+)$/.exec(k)[1] - 1]; }
      if (!type) { R.rejected.push({ co: `${ref}: ${k}`, dlaczego: 'brak takiego pola w formularzu ' + id }); continue; }
      if (type === 'sketch') { R.rejected.push({ co: `${ref}: ${k}`, dlaczego: 'szkic wypełnia się w terenie' }); continue; }
      if (v != null && typeof v === 'object') { R.rejected.push({ co: `${ref}: ${k}`, dlaczego: 'wartość musi być tekstem, liczbą lub true' }); continue; }
      if (type === 'check') { if (v === true || /^(true|tak|x|1)$/i.test(str(v))) { inst.data[k] = true; R.fields++; } else if (!(v === false || v === '' || v == null || /^(false|nie|0)$/i.test(str(v)))) R.rejected.push({ co: `${ref}: ${k}`, dlaczego: `pole wyboru przyjmuje tylko true (dano „${str(v)}”)` }); continue; }
      const t = str(v); if (!t) continue;
      inst.data[k] = t; R.fields++;
      if (ex) inst.extra[ex.prefix] = Math.max(inst.extra[ex.prefix] || 0, ex.row - idx.tables.get(ex.prefix).nrows);
    }
    inst.reminders = (f.przypomnienia || []).map(str).filter(Boolean); R.reminders += inst.reminders.length;
    C.forms.push(inst); C.defVersions[id] = def.defVersion; refs.set(str(f.ref) || ref, inst.iid); refs.set(ref, inst.iid); R.forms++;
  });
  const taken = new Set(C.tasks.map(t => t.id));
  (w.zadania || []).forEach((z, i) => {
    const czynnosc = str(z.czynnosc);
    if (!czynnosc) { R.rejected.push({ co: `zadanie #${i + 1}`, dlaczego: 'brak pola „czynnosc”' }); return; }
    let id = str(z.id) || `Z${String(C.tasks.length + 1).padStart(2, '0')}`; while (taken.has(id)) id += '*'; taken.add(id);
    const f = str(z.formularz); let iid = null;
    if (f && f.toLowerCase() !== 'ogolne') { iid = refs.get(f) || (C.forms.find(x => x.ref === f) || {}).iid || null; if (!iid) R.warnings.push(`Zadanie ${id}: nie znaleziono formularza „${f}” – zadanie dodano jako ogólne.`); }
    let pole = str(z.pole), poleOk = false;
    if (pole) { const inst = C.forms.find(x => x.iid === iid), def = inst && DEFS[inst.formId]; poleOk = !!(def && (idxOf(def).ids.has(pole) || extraRowKey(idxOf(def), pole))); if (!poleOk) { R.warnings.push(`Zadanie ${id}: pole „${pole}” nie istnieje w formularzu – zachowano tylko jako tekst.`); } }
    let zal = str(z.zalacznik); if (zal) { if (aref.has(zal)) zal = aref.get(zal); else if (C.attachments.some(a => a.id === zal)) { /* istniejący w sprawie */ } else { R.warnings.push(`Zadanie ${id}: nie ma załącznika „${zal}” we wkładzie – pominięto powiązanie.`); zal = ''; } }
    const status = STAT.has(str(z.status)) ? str(z.status) : '';
    C.tasks.push({ id, iid, sekcja: str(z.sekcja), pole, poleOk, priorytet: /^(wysoki|niski)$/i.test(str(z.priorytet)) ? str(z.priorytet).toLowerCase() : 'normalny',
      czynnosc, zalacznik: zal, opis: str(z.opis), podstawa: str(z.podstawa), przyrzad: str(z.przyrzad), jednostka: str(z.jednostka), wynik: str(z.wynik), nr_zdjecia: str(z.nr_zdjecia), status, powod: str(z.powod), zrodlo: 'wklad' });
    R.tasks++;
  });
  C.notesGeneral = [...(C.notesGeneral || []), ...(w.uwagi_ogolne || []).map(str).filter(Boolean)];
  return R;
}
export function reportWklad(R) {
  const L = [`Wczytano: formularze ${R.forms}, wypełnione pola ${R.fields}, zadania ${R.tasks}, przypomnienia ${R.reminders}${R.attachments ? `, załączniki do dołączenia ${R.attachments}` : ''}.`];
  if (R.warnings.length) L.push('', 'Ostrzeżenia:', ...R.warnings.map(x => ' • ' + x));
  if (R.rejected.length) L.push('', `POMINIĘTE (${R.rejected.length}) – popraw we wkładzie i wczytaj ponownie albo wpisz ręcznie:`, ...R.rejected.map(x => ` • ${x.co}: ${x.dlaczego}`));
  return L.join('\n');
}
