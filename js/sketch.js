// Szkic sytuacyjny: rysowanie piórem (Apple Pencil) i palcem, gumka (usuwa kreski), cofnij.
// Dane: { v:1, ar:<wysokość/szerokość>, strokes:[{t:'pen',s:<grubość 0..1 szerokości>,p:[[x,y],...]}] } – współrzędne znormalizowane do szerokości.
const AR = 590 / 527;
export function createSketch(value, onChange) {
  const data = value && value.strokes ? { v: 1, ar: value.ar || AR, strokes: value.strokes.slice() } : { v: 1, ar: AR, strokes: [] };
  const history = [];
  let tool = 'pen', fingerDraw = true;
  const root = document.createElement('div'); root.className = 'sketchbox';
  const bar = document.createElement('div'); bar.className = 'sketchbar';
  const cv = document.createElement('canvas'); cv.className = 'sketch';
  const mk = (txt, fn, cls = 'small') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = txt; b.addEventListener('click', fn); bar.append(b); return b; };
  const bPen = mk('Pióro', () => setTool('pen'));
  const bEr = mk('Gumka', () => setTool('eraser'));
  const bUndo = mk('Cofnij', undo);
  const bClear = mk('Wyczyść', () => { if (data.strokes.length && confirm('Wyczyścić cały szkic?')) { push(); data.strokes = []; draw(); changed(); } }, 'small danger');
  const bMode = mk('Palec: rysuje', () => { fingerDraw = !fingerDraw; bMode.textContent = fingerDraw ? 'Palec: rysuje' : 'Palec: przewija'; cv.classList.toggle('scroll', !fingerDraw); });
  bMode.title = 'Przełącz, czy palec rysuje, czy przewija stronę (Apple Pencil zawsze rysuje)';
  root.append(bar, cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0;
  function setTool(t) { tool = t; bPen.classList.toggle('on', t === 'pen'); bEr.classList.toggle('on', t === 'eraser'); }
  setTool('pen');
  function push() { history.push(data.strokes.slice()); if (history.length > 60) history.shift(); }
  function undo() { if (!history.length) return; data.strokes = history.pop(); draw(); changed(); }
  function changed() { onChange({ v: 1, ar: data.ar, strokes: data.strokes }); }
  function fit() {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 600;
    W = Math.round(w * dpr); H = Math.round(w * data.ar * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    cv.style.height = (w * data.ar) + 'px';
    draw();
  }
  function grid() {
    ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = '#d5deed';
    const step = W * (14.17 / 527.3); // 5 mm przy A4
    ctx.beginPath();
    for (let x = step; x < W; x += step) { ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, H); }
    for (let y = step; y < H; y += step) { ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(W, Math.round(y) + .5); }
    ctx.stroke(); ctx.restore();
  }
  function stroke(s) {
    if (!s.p.length) return;
    ctx.beginPath(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#10243f'; ctx.lineWidth = Math.max(1.2, s.s * W);
    ctx.moveTo(s.p[0][0] * W, s.p[0][1] * W);
    if (s.p.length === 1) ctx.lineTo(s.p[0][0] * W + .1, s.p[0][1] * W);
    for (let i = 1; i < s.p.length; i++) ctx.lineTo(s.p[i][0] * W, s.p[i][1] * W);
    ctx.stroke();
  }
  function draw() { ctx.clearRect(0, 0, W, H); grid(); for (const s of data.strokes) stroke(s); if (cur) stroke(cur); }
  let cur = null, erasing = false, erasedAny = false;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.width]; };
  function eraseAt(p) {
    const rad = 0.018, keep = data.strokes.filter(s => !s.p.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < rad));
    if (keep.length !== data.strokes.length) { if (!erasedAny) { push(); erasedAny = true; } data.strokes = keep; draw(); }
  }
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' && !fingerDraw) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const p = pos(e);
    if (tool === 'eraser') { erasing = true; erasedAny = false; eraseAt(p); }
    else cur = { t: 'pen', s: e.pointerType === 'pen' ? 0.0042 : 0.0055, p: [p] };
    draw();
  });
  cv.addEventListener('pointermove', e => {
    if (!cur && !erasing) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) { const p = pos(ev); if (erasing) eraseAt(p); else cur.p.push(p); }
    draw();
  });
  const end = () => {
    if (cur) { push(); data.strokes.push({ t: cur.t, s: cur.s, p: cur.p.map(q => [+q[0].toFixed(4), +q[1].toFixed(4)]) }); cur = null; draw(); changed(); }
    if (erasing) { erasing = false; if (erasedAny) changed(); }
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  new ResizeObserver(() => fit()).observe(cv);
  requestAnimationFrame(fit);
  return root;
}
