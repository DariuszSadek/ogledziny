// Reguły [auto] formularza 10 (hulajnoga / UTO): scenariusze liczbowe i prawne.
import fs from 'fs'; import { autoText, autoLines } from '../js/rules10.js';
const def = JSON.parse(fs.readFileSync(new URL('../forms/10.json', import.meta.url)));
const ok = (v, m) => { console.log((v ? 'PASS ' : 'FAIL ') + m); if (!v) process.exitCode = 1; };
const mk = (o) => { const d = {}; for (const [k, v] of Object.entries(o)) { if (k.startsWith('T:')) { const [, n, r, c] = k.split(':'); d[`${def.tables[n]}.r${r}.c${c}`] = v; } else d[def.keys[k]] = v; } return k => d[k]; };
const R = (o, rule) => autoText(def, mk(o), rule);
const BASE = { 'D.1:elektryczny': true, 'D.2:2': true, 'D.3:jest': true, 'D.4:brak': true, 'D.5:brak': true, 'D.7:stojąca': true };
ok(/hulajnogi elektrycznej \(art\. 2 pkt 47b/.test(R(BASE, 'R1')), 'R1: hulajnoga (2 osie, kierownica, bez siedzenia i pedałów, stojąca)');
ok(/UTO \(art\. 2 pkt 47c/.test(R({ ...BASE, 'D.2:2': undefined, 'D.2:1': true }, 'R1')), 'R1: UTO (1 oś)');
ok(/Brak napędu/.test(R({ 'D.1:mięśniowy (brak silnika)': true }, 'R1')), 'R1: napęd mięśniowy');
ok(/siedzenie \/ pedały/.test(R({ ...BASE, 'D.4:brak': undefined, 'D.4:fabryczne': true }, 'R1')), 'R1: z siedzeniem – nie hulajnoga ani UTO');
ok(/Nie da się sklasyfikować/.test(R({ 'D.1:elektryczny': true }, 'R1')), 'R1: brak danych → uzupełnij sekcję D');
// R3 – prędkość
const M = (v, u, stan = 'zastany') => ({ 'T:M4:1:3': v, 'T:M4:1:2': stan, 'T:A6:2:6': u, 'T:A6:2:3': 'WZ/1/26' });
ok(/NZ – Konstrukcja nie ogranicza/.test(R({ ...BASE, ...M('24,5', '0,5 km/h') }, 'R3')), 'R3: 24,5 ± 0,5 > 20 → NZ');
ok(/Z \(/.test(R({ ...BASE, ...M('19', '0,5') }, 'R3')) && !/NZ –/.test(R({ ...BASE, ...M('19', '0,5') }, 'R3')), 'R3: 19 ± 0,5 → Z');
ok(/nierozstrzygnięte/.test(R({ ...BASE, ...M('20,3', '0,5') }, 'R3')), 'R3: 20,3 ± 0,5 → nierozstrzygnięte');
ok(/bez niepewności/.test(R({ ...BASE, ...M('25', '') }, 'R3')), 'R3: brak niepewności → ocena warunkowa');
ok(/dopisek|nie spełnia § 55d/.test(R({ ...BASE, ...M('24', '0,2') }, 'R1')) || /nie spełnia § 55d/.test(R({ ...BASE, ...M('24', '0,2') }, 'R1')), 'R1 pkt 5: dopisek o § 55d');
ok(/SN III KK 13\/22/.test(R({ ...BASE, ...M('24', '0,2') }, 'R1')), 'R1 pkt 6: kryteria SN dla v > 20');
// N.5a – pary
const N = { 'T:N5:1:1': 'A→B', 'T:N5:1:3': '22', 'T:N5:2:1': 'B→A', 'T:N5:2:3': '24', 'T:A6:3:6': '0,3', 'T:A6:3:3': 'X' };
ok(/23,0|23/.test(R({ ...BASE, ...N }, 'N5a')) && /NZ/.test(R({ ...BASE, ...N }, 'R3')), 'N.5a: para 22/24 → 23 km/h, R3 NZ');
ok(/D13|hamownia/.test(R({ ...BASE, ...M('24,5', '0,5'), ...N }, 'D13')) && /jazda testowa/.test(R({ ...BASE, ...M('24,5', '0,5'), ...N }, 'D13')), 'D.13: hamownia ma pierwszeństwo, pokazuje też jazdę testową');
// R2
const r2 = o => autoLines(def, mk(o), 'R2').map(x => x.lvl + ':' + x.t).join('|');
ok(/NZ:E\.1 długość/.test(r2({ 'E.1': '1,45', 'E.1u': '0,02' })), 'R2: długość 1,45 ± 0,02 > 1,4 → NZ');
ok(!/NZ:E\.1/.test(r2({ 'E.1': '1,39', 'E.1u': '0,01' })), 'R2: długość 1,39 ± 0,01 → Z');
ok(/NZ:E\.5 masa/.test(r2({ ...BASE, 'E.5': '31', 'E.5u': '0,5' })), 'R2: masa 31 ± 0,5 hulajnoga > 30 → NZ');
ok(/dla UTO limitu brak/.test(r2({ ...BASE, 'D.2:2': undefined, 'D.2:1': true, 'E.5': '31', 'E.5u': '0,5' })), 'R2: UTO – masa ND');
ok(/nierozstrzygnięte/.test(r2({ 'E.2': '0,91', 'E.2u': '0,02' })), 'R2: szerokość 0,91 ± 0,02 → nierozstrzygnięte');
// R4
ok(/aₕ = 6,94 m\/s²/.test(R({ 'T:N7:1:2': '30', 'T:N7:1:3': '5' }, 'R4')), 'R4: v₀ 30 km/h, s 5 m → 6,94 m/s²');
// R5–R8
ok(/I\.2 światło pozycyjne tylne – NZ/.test(R({ ...BASE, 'T:I:2:8': true }, 'R5')), 'R5: I.2 NZ');
ok(!/I\.4/.test(R({ ...BASE, 'D.2:2': undefined, 'D.2:1': true, 'T:I:4:8': true }, 'R5').replace('UTO: wiersze I.4 i I.5 – WT = ND.', '')), 'R5: UTO – I.4/I.5 → ND');
ok(/G\.16/.test(R({ ...BASE, 'N.7b:NZ': true }, 'R6')), 'R6: hamulec NZ');
ok(/B\.5 – NZ/.test(R({ 'B.5:brak': true }, 'R7')) && /B\.5 – NZ/.test(R({ 'B.5b:nie': true }, 'R7')), 'R7: brak numeru / nieczytelny → NZ');
ok(/podpórka – NZ/.test(R({ ...BASE, 'C.9:brak': true }, 'R8')) && R({ ...BASE, 'D.2:2': undefined, 'D.2:1': true, 'C.9:brak': true }, 'R8') === '', 'R8: hulajnoga bez podpórki NZ, UTO bez reguły');
// R9–R12
ok(/przed 1\.01\.2022/.test(R({ 'B.8:przed 1.01.2022': true }, 'R9')) && /Ustal datę/.test(R({ 'B.8:nie ustalono': true }, 'R9')), 'R9: data wprowadzenia do obrotu');
ok(/do 13 lat/.test(R({ 'A.1': '2026-05-01', 'O.1': '12' }, 'R10')) && /do 10 lat/.test(R({ 'A.1': '2026-02-01', 'O.1': '9' }, 'R10')) && R({ 'A.1': '2026-02-01', 'O.1': '11' }, 'R10') === '', 'R10: wiek 13 od 3.03.2026, 10 wcześniej');
ok(/kasku do 16 lat/.test(R({ 'A.1': '2026-07-01', 'O.1': '15', 'O.2:nie': true }, 'R11')) && R({ 'A.1': '2026-05-01', 'O.1': '15', 'O.2:nie': true }, 'R11') === '', 'R11: kask od 3.06.2026');
ok(/art\. 33a ust\. 2/.test(R({ 'O.6:chodnik / droga dla pieszych': true }, 'R12')) && /art\. 20 ust\. 6 pkt 4/.test(R({ 'O.8v': '25' }, 'R12')), 'R12: chodnik, prędkość > 20');
// R13, R14
ok(/hamownia.*bez numeru świadectwa/.test(R({ 'T:M4:1:3': '20' }, 'R13')), 'R13: hamownia bez świadectwa');
ok(/przekracza maksymalne obciążenie/.test(R({ 'E.6': '100', 'E.7': '110' }, 'R14')), 'R14: masa kierującego > obciążenie');
ok(/✗/.test(R({ ...BASE, ...M('24,5', '0,5'), 'B.5:brak': true }, 'R1all')), 'R.1: zbiorcza lista z niezgodnościami');
