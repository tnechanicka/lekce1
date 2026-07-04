# CLAUDE.md

This file provides guidance for AI assistants (Claude Code) working in this repository.

## Repository purpose

This is a small static web app hosted via **GitHub Pages**, built with **Jekyll** for
the site shell. It started as an intro lesson repo ("První lekce" — Czech for "First
lesson") and now contains a client-side app: **"Recepty, spíž a nákupní seznam"** with
two flows:
1. **Podle toho, co mám** ("by what I have") — check off what's in your pantry, recipes
   re-rank by ingredient match (with a boost for what's in season right now).
2. **Podle preferencí → nákupní seznam** ("by preference → shopping list") — filter
   recipes by tag/time/season, select the ones you want to cook, generate an aggregated
   shopping list grouped by category (minus what's already in your pantry), then get
   "recepty na zbytky" (leftover-use) suggestions for other recipes that reuse what
   you just bought.

Recipes (`data/recipes.json`, 111 of them) are **general-purpose and not tied to any
flyer** — each has a plain `ingredients` list drawn from a shared ingredient-id
vocabulary reused across recipes, pantry staples, and the flyer. The Lidl flyer
(`data/leaflet.json`) is a secondary, opportunistic layer on top: if a recipe
ingredient's id happens to match a current flyer item, it gets a "🏷️ v akci" bonus tag
and its real price in the shopping list — but nothing requires that match. See "How
ingredients, pantry, and the flyer fit together" below before changing any of this.

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
    ├── leaflet.json        # Default/baseline flyer items (id, name, price) + validity dates
    ├── recipes.json        # 111 recipes: tags, time/servings, ingredients (id+name+amount), instructions
    └── pantry-staples.json # Default "Moje spíž" checklist (id+name, no prices) — generic, not flyer-derived
```

There is no build step, package manager config, or test suite used at runtime — HTML/CSS/JS
is hand-written and GitHub Pages serves it as-is via Jekyll. `vendor/pdfjs` is a one-time
`npm pack` extraction (see its README), not an installed dependency; there is no `package.json`.

## How ingredients, pantry, and the flyer fit together

This is the part to understand before touching data or matching logic:

- Every recipe in `data/recipes.json` has one flat `ingredients: [{id, name, amount}]`
  array — no more split between "flyer ingredients" and "pantry ingredients" (that
  older two-array schema is gone). `id` is a slug from a shared vocabulary (e.g.
  `rajcata`, `kureci-stehna`, `olivovy-olej`) reused across recipes on purpose, so
  aggregation and matching actually line up between recipes.
- `data/pantry-staples.json` is the **default** "Moje spíž" checklist — generic
  everyday staples (sůl, vejce, rýže, cibule, …), completely independent of any
  flyer. The user can also type in and add their own custom item (persisted
  separately, see below); it is *not* generated from `data/leaflet.json`.
- `data/leaflet.json` (plus any saved/uploaded leaflet, see below) only matters for a
  cosmetic bonus: if a recipe/shopping-list ingredient's `id` happens to equal a
  current flyer item's `id`, `renderRecipeCard`/`buildShoppingList` tag it "🏷️ v akci"
  and show its real price. There is no requirement that recipe ingredients exist in
  the flyer, and most won't — that bonus is opportunistic, not load-bearing.
- `INGREDIENT_CATEGORY` and `SEASONAL_MONTHS` in `app.js` are hand-maintained lookup
  tables keyed by the same ingredient ids, used respectively to group the shopping
  list into sections (Maso/Mléčné/Ovoce a zelenina/…) and to compute `seasonalCount()`
  — how many of a recipe's ingredients are fresh-in-Czechia this calendar month
  (`CURRENT_MONTH`, derived from the real date, not hardcoded). Adding a new
  ingredient id that isn't in `INGREDIENT_CATEGORY` just falls back to "Ostatní"; not
  being in `SEASONAL_MONTHS` just means it's treated as always-available (fine for
  staples/imports — only add genuinely seasonal Czech produce there).

## How the app works (`app.js`)

- Fetches `data/leaflet.json` (kept as `baseLeaflet`), `data/recipes.json`, and
  `data/pantry-staples.json` once on load; `recipes`/`pantryStaples` stay fixed for the
  session, but the working `leaflet` is derived by `applyActiveLeaflet()` — see "Saved
  leaflets" below.
- `pantry` is a `Set` of ingredient ids (staples ∪ user-added custom items), loaded
  from/synced to `localStorage` (`loadPantry`/`savePantry`). It is the single source of
  truth for "what I already have" across both modes. Custom items live in a separate
  `localStorage` key (`lidl-recepty-vlastni-spiz`, `loadCustomPantryItems`/
  `saveCustomPantryItems`) merged into the rendered list by `allPantryItems()`, so they
  survive independently of which staples are checked. The "Moje spíž" section is a
  native `<details>` (collapsed by default, item count shown in the `<summary>` via
  `renderPantry`'s last line) so it doesn't dominate the page.
- **Mode "Podle toho, co mám"** (`renderIngredientModeRecipes`): recipes are scored by
  how many `ingredients` are in `pantry`, sorted by match fraction and then by
  `seasonalCount()` as a tie-break so in-season recipes surface first; with an empty
  pantry every recipe shows as a full match.
- **Mode "Podle preferencí"**: `renderFilterPanel` builds tag/time filters from the
  data itself (no hardcoded tag list — new tags in `recipes.json` just need a label
  added to `TAG_LABELS` in `app.js`, else they fall back to the raw tag string), plus a
  "🌱 Jen sezónní teď" toggle (`seasonOnly`) that filters to recipes with
  `seasonalCount() > 0`. `planned` is a `Set` of recipe ids the user checked to cook.
  `buildShoppingList` aggregates `ingredients` across `planned` recipes, splits them
  into "K nákupu" (buy) vs "Už máš doma" (already in `pantry`), groups each side by
  `categoryOf(id)`, prices only the ones that match a current flyer item, and computes
  "recepty na zbytky" by re-scoring the *unplanned* recipes against everything that
  will be on hand after the trip (`pantry ∪ toBuy`).
- Checking/unchecking an item anywhere (pantry list or shopping list) updates the same
  `pantry` Set and re-renders whatever's currently visible.
- Clicking a recipe card (outside its checkbox) toggles its instructions open/closed.
- **"Vygenerovat vzorový jídelníček"** (`generateMealPlan`) picks up to 7 random
  recipes from the *currently filtered* pool (`filteredRecipes()` — respects active
  tags/time/season filters), overwrites `planned` with them, and renders a Monday–Sunday
  list (`renderMealPlan`/`DAY_NAMES`). It's just a shortcut into the existing
  `planned`/`buildShoppingList` flow, not a separate data model — the generated recipes
  show as checked in the grid below and the user can still tweak the selection before
  building the shopping list.

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

Recipes do **not** need their ingredient ids to exist in `leaflet.json` — see "How
ingredients, pantry, and the flyer fit together" above. When adding a recipe, give it a
`tags` array (reuse existing tags — see `TAG_LABELS` in `app.js`), and for each
ingredient reuse an existing `id` from another recipe/`pantry-staples.json` if the same
ingredient already appears anywhere, instead of minting a near-duplicate id (e.g. reuse
`cibule`, not a new `cibule-nakrajena`) — the shopping list and pantry matching are only
useful if the same ingredient always has the same id.

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
