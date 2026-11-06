# Raport zgodności: wzory PDF ↔ definicje ↔ aplikacja

Wygenerowano automatycznie (tools/gen_report.py). Wynik ogólny: **BRAK BRAKUJĄCYCH PÓL – 0**.

| Formularz | Pola PDF (tekst / wybór) | W definicji | W aplikacji (DOM) | Brakujące | Nadmiarowe | Niezgodny typ | Pola tylko w aplikacji („Uwagi”) | Rysunki / strefy | Tabele | Wynik |
|---|---|---|---|---|---|---|---|---|---|---|
| 00 Karta czynności | 373 (167 / 206) | 373 | 373 | 0 | 0 | 0 | 12 | 0 / 0 | 8 | OK |
| 01 Miejsce zdarzenia | 525 (381 / 144) | 525 | 525 | 0 | 0 | 0 | 12 | 0 / 0 | 5 | OK |
| 02 Motocykl | 1278 (380 / 898) | 1278 | 1278 | 0 | 0 | 0 | 16 | 2 / 119 | 16 | OK |
| 03 Samochód osobowy | 2119 (607 / 1512) | 2119 | 2119 | 0 | 0 | 0 | 17 | 2 / 92 | 20 | OK |
| 04 Samochód ciężarowy | 2182 (682 / 1500) | 2182 | 2182 | 0 | 0 | 0 | 19 | 2 / 90 | 21 | OK |
| 05 Furgon / autobus | 2259 (694 / 1565) | 2259 | 2259 | 0 | 0 | 0 | 19 | 2 / 88 | 21 | OK |
| 06 Silnik | 888 (310 / 578) | 888 | 888 | 0 | 0 | 0 | 15 | 0 / 0 | 14 | OK |
| 07 Ogumienie | 356 (147 / 209) | 356 | 356 | 0 | 0 | 0 | 13 | 4 / 36 | 5 | OK |
| 08 Rzecz | 319 (185 / 134) | 319 | 319 | 0 | 0 | 0 | 13 | 0 / 0 | 6 | OK |
| 09 Rejestr zdjęć i przedmiotów | 182 (176 / 6) | 182 | 182 | 0 | 0 | 0 | 3 | 0 / 0 | 3 | OK |

Razem: pola PDF 10481, w definicjach 10481, w aplikacji 10481 (+139 pól „Uwagi” dodanych zgodnie z wymaganiem, brak ich we wzorach PDF), brakujących 0.

## Jak sprawdzono

1. **Pola:** nazwy wszystkich pól AcroForm odczytane z PDF (pypdf) zestawione z polami w definicjach (`forms/NN.json`, pole `pdf`) – brakujące, nadmiarowe, zduplikowane.
2. **Aplikacja:** każdy formularz wyrenderowany w przeglądarce (tests/compliance.mjs); identyfikatory elementów DOM zestawione z definicją; typ elementu (pole tekstowe / pole wyboru) zestawiony z typem pola PDF.
3. **Tekst:** każdy fragment tekstu wzoru (≥ 4 znaki) musi występować w definicji (audyt w gen_form.py); dodatkowo bilans znaków PDF ↔ definicja.

## Uwagi

- 01: pominięto 3 pola stron kontynuacji 4a–4c (zgodnie z zadaniem; pole opisu H rośnie z tekstem).
- Bilans znaków wykazuje niewielkie niedobory wyłącznie tam, gdzie PDF powtarza nagłówek tabeli na kolejnej stronie lub w kolejnej tabeli o tym samym układzie – w aplikacji tabela jest ciągła (jeden nagłówek), więc powtórzenie nie występuje.
- „Dodaj wiersz” dodaje pola poza zakresem PDF (identyfikatory `…rN.cM`, N większe niż liczba wierszy wzoru).
- Pola tekstowe nie mają limitów długości (MaxLen z 00 pominięto zgodnie z decyzją użytkownika).
- Pola dla rysunków (02–05, 07) są strefami klikalnymi/polami w położeniach pól PDF na rysunku wektorowym.

