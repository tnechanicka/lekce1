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

There is no live integration with Lidl's website: Lidl has no public API, and a direct
fetch of `lidl.cz/c/aktualni-nabidka` returns `403 Forbidden` (bot-blocked). GitHub
Pages is also a purely static host with no backend, so client-side scraping would hit
CORS regardless. The app instead uses a checked-in JSON dataset (`data/leaflet.json`)
that was hand-transcribed from real Lidl flyer photos (5 of 55 pages, valid 2.–5. 7.
2026) and is meant to be kept current by editing it by hand each week.

## Repository structure

```
.
├── _config.yml       # Jekyll config — sets the theme (jekyll-theme-leap-day)
├── index.html        # App shell/markup
├── style.css         # All styling (vanilla CSS, Lidl-ish blue/yellow palette)
├── app.js            # App logic: fetches the JSON data, renders UI, no framework
└── data/
    ├── leaflet.json  # Current flyer items (id, name, price) + validity dates
    └── recipes.json  # Recipes: tags, time/servings, leafletIngredients (id+amount), pantryIngredients, instructions
```

There is no build step, package manager, dependency manifest, or test suite in this
repo — everything is hand-written HTML/CSS/JS. GitHub Pages serves it as-is via Jekyll.

## How the app works (`app.js`)

- Fetches `data/leaflet.json` and `data/recipes.json` once on load; both stay in memory
  as `leaflet`/`recipes` module-level state.
- `pantry` is a `Set` of flyer item ids, loaded from/synced to `localStorage`
  (`loadPantry`/`savePantry`). It is the single source of truth for "what I already
  have" across both modes.
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

## Keeping the data current

`data/leaflet.json` was manually transcribed from photos of the physical/app flyer and
only covers 5 of 55 pages — it is not the full weekly assortment. To refresh it:
1. Update `validFrom`/`validTo` and the `items` array (id, name, price) by hand from
   https://www.lidl.cz/c/aktualni-nabidka/a10008785 (or from flyer photos, as before).
2. Keep `data/recipes.json`'s `leafletIngredients[].id` values in sync with whatever ids
   exist in `leaflet.json` — a recipe referencing a removed id will just show as
   unmatched, not error, but ids should still be kept consistent.
3. When adding a recipe, give it a `tags` array (reuse existing tags where possible —
   see `TAG_LABELS` in `app.js`) and an `amount` string per `leafletIngredients` entry,
   since both the filter UI and the shopping list depend on them.

Do not attempt to re-introduce live scraping of Lidl's site or third-party flyer
aggregators (kupi.cz, kimbino.cz, etc.) without explicit user sign-off — it was already
tried and rejected for this repo (blocked/fragile/ToS-risk); see git history on the
branch that added this app.

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
  bundlers, or package managers, matching the current scope of the repo.
- No test suite or linter is configured; don't add one speculatively.
- When changing app behavior, prefer manually verifying it in a browser (see the local
  server command above) over assuming the code is correct from reading it.

## Notes for future updates

This file should be kept in sync as the repository grows. If new pages, a build step,
or other structure are added, update the "Repository structure" and "Development
workflow" sections above to reflect the current state.
