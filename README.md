# Maťo / Gukap

Slovenský prezentačný web festivalového technika. Štyri stránky: úvod, služby, profil a dopyt. Obsahuje zámerne vulgárny slogan.

## Spustenie

Otvorte `dist/index.html` v prehliadači. Inštalácia balíkov ani zostavenie projektu nie sú potrebné.

Lokálny HTTP server: `python -m http.server 8000 --directory dist`

Adresa: http://localhost:8000

## Stránky

- `dist/index.html` — úvod
- `dist/catalog.html` — služby
- `dist/akira.html` — profil Maťa (pôvodný názov súboru)
- `dist/favorites.html` — formulár dopytu (pôvodný názov súboru)

Formulár sťahuje textový súbor. Neodosiela správy ani neukladá údaje na server. mato@example.com je demonštračný kontakt. Popisy služieb sú návrhom reklamného textu; pred reálnym použitím ich zosúlaďte s ponukou Maťa.

## Kontrola

`python check_pages.py`

Kontroluje odkazy, súbory, navigáciu, jazyk a formulár. Nenahrádza kontrolu v prehliadači.

## Hosting

Na statický hosting nahrajte obsah priečinka `dist`. Nahratie repozitára na GitHub samo osebe nezverejní web.

Ilustrácia: image_gen, podrobnosti v ASSET-NOTES.md. Písmo Manrope sa načítava z Google Fonts s lokálnou náhradou pri nedostupnom pripojení.

## Interaktívny vizuál

`studio.css` rozširuje existujúce spoločné štýly. Nadpisy používajú Space Grotesk s lokálnou náhradou. Bez nových závislostí alebo zostavovania.

- Mobilné menu podporuje klávesnicu, Escape a zmenu šírky okna. Bez JavaScriptu zostáva navigácia dostupná.
- Karty a titulky sa odhaľujú cez Intersection Observer. Jemné nakláňanie a pohyb tlačidla sa zapínajú iba pri presnom ukazovateli.
- Bežiaci pás mení smer podľa skrolovania, reaguje na jeho rýchlosť, pri hoveri spomalí a má tlačidlo pozastavenia. Výpočty bežia iba pre viditeľné aktívne pásy.
- Slogan, poznámky produkcie a ovládací panel chaosu sú malé interaktívne vtipy. Čísla v profile sú výslovne označené ako humor.
- `prefers-reduced-motion` vypína pohyb. Obsah je čitateľný aj bez JavaScriptu.

Formulár stále iba pripravuje lokálny `.txt` súbor; nevytvára dojem odoslania na server. Kontrola v prehliadači má zahŕňať menu pri 320 px, jeho zatvorenie klávesom Escape, pás pri skrolovaní oboma smermi, znížený pohyb a skutočne stiahnutý súbor.

Render používa existujúci `render.yaml`: statický obsah `dist`, bez build kroku. Zmenu publikovania ani externý deploy nie je potrebné konfigurovať.
