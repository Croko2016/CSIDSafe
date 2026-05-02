import { el, clear } from '../dom';
import { getFood, getOverride, getSettings, getUnsafeFoods, removeUnsafeFood, subscribe } from '../state';
import { analyseFood } from '../food-resolve';
import { editButton, sourceIcon, trafficSummary, valuesLine } from './food-bits';

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

    const analysis = analyseFood(food, thresholds, getOverride(food.id));
    const head: HTMLElement[] = [
      trafficSummary(analysis),
      el('div', { class: 'food-name' }, food.name),
    ];
    const icon = sourceIcon(analysis.source);
    if (icon) head.push(icon);
    head.push(el('span', { class: 'block-tag' }, 'Blocked'));

    container.appendChild(
      el('div', { class: `food food-${analysis.lights.overall} food-blocked` }, [
        el('div', { class: 'food-head' }, head),
        el('div', { class: 'values' }, [valuesLine(analysis)]),
        el('div', { class: 'food-actions' }, [
          editButton(food, analysis.values),
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
        'These foods are excluded from your go-to list and recipe generation, regardless of their database values.',
      ),
      list,
    ]),
  );
  renderList(list);
  return subscribe(() => renderList(list));
}
