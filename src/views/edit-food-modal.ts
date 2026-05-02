import { el } from '../dom';
import { getOverride, removeOverride, setOverride } from '../state';
import type { Food } from '../types';

// Opens a modal letting the user enter sucrose / maltose / lactose values for
// a food. Saving stores a FoodOverride; "Reset" removes any existing override.
// Resolves once the modal closes.

export function openEditFoodModal(food: Food, currentValues: { sucs: number; mals: number; lacs: number }): Promise<void> {
  return new Promise((resolve) => {
    const existing = getOverride(food.id);
    let s = existing?.sucs ?? currentValues.sucs;
    let m = existing?.mals ?? currentValues.mals;
    let l = existing?.lacs ?? currentValues.lacs;

    const overlay = el('div', { class: 'modal-overlay', role: 'dialog', 'aria-modal': 'true' });
    const dialog = el('div', { class: 'modal-dialog' });

    const close = (): void => {
      document.body.removeChild(overlay);
      document.removeEventListener('keydown', onKey);
      resolve();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    const numberInput = (value: number, onChange: (v: number) => void): HTMLInputElement => {
      const input = el('input', {
        type: 'number',
        step: '0.1',
        min: '0',
        value,
        class: 'threshold-input',
        oninput: (e) => {
          const v = parseFloat((e.target as HTMLInputElement).value);
          if (Number.isFinite(v) && v >= 0) onChange(v);
        },
      }) as HTMLInputElement;
      return input;
    };

    const sucInput = numberInput(s, (v) => (s = v));
    const malInput = numberInput(m, (v) => (m = v));
    const lacInput = numberInput(l, (v) => (l = v));

    const saveBtn = el(
      'button',
      {
        class: 'btn btn-primary',
        onclick: () => {
          setOverride({
            foodId: food.id,
            sucs: s,
            mals: m,
            lacs: l,
            updatedAt: Date.now(),
          });
          close();
        },
      },
      existing ? 'Update override' : 'Save override',
    );

    const resetBtn = existing
      ? el(
          'button',
          {
            class: 'btn btn-remove',
            onclick: () => {
              if (confirm(`Remove your override for "${food.name}"? The app will fall back to FOODfiles data.`)) {
                removeOverride(food.id);
                close();
              }
            },
          },
          'Remove override',
        )
      : null;

    const cancelBtn = el('button', { class: 'btn', onclick: close }, 'Cancel');

    const fieldRow = (label: string, unit: string, input: HTMLInputElement): HTMLElement =>
      el('label', { class: 'modal-field' }, [
        el('span', { class: 'label' }, label),
        el('div', { class: 'modal-field-row' }, [input, el('span', { class: 'unit' }, unit)]),
      ]);

    const helpLine = existing
      ? `You've already set values for this food. Edit them below or reset to fall back on the database.`
      : `Enter values you've researched yourself. Per 100g.`;

    dialog.appendChild(el('h3', { class: 'modal-title' }, 'Edit values'));
    dialog.appendChild(el('div', { class: 'modal-food-name' }, food.name));
    dialog.appendChild(el('div', { class: 'help' }, helpLine));
    dialog.appendChild(fieldRow('Sucrose', 'g', sucInput));
    dialog.appendChild(fieldRow('Maltose', 'g', malInput));
    dialog.appendChild(fieldRow('Lactose', 'g', lacInput));

    const actions = el('div', { class: 'modal-actions' });
    actions.appendChild(cancelBtn);
    if (resetBtn) actions.appendChild(resetBtn);
    actions.appendChild(saveBtn);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // focus first input
    setTimeout(() => sucInput.focus(), 0);
  });
}
