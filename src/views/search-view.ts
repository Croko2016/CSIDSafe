import { el, clear } from '../dom';
import { searchFoods } from '../search';
import {
  addSafeFood,
  addUnsafeFood,
  isSafeFood,
  isUnsafeFood,
  removeSafeFood,
  removeUnsafeFood,
  subscribe,
} from '../state';
import { autoCategorize } from '../categorize';
import type { DotLight, Food, FoodLights, TrafficLight } from '../types';

let _query = '';
let _filter: TrafficLight | 'all' = 'all';

function dot(light: DotLight, label: string): HTMLElement {
  return el('span', { class: `dot dot-${light}`, title: label });
}

function trafficSummary(lights: FoodLights): HTMLElement {
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

function toggleSafeButton(food: Food): HTMLElement {
  const saved = isSafeFood(food.id);
  return el(
    'button',
    {
      class: saved ? 'btn btn-saved' : 'btn btn-add',
      onclick: () => {
        if (saved) {
          removeSafeFood(food.id);
        } else {
          addSafeFood({
            foodId: food.id,
            category: autoCategorize(food.name),
            addedAt: Date.now(),
          });
        }
      },
    },
    saved ? 'Saved' : '+ Save',
  );
}

function toggleBlockButton(food: Food): HTMLElement {
  const blocked = isUnsafeFood(food.id);
  return el(
    'button',
    {
      class: blocked ? 'btn btn-blocked' : 'btn btn-block',
      onclick: () => {
        if (blocked) removeUnsafeFood(food.id);
        else addUnsafeFood(food.id);
      },
    },
    blocked ? 'Unblock' : 'Block',
  );
}

function renderList(container: HTMLElement): void {
  clear(container);
  const hits = searchFoods({ query: _query, filter: _filter, limit: 100 });
  if (hits.length === 0) {
    container.appendChild(el('div', { class: 'empty' }, 'No foods match.'));
    return;
  }
  for (const { food, lights } of hits) {
    const blocked = isUnsafeFood(food.id);
    const unknown = lights.overall === 'unknown';
    const cls = `food food-${lights.overall}${blocked ? ' food-blocked' : ''}`;
    const head: HTMLElement[] = [trafficSummary(lights), el('div', { class: 'food-name' }, food.name)];
    if (unknown) head.push(unknownTag());
    if (blocked) head.push(el('span', { class: 'block-tag' }, 'Blocked'));

    const actions: HTMLElement[] = [];
    if (!blocked) actions.push(toggleSafeButton(food));
    actions.push(toggleBlockButton(food));

    container.appendChild(
      el('div', { class: cls }, [
        el('div', { class: 'food-head' }, head),
        el('div', { class: 'values' }, [
          `Suc ${food.sucs}g · Mal ${food.mals}g · Lac ${food.lacs}g per 100g`,
        ]),
        el('div', { class: 'food-actions' }, actions),
      ]),
    );
  }
}

export function render(root: HTMLElement): () => void {
  clear(root);

  const list = el('div', { class: 'list' });

  const renderFilters = (filtersEl: HTMLElement) => {
    clear(filtersEl);
    const filterBtn = (label: string, value: TrafficLight | 'all') =>
      el(
        'button',
        {
          class: `filter-btn${_filter === value ? ' active' : ''} filter-${value}`,
          onclick: () => {
            _filter = value;
            renderFilters(filtersEl);
            renderList(list);
          },
        },
        label,
      );
    filtersEl.appendChild(filterBtn('All', 'all'));
    filtersEl.appendChild(filterBtn('Green', 'green'));
    filtersEl.appendChild(filterBtn('Amber', 'amber'));
    filtersEl.appendChild(filterBtn('Red', 'red'));
    filtersEl.appendChild(filterBtn('Unknown', 'unknown'));
  };

  const input = el('input', {
    class: 'search-input',
    type: 'search',
    placeholder: 'Search foods...',
    value: _query,
    oninput: (e) => {
      _query = (e.target as HTMLInputElement).value;
      renderList(list);
    },
  });

  const filters = el('div', { class: 'filters' });
  renderFilters(filters);

  root.appendChild(el('div', { class: 'view' }, [input, filters, list]));
  renderList(list);

  return subscribe(() => renderList(list));
}
