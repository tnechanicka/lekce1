# CLAUDE.md

This file provides guidance for AI assistants (Claude Code) working in this repository.

## Repository purpose

This is a small static web app hosted via **GitHub Pages**, built with **Jekyll** for
the site shell. It started as an intro lesson repo ("První lekce" — Czech for "First
lesson") and now contains a client-side app: **"Recepty z aktuálního letáku Lidlu"**
("Recipes from the current Lidl flyer") — pick which discounted grocery items you have
from the weekly Lidl flyer, and it ranks/highlights recipes that use them.

There is no live integration with Lidl's website: Lidl has no public API, and a direct
fetch of `lidl.cz/c/aktualni-nabidka` returns `403 Forbidden` (bot-blocked). GitHub
Pages is also a purely static host with no backend, so client-side scraping would hit
CORS regardless. The app instead uses a checked-in **sample JSON dataset**
(`data/leaflet.json`) that mimics the shape of a real weekly flyer and is meant to be
updated by hand.

## Repository structure

```
.
├── _config.yml       # Jekyll config — sets the theme (jekyll-theme-leap-day)
├── index.html        # App shell/markup
├── style.css         # All styling (vanilla CSS, Lidl-ish blue/yellow palette)
├── app.js            # App logic: fetches the JSON data, renders UI, no framework
└── data/
    ├── leaflet.json  # Sample "current flyer" items (id, name, price) + validity dates
    └── recipes.json  # Recipes, each listing which leaflet item ids + pantry staples it needs
```

There is no build step, package manager, dependency manifest, or test suite in this
repo — everything is hand-written HTML/CSS/JS. GitHub Pages serves it as-is via Jekyll.

## How the app works (`app.js`)

- Fetches `data/leaflet.json` and `data/recipes.json` on load.
- Renders the flyer items as toggle chips; renders recipes as cards.
- Each recipe lists `leafletIngredients` (ids that must match `data/leaflet.json`) and
  `pantryIngredients` (assumed-available staples like salt/oil, not scored).
- With no chips selected, all recipes show a full match. Once the user checks items
  they have, recipes are re-sorted by fraction of matched leaflet ingredients, and
  unmatched ingredients are highlighted in red.
- Clicking a recipe card toggles its instructions open/closed.

## Keeping the data current

`data/leaflet.json` is sample data, not live. To reflect a real week's flyer:
1. Update `validFrom`/`validTo` and the `items` array (id, name, price) by hand from
   https://www.lidl.cz/c/aktualni-nabidka/a10008785.
2. Keep `data/recipes.json`'s `leafletIngredients` ids in sync with whatever ids exist
   in `leaflet.json` — a recipe referencing a removed id will just show as unmatched,
   not error, but ids should still be kept consistent.

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
