# CLAUDE.md

This file provides guidance for AI assistants (Claude Code) working in this repository.

## Repository purpose

This is a small static web app hosted via **GitHub Pages**, built with **Jekyll** for
the site shell. It started as an intro lesson repo ("První lekce" — Czech for "First
lesson") and now contains a client-side app: **"Recepty z aktuálního letáku Lidlu"**
("Recipes from the current Lidl flyer") with two flows:
1. **Podle toho, co mám** ("by what I have") — check off flyer items you have, recipes
   re-rank by ingredient match.
2. **Podle preferencí → nákupní seznam** ("by preference → shopping list") — filter
   recipes by tag/time, select the ones you want to cook, generate an aggregated
   shopping list (minus what's already in your pantry), then get "recepty na zbytky"
   (leftover-use) suggestions for other recipes that reuse what you just bought.

A persisted **"Moje spíž"** ("my pantry" — `localStorage`, key `lidl-recepty-spiz`)
tracks which flyer items the user already owns from previous shopping trips; it drives
both flows and is updated automatically when items are checked off in the shopping list.

There is no live integration with Lidl's website: Lidl has no public API, a direct
fetch of `lidl.cz/c/aktualni-nabidka` returns `403 Forbidden` (bot-blocked), and every
third-party flyer aggregator tried (kupi.cz, kimbino.cz, najdislevu.cz, akcniceny.cz)
is either bot-blocked itself or blocked by this environment's own egress policy. GitHub
Pages is also a purely static host with no backend, so client-side scraping would hit
CORS regardless. The checked-in `data/leaflet.json` is therefore a hand-transcribed
baseline (partial, from flyer photos). On top of that, the app has an in-browser
**PDF import** (see below) that lets a user upload the actual flyer PDF and extract
items from it directly — no scraping involved, since the user supplies the file.

## Repository structure

```
.
├── _config.yml       # Jekyll config — sets the theme (jekyll-theme-leap-day)
├── index.html        # App shell/markup
├── style.css         # All styling (vanilla CSS, minimalist palette in :root custom properties)
├── app.js            # Core app: data loading, pantry, both modes, shopping list, saved-leaflet state
├── pdf-import.js     # PDF-to-leaflet-data import UI, built on top of app.js's saved-leaflet functions
├── vendor/pdfjs/     # Vendored pdf.js (Apache-2.0) build output — see its README.md
└── data/
    ├── leaflet.json  # Default/baseline flyer items (id, name, price) + validity dates
    └── recipes.json  # Recipes: tags, time/servings, leafletIngredients (id+amount), pantryIngredients, instructions
```

There is no build step, package manager config, or test suite used at runtime — HTML/CSS/JS
is hand-written and GitHub Pages serves it as-is via Jekyll. `vendor/pdfjs` is a one-time
`npm pack` extraction (see its README), not an installed dependency; there is no `package.json`.

## How the app works (`app.js`)

- Fetches `data/leaflet.json` (kept as `baseLeaflet`) and `data/recipes.json` once on
  load; `recipes` stays fixed for the session, but the working `leaflet` is derived by
  `applyActiveLeaflet()` — see "Saved leaflets" below.
- `pantry` is a `Set` of flyer item ids, loaded from/synced to `localStorage`
  (`loadPantry`/`savePantry`). It is the single source of truth for "what I already
  have" across both modes. The "Moje spíž" section is a native `<details>` (collapsed
  by default, item count shown in the `<summary>` via `renderPantry`'s last line) so it
  doesn't dominate the page — it's secondary to the two recipe modes, not the first
  thing shown.
- **Mode "Podle toho, co mám"** (`renderIngredientModeRecipes`): recipes are scored by
  how many `leafletIngredients` are in `pantry` and sorted by match fraction; with an
  empty pantry every recipe shows as a full match.
- **Mode "Podle preferencí"**: `renderFilterPanel` builds tag/time filters from the
  data itself (no hardcoded tag list — new tags in `recipes.json` just need a label
  added to `TAG_LABELS` in `app.js`, else they fall back to the raw tag string).
  `planned` is a `Set` of recipe ids the user checked to cook. `buildShoppingList`
  aggregates `leafletIngredients` across `planned` recipes, splits them into "K nákupu"
  (buy) vs "Už máš doma" (already in `pantry`) with a rough price estimate, lists
  `pantryIngredients` staples separately (never priced/scored), and computes "recepty
  na zbytky" by re-scoring the *unplanned* recipes against everything that will be on
  hand after the trip (`pantry ∪ toBuy`).
- Checking/unchecking an item anywhere (pantry list or shopping list) updates the same
  `pantry` Set and re-renders whatever's currently visible.
- Clicking a recipe card (outside its checkbox) toggles its instructions open/closed.

### Saved leaflets (`localStorage`, no backend)

Multiple parsed/edited leaflets can be saved side by side and switched between —
nothing here touches `data/leaflet.json` on disk; it's all per-browser `localStorage`:

- `lidl-recepty-ulozene-letaky` — array of saved leaflets: `{ id, name, validFrom,
  validTo, items, savedAt }`. `id` is `slugifyLeafletId(name) + "-" + timestamp`, so
  saving again under the same `name` overwrites that entry (see `saveNewLeaflet`)
  while a different name creates a new one.
- `lidl-recepty-aktivni-letak` — the `id` of the currently-active saved leaflet, or
  absent/null to mean "just use the default `data/leaflet.json`".
- `applyActiveLeaflet()` rebuilds the working `leaflet` from `baseLeaflet` and, if a
  leaflet is active, overlays its `items` on top (existing ids get their name/price
  updated in place; new ids are appended) and overrides `validFrom`/`validTo` if set.
- `saveNewLeaflet`, `setActiveLeaflet`, `deleteSavedLeaflet` all end by calling
  `rerenderAll()`, which re-renders validity/pantry/both recipe modes and rebuilds the
  shopping list if it's open — this is the one place that needs to know about every
  leaflet-dependent view, so keep it in sync if a new view is added.

## PDF import (`pdf-import.js`)

Lets a user upload the actual Lidl flyer PDF and turns it into leaflet items, entirely
client-side (nothing is uploaded anywhere) using vendored `pdf.js`
(`vendor/pdfjs/pdf.min.mjs`, loaded via dynamic `import()` so this file can stay a
classic script and share top-level scope/state with `app.js`, e.g. `leaflet`,
`baseLeaflet`, `saveNewLeaflet`).

- `extractPdfLines` pulls `getTextContent()` items per page, clusters them into lines
  by y-coordinate (small tolerance) and sorts left-to-right within a line — a standard
  "reconstruct reading order from positioned glyphs" approach. It processes **all**
  pages (no page cap); large flyers (Lidl's is ~55 pages) just take longer.
- `extractCandidates` regex-matches a price pattern (`PRICE_RE`, tuned for `"39,90
  Kč"` / `"79,90 Kč/kg"`) per line; if the same line has no usable name text before the
  price, it looks up to 2 lines back for one. This is a heuristic, not a guarantee —
  layouts where the price and name aren't adjacent in reading order will be missed.
- Results are shown in an **editable review table** (checkbox to include, editable
  id/name/price) before anything is saved — extraction quality varies by flyer layout,
  so this manual check is load-bearing, not optional polish. The raw extracted text is
  also dumped into a `<details>` for manually copying anything the regex missed.
- "Uložit a použít tento leták" calls `saveNewLeaflet(name, items, validFrom, validTo)`
  in `app.js`. "Stáhnout jako leaflet.json" instead produces a downloadable JSON file
  (merged with `baseLeaflet`) for anyone who wants to commit it as the new checked-in
  default instead of just keeping it in their own browser's `localStorage`.

## Keeping `data/leaflet.json` current

It was manually transcribed from photos of the physical/app flyer and only covers 5 of
55 pages — it is not the full weekly assortment. Two ways to refresh it:
1. **Preferred for a real week's data**: use the in-app PDF import (see above) and then
   either just use the saved leaflet from the browser, or click "Stáhnout jako
   leaflet.json" and commit that file to replace the checked-in default.
2. **Manual edit**: update `validFrom`/`validTo` and the `items` array (id, name, price)
   by hand from https://www.lidl.cz/c/aktualni-nabidka/a10008785 or flyer photos.

Either way, keep `data/recipes.json`'s `leafletIngredients[].id` values in sync with
whatever ids exist in `leaflet.json` — a recipe referencing a removed id will just show
as unmatched, not error, but ids should still be kept consistent. When adding a recipe,
give it a `tags` array (reuse existing tags — see `TAG_LABELS` in `app.js`) and an
`amount` string per `leafletIngredients` entry, since both the filter UI and the
shopping list depend on them.

Do not attempt to re-introduce live scraping of Lidl's site or third-party flyer
aggregators (kupi.cz, kimbino.cz, najdislevu.cz, akcniceny.cz, etc.) without explicit
user sign-off — it was already tried and rejected for this repo (each one is either
bot-blocked or blocked by this environment's egress policy); see git history on the
branch that added this app. The PDF import above is the supported alternative.

## Development workflow

- Edits are plain HTML/CSS/JS files at the repo root plus JSON data files under
  `data/`. There is no compilation step required.
- `_config.yml` controls Jekyll/GitHub Pages settings (currently just `theme:
  jekyll-theme-leap-day`). Change the theme name here if the site design changes.
- `app.js` uses `fetch()` to load the JSON files, so **opening `index.html` directly
  from the filesystem (`file://`) will fail** in most browsers. Serve it over HTTP
  locally, e.g.:
  ```
  python3 -m http.server 8000
  ```
  then open `http://localhost:8000/`.
- There is no CI/CD configured beyond GitHub Pages' automatic build-and-deploy on push
  to the default branch.

## Conventions

- Content language is Czech (`lang="cs"`, UI copy, recipe text); keep new content
  consistent with this unless told otherwise.
- Keep additions simple and dependency-free — vanilla HTML/CSS/JS, no frameworks,
  bundlers, or package managers, matching the current scope of the repo. The one
  deliberate exception is `vendor/pdfjs` (vendored, not CDN-loaded — see its README),
  needed for client-side PDF parsing; don't add further dependencies without similar
  justification.
- No test suite or linter is configured; don't add one speculatively.
- When changing app behavior, prefer manually verifying it in a browser (see the local
  server command above) over assuming the code is correct from reading it.

## Notes for future updates

This file should be kept in sync as the repository grows. If new pages, a build step,
or other structure are added, update the "Repository structure" and "Development
workflow" sections above to reflect the current state.
