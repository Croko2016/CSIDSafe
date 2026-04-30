import { el, clear } from '../dom';
import {
  getFood,
  getSafeFoods,
  getSettings,
  isUnsafeFood,
  removeSafeFood,
  subscribe,
  updateSafeFoodCategory,
} from '../state';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../categorize';
import { lightsFor } from '../traffic-light';
import type { Category, DotLight, FoodLights } from '../types';

function dot(light: DotLight, label: string): HTMLElement {
  return el('span', { class: `dot dot-${light}`, title: label });
}

function summary(lights: FoodLights): HTMLElement {
  return el('span', { class: 'lights' }, [
    dot(lights.sucs, `Sucrose: ${lights.sucs}`),
    dot(lights.mals, `Maltose: ${lights.mals}`),
    dot(lights.lacs, `Lactose: ${lights.lacs}`),
  ]);
}

const UNKNOWN_TOOLTIP = 'Disaccharide data unavailable — verify before eating.';

function unknownTag(): HTMLElement {
  return el('span', { class: 'unknown-tag', title: UNKNOWN_TOOLTIP }, '?');
}

function categorySelect(foodId: string, current: Category): HTMLElement {
  const select = el('select', {
    class: 'category-select',
    onchange: (e) => {
      const v = (e.target as HTMLSelectElement).value as Category;
      updateSafeFoodCategory(foodId, v);
    },
  });
  for (const cat of CATEGORY_ORDER) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = CATEGORY_LABELS[cat];
    if (cat === current) opt.selected = true;
    select.appendChild(opt);
  }
  return select;
}

function renderList(container: HTMLElement): void {
  clear(container);
  const allSafe = getSafeFoods();
  const safeFoods = allSafe.filter((s) => !isUnsafeFood(s.foodId));
  const hiddenCount = allSafe.length - safeFoods.length;

  if (safeFoods.length === 0) {
    const msg =
      hiddenCount > 0
        ? `All saved foods are currently blocked (${hiddenCount}). Unblock them on the Blocked tab to see them here.`
        : 'No saved foods yet. Add some from Search.';
    container.appendChild(el('div', { class: 'empty' }, msg));
    return;
  }

  if (hiddenCount > 0) {
    container.appendChild(
      el(
        'div',
        { class: 'note' },
        `${hiddenCount} saved food${hiddenCount === 1 ? '' : 's'} hidden (blocked).`,
      ),
    );
  }

  const thresholds = getSettings().thresholds;
  const grouped = new Map<Category, typeof safeFoods>();
  for (const safe of safeFoods) {
    const list = grouped.get(safe.category) ?? [];
    list.push(safe);
    grouped.set(safe.category, list);
  }

  for (const cat of CATEGORY_ORDER) {
    const items = grouped.get(cat);
    if (!items || items.length === 0) continue;
    items.sort((a, b) => {
      const fa = getFood(a.foodId);
      const fb = getFood(b.foodId);
      return (fa?.name ?? '').localeCompare(fb?.name ?? '');
    });
    container.appendChild(
      el('div', { class: 'category' }, [
        el('h3', { class: 'category-title' }, `${CATEGORY_LABELS[cat]} (${items.length})`),
        ...items.map((safe) => {
          const food = getFood(safe.foodId);
          if (!food) return el('div', { class: 'food food-missing' }, 'Unknown food');
          const lights = lightsFor(food, thresholds);
          const head: HTMLElement[] = [summary(lights), el('div', { class: 'food-name' }, food.name)];
          if (lights.overall === 'unknown') head.push(unknownTag());
          return el('div', { class: `food food-${lights.overall}` }, [
            el('div', { class: 'food-head' }, head),
            el('div', { class: 'values' }, [
              `Suc ${food.sucs}g · Mal ${food.mals}g · Lac ${food.lacs}g per 100g`,
            ]),
            el('div', { class: 'food-actions' }, [
              categorySelect(food.id, safe.category),
              el(
                'button',
                {
                  class: 'btn btn-remove',
                  onclick: () => removeSafeFood(food.id),
                },
                'Remove',
              ),
            ]),
          ]);
        }),
      ]),
    );
  }
}

export function render(root: HTMLElement): () => void {
  clear(root);
  const list = el('div', { class: 'list' });
  root.appendChild(
    el('div', { class: 'view' }, [el('h2', { class: 'view-title' }, 'Safe foods'), list]),
  );
  renderList(list);
  return subscribe(() => renderList(list));
}
