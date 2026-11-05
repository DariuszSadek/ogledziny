// Przeniesienie danych sprawy do bieżących definicji formularzy – po identyfikatorach.
// Nic nie ginie po cichu: pola bez odpowiednika trafiają do inst.orphans i do raportu.
import { indexDef, extraRowKey } from './defs.js';

export const SCHEMA = 1;

export function migrate(c, defs) {
  const report = { updated: [], moved: [], orphaned: [], unknownForms: [], notes: [] };
  if (c.schema > SCHEMA) report.notes.push(`Plik ma nowszy schemat (${c.schema}) niż aplikacja (${SCHEMA}) – możliwe pominięcie nieznanych elementów; dane nieznane zachowano.`);
  c.defVersions = c.defVersions || {};
  for (const inst of c.forms) {
    inst.data = inst.data || {}; inst.extra = inst.extra || {}; inst.orphans = inst.orphans || {};
    const def = defs[inst.formId];
    if (!def) {
      report.unknownForms.push(`${inst.label || inst.formId} (formularz ${inst.formId}) – brak definicji; dane zachowane bez zmian.`);
      continue;
    }
    const idx = indexDef(def);
    const oldV = c.defVersions[inst.formId];
    if (oldV && oldV !== def.defVersion) report.updated.push(`Formularz ${inst.formId}: definicja ${oldV} → ${def.defVersion}`);
    const aliases = def.aliases || {};
    const out = {}, extra = {};
    const put = (k, v, from) => {
      if (k in out) { inst.orphans[from] = v; report.orphaned.push({ inst: inst.label || inst.formId, id: from, value: v, why: `konflikt z polem ${k}` }); return; }
      out[k] = v;
    };
    for (const [k0, v] of Object.entries(inst.data)) {
      let k = k0, hops = 0;
      while (!idx.ids.has(k) && !extraRowKey(idx, k) && aliases[k] && hops++ < 20) k = aliases[k];
      if (idx.ids.has(k)) { put(k, v, k0); if (k !== k0) report.moved.push(`${inst.label || inst.formId}: ${k0} → ${k}`); continue; }
      const ex = extraRowKey(idx, k);
      if (ex) { out[k] = v; extra[ex.prefix] = Math.max(extra[ex.prefix] || 0, ex.row - idx.tables.get(ex.prefix).nrows); continue; }
      inst.orphans[k0] = v;
      report.orphaned.push({ inst: inst.label || inst.formId, id: k0, value: v, why: 'brak pola w bieżącej definicji' });
    }
    inst.data = out; inst.extra = extra;
    c.defVersions[inst.formId] = def.defVersion;
  }
  return report;
}

export function reportText(r) {
  const L = [];
  if (r.notes.length) L.push(...r.notes);
  if (r.updated.length) L.push('Zmiana wersji definicji:', ...r.updated.map(x => ' • ' + x));
  if (r.moved.length) L.push('Pola przeniesione na nowe identyfikatory:', ...r.moved.map(x => ' • ' + x));
  if (r.unknownForms.length) L.push('Formularze bez definicji:', ...r.unknownForms.map(x => ' • ' + x));
  if (r.orphaned.length) L.push(`POLA, KTÓRYCH NIE DAŁO SIĘ PRZENIEŚĆ (${r.orphaned.length}) – zachowane w pliku:`,
    ...r.orphaned.map(o => ` • [${o.inst}] ${o.id} = ${JSON.stringify(o.value).slice(0, 120)} (${o.why})`));
  return L.join('\n');
}
export const needsAttention = r => r.orphaned.length || r.unknownForms.length || r.moved.length || r.updated.length || r.notes.length;
