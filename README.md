# Oględziny

Aplikacja webowa (HTML/CSS/JS) do elektronicznego wypełniania formularzy oględzin na iPadzie, bez internetu. Na MacBooku służy do przeglądania i eksportu (etapy 3–4).

© 2026 Motoanalityka Dariusz Sadek. Wszelkie prawa zastrzeżone. Kopiowanie, rozpowszechnianie, modyfikowanie i wykorzystywanie wzorów formularzy, w całości lub w części, bez pisemnej zgody autora jest zabronione.

To repozytorium nie udziela żadnej licencji.

(Czcionka Libre Baskerville jest dołączona na jej własnej licencji SIL Open Font License 1.1 – plik `assets/fonts/OFL.txt`; licencja ta dotyczy wyłącznie czcionki.)

## Stan
Etap 2 (moduł „Nowa sprawa”): wczytywanie „wkładu” od Claude AI (formularze wstępnie wypełnione danymi z akt + lista zadań z wynikami w terenie); format i paczka dla Claude AI: `docs/claude_ai/`, generator `tools/gen_claude_pack.py`.
Etap 4: wydruk do PDF (przycisk „Drukuj / PDF”, okno drukowania systemu → „Zapisz jako PDF”) i „Eksport dla Claude” (Markdown z polami i ich identyfikatorami).
Etap 3: wszystkie formularze (00 i 01–09), rysunki wektorowe z klikalnymi strefami (02–05, 07), zapis/odczyt pliku sprawy, praca offline. Raport zgodności z wzorami: `docs/raport_zgodnosci.md`.

## Prywatność
Aplikacja nie wysyła danych nigdzie (CSP w `index.html`: tylko własne pliki). Pliki spraw i dane osobowe nie trafiają do repozytorium (`.gitignore` + `tools/privacy_check.py` jako hook pre-commit).

## Struktura
- `forms/NN.json` – definicje formularzy (wzór zmienia się edycją definicji, nie kodu)
- `js/engine.js` – silnik renderujący; `js/migrate.js` – przenoszenie danych po identyfikatorach
- `docs/slownik_pol.{json,md}` – słownik pól (generowany: `python3 tools/gen_dict.py`)
- `tools/gen_form.py` – generator definicji z PDF wzoru; `tools/check_form.py`, `tools/check_text.py`, `tools/gen_report.py` – kontrola zgodności
- `tests/` – testy (Playwright + Chrome; `node tests/migrate_alias.mjs` bez przeglądarki)
- `tools/build.py` – po każdej zmianie plików: nowa wersja cache `sw.js` i `js/version.js`

## Regeneracja definicji
`python3 tools/gen_form.py <pdf> NN forms/NN.json` generuje definicję od zera (identyfikatory są deterministyczne); potem `python3 tools/make_aliases.py` dopisuje aliasy zmienionych identyfikatorów i podnosi wersję definicji, żeby stare pliki spraw otwierały się bez strat. Na końcu: `tools/gen_dict.py`, `tools/build.py`.
