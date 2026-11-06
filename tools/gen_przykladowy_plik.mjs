// Przykładowy plik sprawy (taki, jaki zapisuje aplikacja) zbudowany z przykładowego wkładu. Użycie: node tools/gen_przykladowy_plik.mjs <wyjście.json>
import { applyWklad } from '../js/wklad.js';
import fs from 'fs';
const root = new URL('../', import.meta.url);
const DEFS = {}; for (const id of ['00','01','02','03','04','05','06','07','08','09']) DEFS[id] = JSON.parse(fs.readFileSync(new URL(`forms/${id}.json`, root)));
let n = 0; const uid = () => `przyklad-${++n}`;
const C = { app: 'ogledziny', schema: 1, appVersion: '0.5.0', id: 'przyklad', created: '2026-11-06T08:00:00.000Z', defVersions: {}, header: { sygnatura: '', organ: '', data: '' }, forms: [], tasks: [], savedToFile: '2026-11-06T08:30:00.000Z' };
applyWklad(JSON.parse(fs.readFileSync(new URL('docs/claude_ai/przyklad_wkladu.json', root))), C, DEFS, uid);
fs.writeFileSync(process.argv[2], JSON.stringify(C, null, 1));
