// Plik zapisany wersją definicji z git (domyślnie HEAD~0 przed zmianą) otwiera się po zmianie układu formularza 00 bez utraty danych.
import { migrate } from '../js/migrate.js';
import { execSync } from 'child_process';
import fs from 'fs';
const ref = process.argv[2] || 'HEAD';
const old = JSON.parse(execSync(`git show ${ref}:forms/00.json`, { cwd: process.cwd() }).toString());
const now = JSON.parse(fs.readFileSync(new URL('../forms/00.json', import.meta.url)));
const ids = []; const w = o => { if (Array.isArray(o)) o.forEach(w); else if (o && typeof o === 'object') { if (o.id && o.pdf) ids.push([o.id, o.pdf]); Object.values(o).forEach(w); } }; w(old);
const data = {}; ids.forEach(([i], n) => { data[i] = 'v' + n; });
const c = { schema: 1, defVersions: { '00': old.defVersion }, forms: [{ iid: 'a', formId: '00', label: 'K', data }] };
const r = migrate(c, { '00': now });
const nm = {}; const w2 = o => { if (Array.isArray(o)) o.forEach(w2); else if (o && typeof o === 'object') { if (o.id && o.pdf) nm[o.pdf] = o.id; Object.values(o).forEach(w2); } }; w2(now);
let bad = 0; ids.forEach(([i, pdf], n) => { if (c.forms[0].data[nm[pdf]] !== 'v' + n) bad++; });
console.log(`pól ${ids.length}, przeniesionych poprawnie ${ids.length - bad}, osieroconych ${r.orphaned.length}, wersja ${old.defVersion} → ${now.defVersion}`);
if (bad || r.orphaned.length) { console.log('FAIL'); process.exitCode = 1; } else console.log('PASS migracja z poprzedniej wersji definicji 00');
