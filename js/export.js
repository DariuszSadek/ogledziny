// „Eksport dla Claude”: Markdown z wypełnionymi polami w kolejności formularzy, z identyfikatorami pól.
const val = v => String(v).replace(/\r/g, '').trim();
const one = v => { const t = val(v); return t.includes('\n') ? '\n' + t.split('\n').map(l => '    > ' + l).join('\n') : ' ' + t; };
const id = s => '`[' + s + ']`';

function formSection(def, inst) {
  const d = inst.data || {};
  const out = [], empty = [];
  let filled = 0;
  for (const sec of def.sections) {
    const L = [];
    const has = k => { const v = d[k]; return v !== undefined && v !== '' && v !== false; };
    for (const b of sec.blocks) {
      if (b.k === 'fields') {
        for (const f of b.items) if (has(f.id)) { filled++; L.push(`- ${f.label || '(pole bez etykiety)'} ${id(f.id)}:${one(d[f.id])}`); }
      } else if (b.k === 'group') {
        const parts = [];
        let prevCheck = null;
        for (const o of b.items) {
          if (!has(o.id)) { if (o.type === 'check') prevCheck = o; continue; }
          filled++;
          if (o.type === 'check') { parts.push(`${o.label || '(zaznaczone)'} ${id(o.id)}`); prevCheck = o; }
          else parts.push(`${(o.label || (prevCheck && prevCheck.label) || 'inne').replace(/:\s*$/, '')}: ${val(d[o.id]).replace(/\n/g, ' / ')} ${id(o.id)}`);
        }
        if (parts.length) L.push(`- **${b.label}:** ${parts.join('; ')}`);
      } else if (b.k === 'checklist') {
        for (const c of b.items) if (has(c.id)) { filled++; L.push(`- ☑ ${c.label} ${id(c.id)}`); }
      } else if (b.k === 'table') {
        const gl = {}; for (const g of b.groups || []) for (let i = g.c0; i <= g.c1; i++) gl[i] = g.t;
        const head = i => ((gl[i] ? gl[i] + ' / ' : '') + (b.cols[i].head || '')).replace(/\n/g, ' ').trim() || `kol. ${i + 1}`;
        const nrows = b.rows.length + (inst.extra && inst.extra[b.prefix] || 0);
        for (let r = 1; r <= nrows; r++) {
          const cells = [];
          for (let c = 1; c <= b.cols.length; c++) {
            const k = `${b.prefix}.r${r}.c${c}`;
            if (has(k)) { filled++; cells.push(b.cols[c - 1].type === 'check' ? `${head(c - 1)} ☑ ${id(k)}` : `${head(c - 1)}: ${val(d[k]).replace(/\n/g, ' / ')} ${id(k)}`); }
          }
          if (cells.length) { const lab = (b.labels || [])[r - 1]; L.push(`- [wiersz ${r}${lab ? ' – ' + lab : ''}] ${cells.join(' | ')}`); }
        }
      } else if (b.k === 'figure') {
        const chk = [], txt = [];
        for (const sp of b.spots) if (has(sp.id)) { filled++; (sp.type === 'check' ? chk : txt).push(sp.type === 'check' ? `${sp.label || '(strefa bez opisu)'} ${id(sp.id)}` : `${sp.label || 'pole'} ${id(sp.id)}: ${val(d[sp.id]).replace(/\n/g, ' / ')}`); }
        if (chk.length) L.push(`- Zaznaczone na rysunku: ${chk.join('; ')}`);
        for (const t of txt) L.push(`- ${t}`);
      } else if (b.k === 'sketch') {
        const sk = d[b.id];
        if (sk && sk.strokes && sk.strokes.length) { filled++; L.push(`- Szkic sytuacyjny ${id(b.id)}: narysowany (${sk.strokes.length} kresek; rysunek w pliku sprawy, nie w tym eksporcie)`); }
      }
    }
    const uk = `${def.id}.${sec.id}.uwagi`;
    if (has(uk)) { filled++; L.push(`- Uwagi ${id(uk)}:${one(d[uk])}`); }
    if (L.length) out.push(`### ${sec.title || 'Wstęp'}\n\n${L.join('\n')}\n`); else if (sec.title) empty.push(sec.id);
  }
  const orph = Object.entries(inst.orphans || {});
  const head = `## ${inst.formId} · ${inst.label} – ${def.title}\n\nWypełnionych pól: ${filled}. Sekcje bez wpisów: ${empty.length ? empty.join(', ') : 'brak'}.\n`;
  const tail = orph.length ? `\n### Pola nieprzeniesione z dawnej wersji formularza (${orph.length})\n\n${orph.map(([k, v]) => `- ${id(k)}: ${typeof v === 'string' ? val(v).replace(/\n/g, ' / ') : JSON.stringify(v)}`).join('\n')}\n` : '';
  return { text: head + '\n' + out.join('\n') + tail, filled };
}

export function toMarkdown(C, DEFS, only = null) {
  const now = new Date().toISOString();
  const H = C.header || {};
  const insts = only ? [only] : C.forms;
  const parts = [];
  let total = 0;
  for (const inst of insts) {
    const def = DEFS[inst.formId];
    if (!def) { parts.push(`## ${inst.formId} · ${inst.label}\n\n(brak definicji formularza w tej wersji aplikacji; dane w pliku sprawy)\n`); continue; }
    const r = formSection(def, inst); total += r.filled; parts.push(r.text);
  }
  const meta = [
    '# Oględziny – eksport dla Claude', '',
    `- Sygnatura / nr zlecenia: ${H.sygnatura || '(nie wpisano)'}`,
    `- Organ: ${H.organ || '(nie wpisano)'}`,
    `- Data: ${H.data || '(nie wpisano)'}`,
    `- Formularze w eksporcie: ${insts.map(i => `${i.formId} ${i.label}`).join('; ') || 'brak'}`,
    `- Wersje definicji: ${Object.entries(C.defVersions || {}).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    `- Schemat pliku sprawy: ${C.schema}; wygenerowano: ${now}`,
    `- Razem wypełnionych pól: ${total}`, '',
    'Układ: `[identyfikator pola]` stoi przy każdej wartości; puste pola i niezaznaczone opcje pominięto. Wartości liczbowe są zapisane tak, jak wpisano (przecinek lub kropka).', '',
  ];
  if ((C.tasks || []).length) meta.push('## Zadania z analizy akt', '', ...C.tasks.map(t => `- ${JSON.stringify(t)}`), '');
  return meta.join('\n') + '\n' + parts.join('\n');
}
