import { el } from '../dom';
import type { DataSource, DotLight, Food, FoodAnalysis } from '../types';
import { openEditFoodModal } from './edit-food-modal';

const UNKNOWN_TOOLTIP = 'Disaccharide data unavailable — verify before eating.';
const OVERRIDE_TOOLTIP = "You've personally overridden these values.";
const CATEGORY_DEFAULT_TOOLTIP =
  'Values inferred from food category (raw meat, eggs, oils, etc.) since the database has none.';

export function dot(light: DotLight, label: string): HTMLElement {
  return el('span', { class: `dot dot-${light}`, title: label });
}

export function trafficSummary(analysis: FoodAnalysis): HTMLElement {
  const lights = analysis.lights;
  return el('span', { class: 'lights' }, [
    dot(lights.sucs, `Sucrose: ${lights.sucs}`),
    dot(lights.mals, `Maltose: ${lights.mals}`),
    dot(lights.lacs, `Lactose: ${lights.lacs}`),
  ]);
}

export function sourceIcon(source: DataSource): HTMLElement | null {
  if (source === 'override') {
    return el('span', { class: 'source-icon source-override', title: OVERRIDE_TOOLTIP }, '✎');
  }
  if (source === 'category-default') {
    return el(
      'span',
      { class: 'source-icon source-category', title: CATEGORY_DEFAULT_TOOLTIP },
      '🌿',
    );
  }
  if (source === 'unknown') {
    return el('span', { class: 'unknown-tag', title: UNKNOWN_TOOLTIP }, '?');
  }
  return null;
}

export function valuesLine(analysis: FoodAnalysis): string {
  const v = analysis.values;
  return `Suc ${v.sucs}g · Mal ${v.mals}g · Lac ${v.lacs}g per 100g`;
}

export function editButton(food: Food, values: { sucs: number; mals: number; lacs: number }): HTMLElement {
  return el(
    'button',
    {
      class: 'btn btn-edit',
      title: 'Edit values',
      onclick: () => {
        void openEditFoodModal(food, values);
      },
    },
    '✎ Edit',
  );
}
