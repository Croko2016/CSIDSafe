import { el, clear } from '../dom';
import { getFood, getSettings, getUnsafeFoods, removeUnsafeFood, subscribe } from '../state';
import { lightsFor } from '../traffic-light';
import type { DotLight, FoodLights } from '../types';

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

function renderList(container: HTMLElement): void {
  clear(container);
  const items = getUnsafeFoods();
  if (items.length === 0) {
    container.appendChild(
      el(
        'div',
        { class: 'empty' },
        'No personally blocked foods. Use the Block button on Search to add foods here.',
      ),
    );
    return;
  }

  const thresholds = getSettings().thresholds;
  const sorted = [...items].sort((a, b) => b.addedAt - a.addedAt);

  for (const u of sorted) {
    const food = getFood(u.foodId);
    if (!food) {
      container.appendChild(
        el('div', { class: 'food food-blocked' }, [
          el('div', { class: 'food-head' }, [
            el('div', { class: 'food-name' }, `Unknown food (${u.foodId})`),
            el('span', { class: 'block-tag' }, 'Blocked'),
          ]),
          el('div', { class: 'food-actions' }, [
            el(
              'button',
              { class: 'btn btn-block', onclick: () => removeUnsafeFood(u.foodId) },
              'Unblock',
            ),
          ]),
        ]),
      );
      continue;
    }

    const lights = lightsFor(food, thresholds);
    const head: HTMLElement[] = [summary(lights), el('div', { class: 'food-name' }, food.name)];
    if (lights.overall === 'unknown') head.push(unknownTag());
    head.push(el('span', { class: 'block-tag' }, 'Blocked'));
    container.appendChild(
      el('div', { class: `food food-${lights.overall} food-blocked` }, [
        el('div', { class: 'food-head' }, head),
        el('div', { class: 'values' }, [
          `Suc ${food.sucs}g · Mal ${food.mals}g · Lac ${food.lacs}g per 100g`,
        ]),
        el('div', { class: 'food-actions' }, [
          el(
            'button',
            { class: 'btn btn-block', onclick: () => removeUnsafeFood(food.id) },
            'Unblock',
          ),
        ]),
      ]),
    );
  }
}

export function render(root: HTMLElement): () => void {
  clear(root);
  const list = el('div', { class: 'list' });
  root.appendChild(
    el('div', { class: 'view' }, [
      el('h2', { class: 'view-title' }, 'Blocked foods'),
      el(
        'div',
        { class: 'help' },
        'These foods are excluded from your safe list and recipe generation, regardless of their database values.',
      ),
      list,
    ]),
  );
  renderList(list);
  return subscribe(() => renderList(list));
}
