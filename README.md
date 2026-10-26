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
