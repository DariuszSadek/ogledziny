// Test wkładu: przykład z docs/wklad/przyklad_wkladu.json musi się wczytać bez pominięć; sprawdza też odrzucanie błędów.
import { applyWklad, parseWklad, reportWklad } from '../js/wklad.js';
import fs from 'fs';
const root = new URL('../', import.meta.url);
const DEFS = {}; for (const id of ['00','01','02','03','04','05','06','07','08','09']) DEFS[id] = JSON.parse(fs.readFileSync(new URL(`forms/${id}.json`, root)));
const ok = (v, m) => { console.log((v ? 'PASS ' : 'FAIL ') + m); if (!v) process.exitCode = 1; };
let n = 0; const uid = () => 'u' + (++n);
const mk = () => ({ header: { sygnatura: '', organ: '', data: '' }, forms: [], tasks: [], defVersions: {} });
const text = fs.readFileSync(new URL('docs/wklad/przyklad_wkladu.json', root), 'utf8');
const C = mk(); const R = applyWklad(parseWklad('Oto wkład:\n```json\n' + text + '\n```\nKoniec'), C, DEFS, uid);
ok(R.rejected.length === 0 && R.warnings.length === 0, 'przykład bez pominięć i ostrzeżeń: ' + reportWklad(R).split('\n')[0]);
ok(C.forms.length === 5 && C.tasks.length === 4 && C.header.sygnatura === 'II K 123/26', 'formularze 5, zadania 4, nagłówek');
ok(C.forms.find(f => f.ref === 'A').data['03.B.1'] === 'Opel' && C.forms.find(f => f.ref === 'A').data['03.B.10'] === true, 'pola tekstowe i wyboru');
ok(C.tasks.find(t => t.id === 'Z04').iid === null && C.tasks.find(t => t.id === 'Z01').iid === C.forms.find(f => f.ref === 'M').iid, 'przypisanie zadań do formularzy (ref) i ogólnych');
ok(C.notesGeneral.length === 2 && C.forms.find(f => f.ref === 'K').reminders.length === 2, 'przypomnienia i uwagi ogólne');
// błędy – nic po cichu
const bad = { format: 'ogledziny-wklad', wersja: 1, formularze: [{ ref: 'X', formularz: '77' }, { ref: 'A', formularz: '03', pola: { '03.B.1': 'ok', '03.Q.9': 'x', '03.B.9': 'tak?', '03.B.2': { a: 1 }, '03.E.1': 'tekst' } }], zadania: [{ czynnosc: '' }, { czynnosc: 'Zadanie z błędnym polem', formularz: 'A', pole: '03.Z.99' }, { czynnosc: 'Zadanie do nieznanego', formularz: 'ZZ' }] };
const C2 = mk(); const R2 = applyWklad(bad, C2, DEFS, uid);
ok(R2.rejected.length >= 5 && C2.forms.length === 1 && C2.forms[0].data['03.B.1'] === 'ok', 'błędy trafiają do raportu (' + R2.rejected.length + ' pominięć), poprawne pola wczytane');
ok(R2.warnings.length === 2 && C2.tasks.length === 2, 'ostrzeżenia: pole nieistniejące i nieznany formularz zadania');
let threw = false; try { applyWklad({ format: 'inny' }, mk(), DEFS, uid); } catch { threw = true; } ok(threw, 'obcy plik odrzucony z komunikatem');
// dołączanie do istniejącej sprawy nie nadpisuje nagłówka
const C3 = mk(); C3.header.sygnatura = 'MOJA'; applyWklad(JSON.parse(text), C3, DEFS, uid); ok(C3.header.sygnatura === 'MOJA' && C3.header.organ === 'Sąd Rejonowy w Kielcach', 'dołączanie nie nadpisuje wpisanego nagłówka');
// wersja 2: załączniki „do dołączenia”
{
  const C = mk(); const R = applyWklad(JSON.parse(text), C, DEFS, uid);
  ok(C.attachments.length === 2 && C.attachments.every(a => a.oczekuje && a.uid && a.rows.length === 0) && R.attachments === 2, 'v2: dwa załączniki jako miejsca do dołączenia');
  ok(C.tasks.find(t => t.id === 'Z01').zalacznik === 'S1', 'v2: zadanie powiązane z załącznikiem');
  const R2 = applyWklad(JSON.parse(text), C, DEFS, uid);
  ok(C.attachments.map(a => a.id).join() === 'S1,F1,S2,F2' && C.tasks.find(t => t.id === 'Z01*').zalacznik === 'S2', 'v2: ponowne dołączenie nadaje nowe numery i przemapowuje zadania (' + R2.warnings.length + ' ostrzeżeń)');
  const w1 = { format: 'ogledziny-wklad', wersja: 1, zadania: [{ czynnosc: 'x' }] }; const C1 = mk(); const R1 = applyWklad(w1, C1, DEFS, uid);
  ok(R1.warnings.length === 0 && !C1.attachments.length && C1.tasks[0].zalacznik === '', 'v1 nadal się wczytuje');
  const bd = { format: 'ogledziny-wklad', wersja: 2, zalaczniki: [{ id: 'X9' }, { rodzaj: 'szkic' }], zadania: [{ czynnosc: 'y', zalacznik: 'S7' }] }; const Cb = mk(); const Rb = applyWklad(bd, Cb, DEFS, uid);
  ok(Rb.rejected.length === 1 && Cb.attachments.length === 1 && Rb.warnings.length === 2, 'v2: błędy w raporcie (brak rodzaju, brak podstawy, zły zalacznik)');
}
