import { el, clear } from '../dom';
import {
  addSavedRecipe,
  getFood,
  getFoods,
  getSavedRecipes,
  getSettings,
  getUnsafeFoods,
  isSafeFood,
  isUnsafeFood,
  removeSavedRecipe,
  subscribe,
} from '../state';
import { lightsFor } from '../traffic-light';
import { generateRecipe, type MealType } from '../claude';
import { extractRecipeMeta } from '../recipe-meta';
import type { Food, SavedRecipe } from '../types';

type Mode = 'generate' | 'saved';

let _mode: Mode = 'generate';
let _mealType: MealType = 'dinner';
let _cuisine = '';
let _fridge = '';
let _loading = false;
let _result = '';
let _error = '';
let _savedThisRecipe = false;
let _expandedRecipeId: string | null = null;

interface RecipePool {
  pool: Food[];
  greenCount: number;
  unknownCount: number;
}

function recipePool(): RecipePool {
  const thresholds = getSettings().thresholds;
  const pool: Food[] = [];
  let greenCount = 0;
  let unknownCount = 0;
  for (const food of getFoods()) {
    if (isUnsafeFood(food.id)) continue;
    const overall = lightsFor(food, thresholds).overall;
    if (overall === 'green') {
      pool.push(food);
      greenCount++;
    } else if (overall === 'unknown' && isSafeFood(food.id)) {
      pool.push(food);
      unknownCount++;
    }
  }
  return { pool, greenCount, unknownCount };
}

function parseFridgeTerms(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of input.split(',')) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function blockedMatchesFor(term: string): Food[] {
  const t = term.toLowerCase();
  const matches: Food[] = [];
  for (const u of getUnsafeFoods()) {
    const food = getFood(u.foodId);
    if (!food) continue;
    if (food.name.toLowerCase().includes(t)) matches.push(food);
  }
  return matches;
}

interface FridgeAnalysis {
  allowed: string[];
  excluded: { term: string; matches: Food[] }[];
}

function analyseFridge(input: string): FridgeAnalysis {
  const terms = parseFridgeTerms(input);
  const allowed: string[] = [];
  const excluded: { term: string; matches: Food[] }[] = [];
  for (const t of terms) {
    const matches = blockedMatchesFor(t);
    if (matches.length > 0) excluded.push({ term: t, matches });
    else allowed.push(t);
  }
  return { allowed, excluded };
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function modeToggle(rebuild: () => void): HTMLElement {
  const button = (label: string, value: Mode) =>
    el(
      'button',
      {
        class: `seg-btn${_mode === value ? ' active' : ''}`,
        onclick: () => {
          _mode = value;
          rebuild();
        },
      },
      label,
    );
  return el('div', { class: 'segmented' }, [button('Generate', 'generate'), button('Saved', 'saved')]);
}

function buildGenerator(view: HTMLElement, rebuild: () => void): void {
  const { pool, greenCount, unknownCount } = recipePool();
  const apiKeyOk = getSettings().apiKey.length > 0;

  const mealSelect = el('select', {
    class: 'meal-select',
    onchange: (e) => {
      _mealType = (e.target as HTMLSelectElement).value as MealType;
    },
  });
  for (const m of ['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m[0].toUpperCase() + m.slice(1);
    if (m === _mealType) opt.selected = true;
    mealSelect.appendChild(opt);
  }

  const cuisineInput = el('input', {
    class: 'cuisine-input',
    type: 'text',
    placeholder: 'Cuisine (optional, e.g. Mexican)',
    value: _cuisine,
    oninput: (e) => {
      _cuisine = (e.target as HTMLInputElement).value;
    },
  });

  const fridgeWarnings = el('div', { class: 'fridge-warnings' });

  const updateFridgeWarnings = (): void => {
    clear(fridgeWarnings);
    const { excluded } = analyseFridge(_fridge);
    for (const ex of excluded) {
      const more = ex.matches.length > 1 ? ` (+${ex.matches.length - 1} more)` : '';
      fridgeWarnings.appendChild(
        el(
          'div',
          { class: 'note note-warn' },
          `"${ex.term}" matches blocked food: ${ex.matches[0].name}${more} — will be excluded.`,
        ),
      );
    }
  };

  const fridgeInput = el('input', {
    class: 'cuisine-input',
    type: 'text',
    placeholder: 'In my fridge (optional, e.g. chicken, lettuce)',
    value: _fridge,
    oninput: (e) => {
      _fridge = (e.target as HTMLInputElement).value;
      updateFridgeWarnings();
    },
  });

  const generateBtn = el(
    'button',
    {
      class: 'btn btn-primary',
      disabled: _loading || !apiKeyOk || pool.length === 0,
      onclick: async () => {
        const { allowed } = analyseFridge(_fridge);
        _loading = true;
        _result = '';
        _error = '';
        _savedThisRecipe = false;
        rebuild();
        try {
          const settings = getSettings();
          const r = await generateRecipe({
            apiKey: settings.apiKey,
            model: settings.model,
            greenFoods: recipePool().pool,
            priorities: allowed.length > 0 ? allowed : undefined,
            mealType: _mealType,
            cuisine: _cuisine.trim() || undefined,
          });
          _result = r.text;
          _fridge = '';
        } catch (e) {
          _error = e instanceof Error ? e.message : String(e);
        } finally {
          _loading = false;
          rebuild();
        }
      },
    },
    _loading ? 'Generating...' : 'Generate recipe',
  );

  const buttonRow: HTMLElement[] = [generateBtn];
  if (_result && !_loading) {
    buttonRow.push(
      el(
        'button',
        {
          class: _savedThisRecipe ? 'btn btn-saved' : 'btn btn-add',
          disabled: _savedThisRecipe,
          onclick: () => {
            const meta = extractRecipeMeta(_result);
            addSavedRecipe({
              id: `r_${Date.now()}`,
              name: meta.name,
              cuisine: meta.cuisine,
              mealType: _mealType,
              text: _result,
              savedAt: Date.now(),
            });
            _savedThisRecipe = true;
            rebuild();
          },
        },
        _savedThisRecipe ? 'Saved ✓' : 'Save recipe',
      ),
    );
  }

  const status: HTMLElement[] = [];
  if (!apiKeyOk) {
    status.push(
      el('div', { class: 'note note-warn' }, 'Add a Claude API key in Settings to generate recipes.'),
    );
  }
  const breakdown =
    unknownCount > 0
      ? ` (${greenCount} green from database + ${unknownCount} saved unknown${unknownCount === 1 ? '' : 's'})`
      : '';
  status.push(
    el(
      'div',
      { class: pool.length < 3 ? 'note note-warn' : 'note' },
      `${pool.length} food${pool.length === 1 ? '' : 's'} available for recipes${breakdown}` +
        (pool.length < 3
          ? ' — fewer than 3 limits recipes. Loosen thresholds in Settings, save trusted unknowns, or unblock foods.'
          : '.'),
    ),
  );

  const output: HTMLElement[] = [];
  if (_error) output.push(el('div', { class: 'note note-error' }, _error));
  if (_result) output.push(el('pre', { class: 'recipe-text' }, _result));

  view.appendChild(
    el('div', { class: 'form-row' }, [
      el('label', {}, [el('span', { class: 'label' }, 'In my fridge'), fridgeInput]),
    ]),
  );
  view.appendChild(fridgeWarnings);
  view.appendChild(
    el('div', { class: 'form-row' }, [
      el('label', {}, [el('span', { class: 'label' }, 'Meal type'), mealSelect]),
    ]),
  );
  view.appendChild(
    el('div', { class: 'form-row' }, [
      el('label', {}, [el('span', { class: 'label' }, 'Cuisine'), cuisineInput]),
    ]),
  );
  view.appendChild(el('div', { class: 'btn-row' }, buttonRow));
  for (const s of status) view.appendChild(s);
  for (const o of output) view.appendChild(o);

  updateFridgeWarnings();
}

function buildSavedList(view: HTMLElement, rebuild: () => void): void {
  const recipes = [...getSavedRecipes()].sort((a, b) => b.savedAt - a.savedAt);

  if (recipes.length === 0) {
    view.appendChild(
      el(
        'div',
        { class: 'empty' },
        'No saved recipes yet. Generate one and tap "Save recipe" to keep it here.',
      ),
    );
    return;
  }

  const list = el('div', { class: 'list' });
  for (const r of recipes) list.appendChild(savedCard(r, rebuild));
  view.appendChild(list);
}

function savedCard(recipe: SavedRecipe, rebuild: () => void): HTMLElement {
  const expanded = _expandedRecipeId === recipe.id;
  const mealLabel = recipe.mealType.charAt(0).toUpperCase() + recipe.mealType.slice(1);

  const header = el(
    'button',
    {
      class: 'saved-recipe-head',
      onclick: () => {
        _expandedRecipeId = expanded ? null : recipe.id;
        rebuild();
      },
    },
    [
      el('div', { class: 'saved-recipe-title' }, recipe.name),
      el(
        'div',
        { class: 'saved-recipe-meta' },
        `${recipe.cuisine} · ${mealLabel} · ${formatDate(recipe.savedAt)}`,
      ),
      el('span', { class: 'saved-recipe-chevron' }, expanded ? '▾' : '▸'),
    ],
  );

  const children: HTMLElement[] = [header];

  if (expanded) {
    children.push(el('pre', { class: 'recipe-text saved-recipe-body' }, recipe.text));
    children.push(
      el('div', { class: 'food-actions saved-recipe-actions' }, [
        el(
          'button',
          {
            class: 'btn btn-remove',
            onclick: () => {
              if (confirm(`Delete "${recipe.name}"? This can't be undone.`)) {
                removeSavedRecipe(recipe.id);
                if (_expandedRecipeId === recipe.id) _expandedRecipeId = null;
              }
            },
          },
          'Delete',
        ),
      ]),
    );
  }

  return el(
    'div',
    { class: `saved-recipe${expanded ? ' saved-recipe-open' : ''}` },
    children,
  );
}

export function render(root: HTMLElement): () => void {
  function build(): void {
    clear(root);

    const view = el('div', { class: 'view' });
    view.appendChild(el('h2', { class: 'view-title' }, 'Recipes'));
    view.appendChild(modeToggle(build));

    if (_mode === 'generate') buildGenerator(view, build);
    else buildSavedList(view, build);

    root.appendChild(view);
  }

  build();
  return subscribe(build);
}
