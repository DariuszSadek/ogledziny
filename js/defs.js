// Indeks definicji formularza: poprawne identyfikatory pól, tabele (prefiksy), szkice.
export function indexDef(def) {
  const ids = new Set(), tables = new Map(), sketches = new Set();
  for (const s of def.sections) {
    ids.add(`${def.id}.${s.id}.uwagi`);
    for (const b of s.blocks) {
      if (b.k === 'fields' || b.k === 'checklist' || b.k === 'group') for (const f of b.items) ids.add(f.id);
      else if (b.k === 'table') {
        tables.set(b.prefix, { ncols: b.cols.length, nrows: b.rows.length });
        for (const r of b.rows) for (const c of r) if (c) ids.add(c.id);
      } else if (b.k === 'figure') { for (const sp of b.spots) ids.add(sp.id); }
      else if (b.k === 'sketch') { ids.add(b.id); sketches.add(b.id); }
    }
  }
  return { ids, tables, sketches };
}
// id dodatkowego wiersza tabeli: <prefix>.r<N>.c<M>, N > liczba wierszy z wzoru
export function extraRowKey(idx, id) {
  const m = /^(.*)\.r(\d+)\.c(\d+)$/.exec(id);
  if (!m) return null;
  const t = idx.tables.get(m[1]);
  if (!t || +m[2] <= t.nrows || +m[3] < 1 || +m[3] > t.ncols) return null;
  return { prefix: m[1], row: +m[2] };
}
