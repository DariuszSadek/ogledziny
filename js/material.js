// Materiał z akt: lista załączników, dołączanie plików, przechowywanie obrazów w buforze, zapis do pliku sprawy, wydruk.
import { h, COPYRIGHT } from './engine.js';
import { blobPut, blobGet, blobDel, blobKeys } from './store.js';
import { importImage, openPdf, renderPdfPage, parsePages, makeThumb, blobToDataUrl, dataUrlToBlob, composite, fmtMB, storageInfo, emptyAnn } from './attach.js';
import { openViewer } from './viewer.js';

const PREFIX = { szkic: 'S', 'zdjęcie': 'F', inne: 'I' };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

export function createMaterial(api) {
  const cache = new Map();                      // uid -> data URL (do zapisu do pliku) albo null (brak obrazu w pamięci)
  const key = (att, cid) => `${cid || api.C().id}/${att.uid}`;
  const list = () => { const C = api.C(); C.attachments = C.attachments || []; return C.attachments; };
  const nextId = rodzaj => { const p = PREFIX[rodzaj] || 'I'; return p + (1 + Math.max(0, ...list().filter(a => a.id.startsWith(p)).map(a => +a.id.slice(1) || 0))); };
  const estimateBytes = () => Math.round(list().reduce((s, a) => s + (a.bytes || 0), 0) * 4 / 3) + 30000;
  const getBlob = att => blobGet(key(att));

  async function warm() { for (const a of list()) if (!cache.has(a.uid)) { try { const b = await getBlob(a); cache.set(a.uid, b ? await blobToDataUrl(b) : null); } catch { cache.set(a.uid, null); } } }
  function forSave() {
    const atts = list();
    const pending = atts.filter(a => !cache.has(a.uid));
    return { ready: !pending.length, missing: atts.filter(a => cache.get(a.uid) === null).map(a => a.id), items: atts.map(a => { const o = { ...a }; const d = cache.get(a.uid); if (d) o.data = d; else o.brak_obrazu = true; return o; }) };
  }
  async function restoreFromFile(obj) {                 // plik -> bufor (obrazy do IndexedDB)
    const out = { n: 0, missing: [] };
    for (const a of obj.attachments || []) {
      a.uid = a.uid || uid(); a.ann = a.ann || emptyAnn(); a.rows = a.rows || [];
      if (a.data) { const b = dataUrlToBlob(a.data); await blobPut(`${obj.id}/${a.uid}`, b); cache.set(a.uid, a.data); a.bytes = b.size; delete a.data; out.n++; }
      else { cache.set(a.uid, null); out.missing.push(a.id); }
      delete a.brak_obrazu;
    }
    return out;
  }
  async function gc() {
    try {
      const C = api.C(); const keep = new Set((C && C.attachments || []).map(a => key(a)));
      for (const k of await blobKeys()) if (!keep.has(k)) await blobDel(k);
      const uids = new Set((C && C.attachments || []).map(a => a.uid)); for (const k of [...cache.keys()]) if (!uids.has(k)) cache.delete(k);
    } catch { /* porządkowanie nie jest krytyczne */ }
  }
  async function removeAtt(att) {
    const C = api.C(); C.attachments = list().filter(a => a !== att);
    for (const t of C.tasks || []) if (t.zalacznik === att.id) t.zalacznik = '';
    cache.delete(att.uid); try { await blobDel(key(att)); } catch { /* */ }
    api.touch(); api.rerender();
  }

  // ---------- dołączanie plików ----------
  function metaDialog(f, n, isPdf, prev = {}) {
    return new Promise(res => {
      const sel = h('select', { 'aria-label': 'Rodzaj' }, ['szkic', 'zdjęcie', 'inne'].map(x => h('option', { value: x, text: x }))); sel.value = prev.rodzaj || (isPdf ? 'szkic' : 'zdjęcie');
      const fld = (label, v, ph) => { const t = h('textarea', { rows: 1, class: 'tin', 'aria-label': label, placeholder: ph }); t.value = v || ''; t.style.overflow = 'auto'; return t; };
      const pod = fld('Podstawa w aktach', prev.podstawa, 'k. 25, zdj. 3'), opis = fld('Opis', prev.opis, 'co przedstawia'), cel = fld('Cel', prev.cel, 'np. odtworzyć stanowisko fotografującego');
      const pages = isPdf && n > 1 ? h('input', { type: 'text', class: 'tin', value: prev.pagesText || `1-${Math.min(n, 20)}`, 'aria-label': 'Strony do dołączenia' }) : null;
      const row = (l, el) => h('div', { class: 'tf' }, h('label', { text: l }), el);
      api.dialog(`Dołącz: ${f.name}`, h('div', {}, isPdf ? h('p', { class: 'note', text: `PDF: ${n} str. Każda strona zostanie osobnym obrazem.` }) : null, pages ? row(`Które strony (1–${n}, np. 1-3,5)`, pages) : null,
        row('Rodzaj', sel), row('Podstawa w aktach (k. …, nr zdjęcia)', pod), row('Opis', opis), row('Cel – po co to w terenie', cel),
        h('p', { class: 'note', text: 'Do pliku sprawy trafi kopia robocza (dłuższy bok do 3000 px). Oryginał zostaje w aktach.' })),
      [['Dołącz', () => {
        const v = { rodzaj: sel.value, podstawa: pod.value.trim(), opis: opis.value.trim(), cel: cel.value.trim(), pagesText: pages ? pages.value : '' };
        if (isPdf) { const pp = n > 1 ? parsePages(v.pagesText, n) : [1]; if (!pp || !pp.length) { api.toast('Niepoprawny zakres stron.'); return res(metaDialog(f, n, isPdf, v)); } v.pages = pp; }
        res(v);
      }, 'primary'], ['Anuluj', () => res(null)]]);
    });
  }

  async function addFiles(files) {
    for (const f of [...files]) {
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      let pdf = null, n = 1;
      try { if (isPdf) { api.toast('Odczyt PDF…'); pdf = await openPdf(f); n = pdf.numPages; } }
      catch (e) { api.dialog('Nie można dołączyć pliku', h('p', { text: e.message }), [['OK', null, 'primary']]); continue; }
      const meta = await metaDialog(f, n, isPdf);
      if (!meta) { if (pdf && pdf.destroy) pdf.destroy(); continue; }
      const pgs = isPdf ? meta.pages : [null];
      let i = 0;
      for (const pg of pgs) {
        i++;
        try {
          api.toast(isPdf ? `Przetwarzam stronę ${pg} (${i}/${pgs.length})…` : 'Przetwarzam obraz…');
          const r = isPdf ? await renderPdfPage(pdf, pg) : (await importImage(f))[0];
          const att = { id: nextId(meta.rodzaj), uid: uid(), rodzaj: meta.rodzaj, podstawa: meta.podstawa ? (isPdf && pgs.length > 1 ? `${meta.podstawa} (str. ${pg})` : meta.podstawa) : '', opis: meta.opis, cel: meta.cel,
            name: f.name + (isPdf ? ` (str. ${pg})` : ''), w: r.w, h: r.h, bytes: r.blob.size, rot: 0, ann: emptyAnn(), rows: [], thumb: await makeThumb(r.blob) };
          await blobPut(key(att), r.blob); cache.set(att.uid, await blobToDataUrl(r.blob));
          list().push(att); api.touch(); api.rerender();
        } catch (e) {
          if (e && e.name === 'QuotaExceededError') api.dialog('Brak miejsca w pamięci aplikacji', h('p', { text: 'Pamięć przeglądarki jest pełna. Zapisz plik sprawy („Zapisz plik”), usuń zbędne załączniki albo zwolnij miejsce na urządzeniu i spróbuj ponownie. Już dołączone załączniki są bezpieczne.' }), [['OK', null, 'primary']]);
          else api.dialog('Nie można dołączyć', h('p', { text: (e && e.message) || String(e) }), [['OK', null, 'primary']]);
          break;
        }
      }
      if (pdf && pdf.destroy) pdf.destroy();
    }
    const mb = estimateBytes() / 1048576; if (mb > 40) api.toast(`Uwaga: szacunkowy rozmiar pliku sprawy ${mb.toFixed(0)} MB – zapis i otwarcie mogą trwać dłużej.`);
  }

  function openAtt(att, returnView) {
    return openViewer(att, {
      getBlob, touch: api.touch, toast: api.toast, onClose: () => api.go(returnView || 'material'),
      tasksFor: id => (api.C().tasks || []).filter(t => t.zalacznik === id), gotoTask: () => api.go('zadania'),
      print: a => printMaterial([a]),
    });
  }

  // ---------- widok „Materiał z akt” ----------
  function renderView(main, back) {
    const atts = list();
    const box = h('div', { class: 'home material' }, back ? h('button', { type: 'button', class: 'small', text: `← Wróć: ${back.label}`, onclick: () => api.go(back.view) }) : null, h('h1', { text: 'Materiał z akt' }),
      h('p', { class: 'note', text: 'Szkic Policji i zdjęcia z akt – kopie robocze do oglądania w terenie bez internetu (oryginały zostają w aktach). Dołączaj na Macu lub iPadzie: JPG, PNG, HEIC, PDF (każda strona = osobny obraz).' }));
    const fi = h('input', { type: 'file', multiple: true, accept: 'image/*,.heic,.heif,.jpg,.jpeg,.png,.pdf,application/pdf', hidden: true });
    fi.addEventListener('change', () => { const fs = [...fi.files]; fi.value = ''; addFiles(fs); });
    const info = h('div', { class: 'minfo' }), stor = h('div', { class: 'minfo' });
    const fill = () => {
      const tot = atts.reduce((s, a) => s + (a.bytes || 0), 0), pts = atts.reduce((s, a) => s + (a.rows || []).length, 0);
      info.textContent = `Załączniki: ${atts.length} · kopie robocze razem ${fmtMB(tot)} · szacunkowy rozmiar pliku sprawy z załącznikami ${fmtMB(estimateBytes())} · punktów w tabelach: ${pts}`;
    };
    fill();
    box.append(h('div', { class: 'btns' }, h('button', { type: 'button', class: 'primary', text: '+ Dodaj plik (JPG, PNG, HEIC, PDF)', onclick: () => fi.click() }), atts.length ? h('button', { type: 'button', text: 'Drukuj materiał z akt', onclick: () => api.printAtts(atts) }) : null), fi, info, stor);
    storageInfo().then(si => {
      if (!si) { stor.textContent = 'Pamięć aplikacji: brak danych z przeglądarki.'; return; }
      const free = si.quota - si.usage, pct = si.quota ? si.usage / si.quota : 0;
      stor.textContent = `Pamięć aplikacji: użyto ${fmtMB(si.usage)} z limitu ${fmtMB(si.quota)} (${(pct * 100).toFixed(1)} %) · trwałe przechowywanie: ${si.persisted === null ? 'n/d' : si.persisted ? 'tak' : 'NIE'}`;
      if (pct > 0.6 || free < 300 * 1048576) { stor.classList.add('warn'); stor.textContent += ' · MAŁO MIEJSCA – zapisz plik sprawy i zwolnij pamięć przed dalszym dołączaniem.'; }
    });
    if (!atts.length) box.append(h('p', { class: 'note', text: 'Brak załączników. Dodaj szkic Policji i zdjęcia z akt, potrzebne do ustalenia odległości na miejscu zdarzenia.' }));
    const grid = h('div', { class: 'mgrid' });
    for (const a of atts) {
      const hasImg = cache.get(a.uid) !== null;
      grid.append(h('div', { class: 'mcard' },
        h('button', { type: 'button', class: 'mthumb', 'aria-label': `Otwórz ${a.id}`, onclick: () => openAtt(a) }, a.thumb ? h('img', { src: a.thumb, alt: a.id }) : h('span', { text: 'brak miniatury' })),
        h('div', { class: 'mmeta' },
          h('div', { class: 'mid' }, h('strong', { text: a.id }), h('span', { class: 'mkind', text: a.rodzaj }), hasImg ? null : h('span', { class: 'mmiss', text: 'brak obrazu – dołącz ponownie' })),
          h('div', { text: a.opis || '(bez opisu)' }),
          h('div', { class: 'msm', text: `Podstawa: ${a.podstawa || '—'}` }),
          a.cel ? h('div', { class: 'msm', text: `Cel: ${a.cel}` }) : null,
          h('div', { class: 'msm', text: `${a.w}×${a.h} px · ${fmtMB(a.bytes || 0)} · punktów: ${(a.rows || []).length}${(a.ann && (a.ann.strokes.length + a.ann.lines.length + a.ann.texts.length)) ? ' · są adnotacje' : ''}` }),
          h('div', { class: 'btns' }, h('button', { type: 'button', class: 'small primary', text: 'Otwórz', onclick: () => openAtt(a) }),
            h('button', { type: 'button', class: 'small danger', text: 'Usuń', onclick: () => api.ask('Usunąć załącznik?', `${a.id} (${a.opis || a.name}) wraz z adnotacjami i tabelą punktów zostanie usunięty ze sprawy.`, 'Usuń', () => removeAtt(a)) })))));
    }
    box.append(grid); main.append(box);
  }

  // ---------- wydruk: obraz z adnotacjami + tabela ----------
  async function printMaterial(atts) {
    const C = api.C(); let root = document.getElementById('print-root');
    if (!root) { root = h('div', { id: 'print-root' }); document.body.append(root); }
    root.replaceChildren(); const hd = C.header;
    for (const a of atts) {
      const b = await getBlob(a);
      const img = b ? h('img', { class: 'matimg', src: await composite(a, b), alt: a.id }) : h('p', { class: 'note', text: '(brak obrazu w pamięci urządzenia)' });
      const rows = (a.rows || []).map(r => h('tr', {}, ['pid', 'co', 'wynik', 'jednostka', 'przyrzad', 'nr_zdjecia', 'uwagi'].map(k => h('td', { text: r[k] || '' }))));
      const body = h('div', { class: 'matpage' }, h('h2', { text: `${a.id} · ${a.rodzaj}` }),
        h('div', { class: 'tsm', text: `Podstawa: ${a.podstawa || '—'}${a.opis ? ' · ' + a.opis : ''}${a.cel ? ' · Cel: ' + a.cel : ''} · kopia robocza – oryginał w aktach ${a.podstawa || ''}` }), img,
        rows.length ? h('table', { class: 'ttab' }, h('thead', {}, h('tr', {}, ['Punkt', 'Co to jest', 'Wynik', 'Jedn.', 'Przyrząd', 'Nr zdjęcia', 'Uwagi'].map(x => h('th', { text: x })))), h('tbody', {}, rows)) : null);
      root.append(h('table', { class: 'ptab' },
        h('thead', {}, h('tr', {}, h('td', {}, h('div', { class: 'phead' }, h('span', { text: 'Motoanalityka Dariusz Sadek · rzeczoznawca samochodowy' }), h('span', { text: 'Materiał z akt – ' + a.id }))))),
        h('tfoot', {}, h('tr', {}, h('td', {}, h('div', { class: 'pfoot' }, h('div', { class: 'psygn', text: `Sygn. / nr zlecenia: ${hd.sygnatura || '………………………'}${hd.organ ? ' · ' + hd.organ : ''}` }), h('div', { text: COPYRIGHT }))))),
        h('tbody', {}, h('tr', {}, h('td', {}, body)))));
    }
    document.body.classList.add('printing');
    addEventListener('afterprint', () => { document.body.classList.remove('printing'); root.replaceChildren(); }, { once: true });
    requestAnimationFrame(() => setTimeout(() => window.print(), 150));
  }

  return { renderView, addFiles, openAtt, getBlob, forSave, restoreFromFile, warm, gc, estimateBytes, printMaterial, removeAtt, list };
}
