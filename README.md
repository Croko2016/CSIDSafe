# CSID Safe

A Progressive Web App that helps someone with Congenital Sucrase-Isomaltase Deficiency (CSID) check the sucrose, maltose, and lactose content of foods, keep a list of safe foods, and generate recipes that only use them.

Data source: [NZ FOODfiles 2024](https://www.foodcomposition.co.nz).

## Features

- **Search** the FOODfiles database with fuzzy matching, filtered by traffic-light status (green/amber/red).
- **Adjustable thresholds** per disaccharide in Settings.
- **Safe foods list** as a personal reference, auto-categorised (proteins, vegetables, grains, dairy alternatives, condiments/other) with manual override.
- **Personal block list** that overrides the database — blocked foods are hidden from the safe list and excluded from recipes regardless of their traffic-light status.
- **Unknown / unverified data handling.** A food whose sucrose, maltose, and lactose values are *all* zero in the source data is treated as **unknown** (rendered grey, with a "?" indicator), since a triple-zero in NZ FOODfiles usually means the disaccharide assay wasn't performed — not that the food contains zero. Unknown foods are excluded from the recipe pool by default, but you can manually save one to your safe list to vouch for it from your own experience, and it'll then count as an ingredient.
- **Recipe generator** powered by Claude (Haiku by default). The ingredient pool is the full NZ FOODfiles database, filtered to foods that are green under your current thresholds and not personally blocked, plus any user-saved unknowns. The safe list is otherwise a separate reference and does not constrain recipes.
- Installable to the Android home screen as a PWA.

## Local development

Requirements: Node.js 20+ and npm. (PowerShell scripts are provided as a fallback for one-off data and icon regeneration if Node isn't available.)

```bash
npm install
npm run dev
```

The dev server prints a localhost URL. Open it in Chrome or Safari.

### Adding your Claude API key

Open Settings inside the app and paste your key from <https://console.anthropic.com/>. The key is stored in your browser's `localStorage` only — never sent anywhere except `api.anthropic.com`.

### Default thresholds (per 100g)

| Disaccharide | Amber > | Red > |
| ------------ | ------- | ----- |
| Sucrose      | 1g      | 3g    |
| Maltose      | 1g      | 3g    |
| Lactose      | 2g      | 5g    |

## Building data

`public/foods.json` is generated from the three source CSVs in `data/`. Regenerate after replacing or updating the source files:

```bash
# Node version (preferred)
node scripts/build-data.mjs

# PowerShell fallback (Windows, no Node required)
powershell -ExecutionPolicy Bypass -File scripts/build-data.ps1
```

## Building icons

Icons live in `public/icons/`. To regenerate them (Windows only, uses `System.Drawing`):

```bash
powershell -ExecutionPolicy Bypass -File scripts/build-icons.ps1
```

## Deploying to GitHub Pages

The included workflow at `.github/workflows/deploy.yml` builds and deploys on every push to `main`. To set it up:

1. Push the repo to GitHub.
2. In the repo's **Settings → Pages**, set Source to **GitHub Actions**.
3. Push to `main`. The site appears at `https://<user>.github.io/<repo>/`.

`vite.config.ts` uses `base: './'`, so the same build works whether deployed at the root or in a subpath.

## Project structure

```
data/                     source CSVs (one per disaccharide)
scripts/build-data.mjs    CSV → public/foods.json (Node)
scripts/build-data.ps1    same, in PowerShell
scripts/build-icons.ps1   icon generator (PowerShell + System.Drawing)
public/                   static assets (manifest, service worker, icons, foods.json)
src/
  main.ts                 entry, tab navigation, service worker registration
  state.ts                in-memory + localStorage state
  search.ts               Fuse.js fuzzy search + traffic-light filter
  traffic-light.ts        pure threshold logic
  categorize.ts           keyword auto-classifier for safe foods
  claude.ts               Claude Messages API client
  views/                  search, safe-foods, recipes, settings
  styles.css              all styles
  dom.ts                  small DOM helper
```

## Privacy

Everything is stored locally in your browser:

- Settings (including API key) → `localStorage`
- Safe foods list → `localStorage`
- FOODfiles data → in-memory after first fetch, cached by the service worker

The only outbound network calls are:

- Loading `foods.json` from the same origin.
- Calls to `api.anthropic.com` when you generate a recipe.

## License

NZ FOODfiles data © Plant & Food Research / Ministry of Health, used here under the standard FOODfiles terms. The application code is yours to modify.
