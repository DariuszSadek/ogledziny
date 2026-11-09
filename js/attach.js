// Materiał z akt: import obrazów (JPG/PNG/HEIC) i stron PDF, kopie robocze (JPEG), miniatury, adnotacje.
export const MAX_EDGE = 3000, JPEG_Q = 0.82;

const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const toBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('toBlob')), type, q));

export async function decodeImage(file) {
  try { return await createImageBitmap(file); } catch { /* spróbuj przez <img> */ }
  const url = URL.createObjectURL(file);
  try { const img = new Image(); img.src = url; await img.decode(); return img; }
  catch { throw new Error(`Nie udało się odczytać pliku „${file.name}”. Jeśli to zdjęcie HEIC, to ta przeglądarka go nie obsługuje – zapisz je jako JPEG (np. w aplikacji Zdjęcia: Udostępnij → Zapisz w Plikach jako JPEG) i dołącz ponownie.`); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 5000); }
}

// Kopia robocza: dłuższy bok <= MAX_EDGE, tło białe (PNG z przezroczystością), JPEG.
export async function toWorkingCopy(src, sw, sh) {
  const k = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
  const c = cvs(w, h), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
  const blob = await toBlob(c, 'image/jpeg', JPEG_Q);
  return { blob, w, h };
}

export async function importImage(file) {
  const src = await decodeImage(file);
  const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
  const r = await toWorkingCopy(src, sw, sh);
  if (src.close) src.close();
  return [{ ...r, label: '' }];
}

export async function makeThumb(blob, maxEdge = 360) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const c = cvs(Math.round(bmp.width * k), Math.round(bmp.height * k));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  return c.toDataURL('image/jpeg', 0.7);
}

// ---------- PDF (pdf.js, lokalnie, wersja legacy) ----------
let pdfP = null;
async function pdfjs() {
  if (!pdfP) pdfP = import('../vendor/pdfjs/pdf.min.mjs').then(m => { m.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href; return m; });
  return pdfP;
}
export async function openPdf(file) {
  const lib = await pdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  try { return await lib.getDocument({ data, isEvalSupported: false }).promise; }
  catch (e) { throw new Error(`Nie udało się otworzyć PDF „${file.name}” (${e.name || e}). Plik może być uszkodzony lub zabezpieczony hasłem.`); }
}
export async function renderPdfPage(doc, n) {
  const page = await doc.getPage(n);
  const v1 = page.getViewport({ scale: 1 });
  const s = MAX_EDGE / Math.max(v1.width, v1.height);
  const vp = page.getViewport({ scale: s });
  const c = cvs(Math.round(vp.width), Math.round(vp.height)), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  await page.render({ canvas: c, canvasContext: x, viewport: vp }).promise;
  const blob = await toBlob(c, 'image/jpeg', JPEG_Q);
  page.cleanup();
  return { blob, w: c.width, h: c.height };
}
// „1-3,5” -> [1,2,3,5]
export function parsePages(text, max) {
  const out = new Set();
  for (const part of String(text).split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part); if (!m) return null;
    const a = +m[1], b = m[2] ? +m[2] : a; if (a < 1 || b < a || b > max) return null;
    for (let i = a; i <= b; i++) out.add(i);
  }
  return [...out].sort((a, b) => a - b);
}

// ---------- konwersje ----------
export const blobToDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
export function dataUrlToBlob(u) {      // bez fetch (CSP connect-src 'self' nie obejmuje data:)
  const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(u); if (!m) throw new Error('zły data URL');
  const bin = atob(m[3]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return new Blob([a], { type: m[1] });
}

// ---------- adnotacje (współrzędne znormalizowane do szerokości obrazu) ----------
export const emptyAnn = () => ({ v: 1, strokes: [], lines: [], texts: [], points: [] });
export const COLORS = { red: '#e0001b', blue: '#0a4fd6', black: '#101010' };

export function drawAnn(ctx, ann, W, hl = null, scale = 1) {
  const lw = (f) => Math.max(2, f * W) * scale;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of ann.strokes) {
    if (!s.p.length) continue;
    ctx.beginPath(); ctx.strokeStyle = COLORS[s.c] || COLORS.red; ctx.lineWidth = lw(s.s || 0.0035);
    ctx.moveTo(s.p[0][0] * W, s.p[0][1] * W);
    if (s.p.length === 1) ctx.lineTo(s.p[0][0] * W + .1, s.p[0][1] * W);
    for (let i = 1; i < s.p.length; i++) ctx.lineTo(s.p[i][0] * W, s.p[i][1] * W);
    ctx.stroke();
  }
  for (const l of ann.lines) {
    ctx.beginPath(); ctx.strokeStyle = COLORS[l.c] || COLORS.red; ctx.lineWidth = lw(l.s || 0.0035);
    ctx.moveTo(l.a[0] * W, l.a[1] * W); ctx.lineTo(l.b[0] * W, l.b[1] * W); ctx.stroke();
  }
  for (const t of ann.texts) {
    const fs = Math.max(14, 0.022 * W) * scale; ctx.font = `700 ${fs}px "Libre Baskerville", Georgia, serif`; ctx.textBaseline = 'top';
    const x = t.p[0] * W, y = t.p[1] * W, w = ctx.measureText(t.t).width;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x - 3, y - 2, w + 6, fs + 4);
    ctx.fillStyle = COLORS[t.c] || COLORS.red; ctx.fillText(t.t, x, y);
  }
  const r = 0.0125 * W * scale;
  for (const p of ann.points) {
    const x = p.x * W, y = p.y * W, on = hl === p.pid;
    if (on) { ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fillStyle = 'rgba(255,214,0,.35)'; ctx.fill(); ctx.lineWidth = r * 0.28; ctx.strokeStyle = '#ffd600'; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = on ? '#b00014' : COLORS.red; ctx.fill(); ctx.lineWidth = r * 0.22; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${r * 0.95}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.pid.replace(/^P/, ''), x, y + r * 0.04); ctx.textAlign = 'start';
    ctx.beginPath(); ctx.arc(x, y, r * 0.09, 0, 7); ctx.fillStyle = '#ffd600'; ctx.fill();
  }
  ctx.restore();
}

// Obraz z adnotacjami (do wydruku): z uwzględnieniem obrotu zapisanego przy załączniku.
export async function composite(att, blob, maxEdge = 2000) {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const c = cvs(w, h), x = c.getContext('2d'); x.drawImage(bmp, 0, 0, w, h); bmp.close();
  drawAnn(x, att.ann || emptyAnn(), w, null, 1);
  const rot = ((att.rot || 0) % 4 + 4) % 4;
  if (!rot) return c.toDataURL('image/jpeg', 0.85);
  const o = cvs(rot % 2 ? h : w, rot % 2 ? w : h), ox = o.getContext('2d');
  ox.translate(o.width / 2, o.height / 2); ox.rotate(rot * Math.PI / 2); ox.drawImage(c, -w / 2, -h / 2);
  return o.toDataURL('image/jpeg', 0.85);
}

export const fmtMB = b => (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB';
export async function storageInfo() {
  try {
    const e = await navigator.storage.estimate(); const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : null;
    return { usage: e.usage || 0, quota: e.quota || 0, persisted };
  } catch { return null; }
}
