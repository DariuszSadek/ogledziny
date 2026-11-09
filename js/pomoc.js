// Krótka instrukcja w aplikacji (działa offline): przycisk „Pomoc” na pasku.
import { h } from './engine.js';

export const POLECENIE = 'Przygotuj wkład do formularzy oględzin dla tej sprawy.';

async function kopiuj(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* awaryjnie poniżej */ }
  const ta = h('textarea', { 'aria-hidden': 'true' }); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.focus(); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove(); return ok;
}

const sec = (title, ...items) => h('section', { class: 'help-sec' }, h('h3', { text: title }), ...items);
const ol = (...li) => h('ol', {}, li.map(t => h('li', {}, t)));
const ul = (...li) => h('ul', {}, li.map(t => h('li', {}, t)));

export function showHelp({ dialog, toast }) {
  const copyBtn = (label, getText, msg) => h('button', { type: 'button', class: 'small', text: label, onclick: async () => {
    let t; try { t = await getText(); } catch { return toast('Nie udało się pobrać tekstu.'); }
    toast((await kopiuj(t)) ? msg : 'Nie udało się skopiować – zaznacz tekst ręcznie.');
  } });
  const body = h('div', { class: 'help' },
    sec('1. Wkład do formularzy (przed oględzinami)',
      ol(
        ['W projekcie, w którym analizujesz akta, napisz: ', h('strong', { text: `„${POLECENIE}”` }), ' ', copyBtn('Kopiuj to polecenie', () => POLECENIE, 'Skopiowano polecenie.')],
        'Z odpowiedzi skopiuj cały blok kodu „json” (od { do }).',
        'Tutaj: ekran startowy → „Nowa sprawa z wkładu”. Gdy sprawa jest już otwarta: zakładka Sprawa → „Dołącz wkład” (wcześniej usuń zbędne testowe formularze).',
        'Wklej → „Wczytaj”. Jeśli pojawi się raport z pominięciami – popraw wkład w projekcie i wczytaj ponownie.',
        'Zakładka „Zadania” = lista zadań; panel nad formularzem = zadania i przypomnienia do niego.'),
      h('p', { class: 'note', text: 'Pierwszy raz w danym projekcie? Skopiuj instrukcję poniżej i wklej ją do instrukcji projektu; do wiedzy projektu wgraj pliki z folderu Paczka_wkladu.' }),
      copyBtn('Kopiuj instrukcję dla projektu analizy', async () => (await fetch('assets/wklad_instrukcja.md')).text(), 'Skopiowano instrukcję projektu (ok. 17 kB).')),
    sec('2. Materiał z akt (szkic Policji, zdjęcia)',
      ul('Zakładka „Materiał z akt” → „Dodaj plik”: JPG, PNG, HEIC lub PDF (każda strona = osobny obraz). Wpisz podstawę (k. …) i cel. Do pliku sprawy trafia kopia robocza.',
        'Otwórz załącznik: palcem powiększasz i przesuwasz, Apple Pencil rysuje. Narzędzia: Pióro, Punkt (P1, P2…), Linia, Tekst, Gumka, Cofnij, Obróć, Kontrast.',
        'Każdy punkt ma wiersz w tabeli „Punkty i pomiary”: co to jest, wynik, jednostka, przyrząd, nr zdjęcia. Dotknięcie punktu lub wiersza podświetla drugi element.',
        'W zadaniu wybierz „Załącznik”, a „Do załącznika →” otwiera obraz. Mało miejsca w pamięci? Zobacz wskaźnik na górze zakładki.')),
    sec('3. W terenie',
      ul('Zakładka Zadania: wpisz Wynik, Jednostkę, Nr zdjęcia i kliknij Wykonane lub Niewykonane (+ powód).',
        '„+ Formularz” – kolejny egzemplarz (pojazd B, opona, rzecz…). „Dodaj wiersz” – kolejny wiersz tabeli.',
        'Pismo Apple Pencil i dyktowanie działają w każdym polu; pole powiększa się po dotknięciu.',
        'Przyciski „Teraz” i „GPS” zastępują cały wpis w polu (bez pytania).',
        'Rozkładówki: dotknij kwadracika – czerwony X. Szkic (01, sekcja J): Pióro, Gumka, Cofnij.')),
    sec('4. Zapis',
      ul('Wszystko zapisuje się samo w buforze (pasek: „Bufor: OK”). To nie jest archiwum.',
        'Po oględzinach i w przerwach: „Zapisz plik” → Zapisz w Plikach → iCloud Drive. Pasek pokazuje godzinę ostatniego zapisu.',
        'Otwarcie: „Otwórz sprawę” → wskaż plik. Raport pokaże pola, których nie dało się przenieść.')),
    sec('5. Po oględzinach (MacBook)',
      ul('„Drukuj / PDF” (Sprawa albo u góry formularza) → w oknie drukowania „Zapisz jako PDF”.',
        '„Eksport tekstowy” → plik Markdown z polami i wynikami zadań → wklej do projektu analizy.')),
    sec('6. Gdy coś nie działa',
      ul('Żółty baner „Dostępna nowa wersja” → „Zaktualizuj” (dane zostają).',
        'Zakładka Sprawa → „Test urządzenia” (pamięć, kamera) – zrób zrzut ekranu.')));
  dialog('Pomoc – krótka instrukcja', body, [['Zamknij', null, 'primary']]);
}
