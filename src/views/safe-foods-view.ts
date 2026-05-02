import { el, clear } from '../dom';
import {
  getFood,
  getOverride,
  getSafeFoods,
  getSettings,
  isUnsafeFood,
  removeSafeFood,
  subscribe,
  updateSafeFoodCategory,
} from '../state';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../categorize';
import { analyseFood } from '../food-resolve';
import { editButton, sourceIcon, trafficSummary, valuesLine } from './food-bits';
import type { Category } from '../types';

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
        ? `All your go-to foods are currently blocked (${hiddenCount}). Unblock them to see them here.`
        : 'No go-to foods yet. Pin some from Search.';
    container.appendChild(el('div', { class: 'empty' }, msg));
    return;
  }

  if (hiddenCount > 0) {
    container.appendChild(
      el(
        'div',
        { class: 'note' },
        `${hiddenCount} go-to food${hiddenCount === 1 ? '' : 's'} hidden (blocked).`,
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
          const analysis = analyseFood(food, thresholds, getOverride(food.id));
          const head: HTMLElement[] = [
            trafficSummary(analysis),
            el('div', { class: 'food-name' }, food.name),
          ];
          const icon = sourceIcon(analysis.source);
          if (icon) head.push(icon);
          return el('div', { class: `food food-${analysis.lights.overall}` }, [
            el('div', { class: 'food-head' }, head),
            el('div', { class: 'values' }, [valuesLine(analysis)]),
            el('div', { class: 'food-actions' }, [
              categorySelect(food.id, safe.category),
              editButton(food, analysis.values),
              el(
                'button',
                {
                  class: 'btn btn-remove',
                  onclick: () => removeSafeFood(food.id),
                },
                'Unpin',
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
    el('div', { class: 'view' }, [
      el('h2', { class: 'view-title' }, 'My Go-To Foods'),
      el(
        'div',
        { class: 'help' },
        'A personal favourites list for inspiration. Recipe generation pulls from the full database, not just this list.',
      ),
      list,
    ]),
  );
  renderList(list);
  return subscribe(() => renderList(list));
}
