// Test jednostkowy migracji: przeniesienie po aliasach, osierocone pola, dodatkowe wiersze, nieznany formularz.
import { migrate } from '../js/migrate.js';
import fs from 'fs';
const def = JSON.parse(fs.readFileSync(new URL('../forms/01.json', import.meta.url)));
def.defVersion = '1.1.0'; def.aliases = { '01.A.OLD1': '01.A.1', '01.A.OLD2': '01.A.OLD1' };   // łańcuch aliasów
const c = { schema: 1, defVersions: { '01': '1.0.0' }, forms: [
  { iid: 'a', formId: '01', label: 'X', data: { '01.A.OLD2': 'data', '01.A.2': '12:00', '01.Q.1': 'zginęło?', '01.G.t1.r30.c1': 'dodatkowy wiersz', '01.G.t1.r5.c1': 'wiersz z wzoru' } },
  { iid: 'b', formId: '99', label: 'Nieznany', data: { x: 1 } }] };
const r = migrate(c, { '01': def });
const ok = (v, m) => { console.log((v ? 'PASS ' : 'FAIL ') + m); if (!v) process.exitCode = 1; };
const d = c.forms[0];
ok(d.data['01.A.1'] === 'data', 'alias łańcuchowy 01.A.OLD2 → 01.A.1');
ok(d.data['01.A.2'] === '12:00', 'pole bez zmian');
ok(d.orphans['01.Q.1'] === 'zginęło?' && r.orphaned.length === 1, 'nieprzenoszalne pole zachowane w orphans i w raporcie');
ok(d.data['01.G.t1.r30.c1'] === 'dodatkowy wiersz' && d.extra['01.G.t1'] === 2, 'dodatkowy wiersz tabeli rozpoznany (extra=' + d.extra['01.G.t1'] + ')');
ok(d.data['01.G.t1.r5.c1'] === 'wiersz z wzoru', 'wiersz z wzoru');
ok(c.forms[1].data.x === 1 && r.unknownForms.length === 1, 'nieznany formularz zachowany');
ok(c.defVersions['01'] === '1.1.0' && r.updated.length === 1, 'wersja definicji zaktualizowana + raport');
