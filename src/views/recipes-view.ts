import { el, clear } from '../dom';
import {
  getFood,
  getFoods,
  getSettings,
  getUnsafeFoods,
  isSafeFood,
  isUnsafeFood,
  subscribe,
} from '../state';
import { lightsFor } from '../traffic-light';
import { generateRecipe, type MealType } from '../claude';
import type { Food } from '../types';

let _mealType: MealType = 'dinner';
let _cuisine = '';
let _fridge = '';
let _loading = false;
let _result = '';
let _error = '';

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

export function render(root: HTMLElement): () => void {
  function build(): void {
    clear(root);

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
          build();
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
            build();
          }
        },
      },
      _loading ? 'Generating...' : 'Generate recipe',
    );

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

    root.appendChild(
      el('div', { class: 'view' }, [
        el('h2', { class: 'view-title' }, 'Recipe generator'),
        el('div', { class: 'form-row' }, [
          el('label', {}, [el('span', { class: 'label' }, 'In my fridge'), fridgeInput]),
        ]),
        fridgeWarnings,
        el('div', { class: 'form-row' }, [
          el('label', {}, [el('span', { class: 'label' }, 'Meal type'), mealSelect]),
        ]),
        el('div', { class: 'form-row' }, [
          el('label', {}, [el('span', { class: 'label' }, 'Cuisine'), cuisineInput]),
        ]),
        el('div', { class: 'form-row' }, [generateBtn]),
        ...status,
        ...output,
      ]),
    );

    updateFridgeWarnings();
  }

  build();
  return subscribe(build);
}
