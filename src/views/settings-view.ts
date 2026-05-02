import { el, clear } from '../dom';
import {
  exportData,
  getFood,
  getOverrides,
  getSafeFoods,
  getSavedRecipes,
  getSettings,
  getUnsafeFoods,
  removeOverride,
  replaceWithBackup,
  updateSettings,
} from '../state';
import { DEFAULT_THRESHOLDS } from '../traffic-light';
import { openEditFoodModal } from './edit-food-modal';
import type { Disaccharide, Thresholds } from '../types';

const LABELS: Record<Disaccharide, string> = {
  sucs: 'Sucrose',
  mals: 'Maltose',
  lacs: 'Lactose',
};

function thresholdRow(disaccharide: Disaccharide, thresholds: Thresholds): HTMLElement {
  const t = thresholds[disaccharide];

  const amberInput = el('input', {
    type: 'number',
    step: '0.1',
    min: '0',
    value: t.amber,
    class: 'threshold-input',
    onchange: (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      if (!Number.isFinite(v) || v < 0) return;
      const next: Thresholds = {
        ...thresholds,
        [disaccharide]: { ...thresholds[disaccharide], amber: v },
      };
      updateSettings({ thresholds: next });
    },
  });

  const redInput = el('input', {
    type: 'number',
    step: '0.1',
    min: '0',
    value: t.red,
    class: 'threshold-input',
    onchange: (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      if (!Number.isFinite(v) || v < 0) return;
      const next: Thresholds = {
        ...thresholds,
        [disaccharide]: { ...thresholds[disaccharide], red: v },
      };
      updateSettings({ thresholds: next });
    },
  });

  return el('div', { class: 'threshold-row' }, [
    el('div', { class: 'threshold-label' }, LABELS[disaccharide]),
    el('label', { class: 'threshold-field' }, [
      el('span', { class: 'pip pip-amber' }),
      el('span', {}, 'Amber >'),
      amberInput,
      el('span', { class: 'unit' }, 'g'),
    ]),
    el('label', { class: 'threshold-field' }, [
      el('span', { class: 'pip pip-red' }),
      el('span', {}, 'Red >'),
      redInput,
      el('span', { class: 'unit' }, 'g'),
    ]),
  ]);
}

function maskKey(key: string): string {
  if (key.length <= 8) return '•'.repeat(key.length);
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

function renderKeyStatus(target: HTMLElement, key: string): void {
  clear(target);
  if (key.length === 0) {
    target.appendChild(el('span', { class: 'status-dot status-empty' }));
    target.appendChild(el('span', { class: 'status-text' }, 'No key saved.'));
    return;
  }
  const looksValid = key.startsWith('sk-ant-') && key.length >= 20;
  const dotClass = looksValid ? 'status-ok' : 'status-warn';
  const label = looksValid
    ? `Key saved · ${maskKey(key)}`
    : `Key saved (unusual format · ${maskKey(key)})`;
  target.appendChild(el('span', { class: `status-dot ${dotClass}` }));
  target.appendChild(el('span', { class: 'status-text' }, label));
}

export function render(root: HTMLElement): () => void {
  function build(): void {
    clear(root);
    const settings = getSettings();

    const apiKeyStatus = el('div', { class: 'api-key-status' });
    renderKeyStatus(apiKeyStatus, settings.apiKey);

    const apiKeyInput = el('input', {
      type: 'password',
      class: 'api-key-input',
      value: settings.apiKey,
      placeholder: 'sk-ant-...',
      autocomplete: 'off',
      // oninput so a paste-and-leave flow on mobile persists immediately;
      // onchange only fires on blur, which mobile keyboards often skip.
      oninput: (e) => {
        const v = (e.target as HTMLInputElement).value.trim();
        updateSettings({ apiKey: v });
        renderKeyStatus(apiKeyStatus, v);
      },
    });

    const modelInput = el('input', {
      type: 'text',
      class: 'model-input',
      value: settings.model,
      oninput: (e) => {
        const v = (e.target as HTMLInputElement).value.trim();
        if (v) updateSettings({ model: v });
      },
    });

    const resetBtn = el(
      'button',
      {
        class: 'btn',
        onclick: () => updateSettings({ thresholds: DEFAULT_THRESHOLDS }),
      },
      'Reset to defaults',
    );

    // ---- backup / restore ----------------------------------------------------

    function downloadBackup(): void {
      const payload = exportData();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kai-ora-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    const fileInput = el('input', {
      type: 'file',
      accept: 'application/json,.json',
      class: 'visually-hidden',
      onchange: async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            throw new Error("That doesn't look like a JSON file.");
          }
          const cur = {
            safe: getSafeFoods().length,
            blocked: getUnsafeFoods().length,
            recipes: getSavedRecipes().length,
            overrides: getOverrides().length,
          };
          const proceed = confirm(
            `Restore from backup?\n\n` +
              `This will REPLACE your current data:\n` +
              `  • ${cur.safe} go-to foods\n` +
              `  • ${cur.blocked} blocked foods\n` +
              `  • ${cur.recipes} saved recipes\n` +
              `  • ${cur.overrides} overrides\n\n` +
              `with whatever is in the backup file. Cannot be undone.`,
          );
          if (!proceed) return;
          const summary = replaceWithBackup(parsed);
          alert(
            `Restored:\n` +
              `  • ${summary.safeFoods} go-to foods\n` +
              `  • ${summary.unsafeFoods} blocked foods\n` +
              `  • ${summary.savedRecipes} saved recipes\n` +
              `  • ${summary.overrides} overrides` +
              (summary.skipped > 0 ? `\n\n${summary.skipped} invalid entries skipped.` : ''),
          );
          build();
        } catch (err) {
          alert(`Import failed: ${(err as Error).message}`);
        } finally {
          target.value = '';
        }
      },
    });

    const exportBtn = el(
      'button',
      { class: 'btn btn-add', onclick: downloadBackup },
      'Export backup',
    );

    const importBtn = el(
      'button',
      { class: 'btn', onclick: () => fileInput.click() },
      'Import backup',
    );

    const counts = {
      safe: getSafeFoods().length,
      blocked: getUnsafeFoods().length,
      recipes: getSavedRecipes().length,
      overrides: getOverrides().length,
    };
    const countLine = el(
      'div',
      { class: 'help' },
      `Currently stored: ${counts.safe} go-to · ${counts.blocked} blocked · ${counts.recipes} recipes · ${counts.overrides} overrides.`,
    );

    // ---- My Corrections list -------------------------------------------------

    const correctionsList = el('div', { class: 'corrections-list' });
    const overrides = [...getOverrides()].sort((a, b) => b.updatedAt - a.updatedAt);

    if (overrides.length === 0) {
      correctionsList.appendChild(
        el(
          'div',
          { class: 'empty' },
          'No overrides yet. Tap the Edit button on any food to enter your own values.',
        ),
      );
    } else {
      for (const o of overrides) {
        const food = getFood(o.foodId);
        const name = food?.name ?? `Unknown food (${o.foodId})`;
        const editBtn = el(
          'button',
          {
            class: 'btn',
            onclick: () => {
              if (!food) return;
              void openEditFoodModal(food, { sucs: o.sucs, mals: o.mals, lacs: o.lacs });
            },
            disabled: !food,
          },
          'Edit',
        );
        const removeBtn = el(
          'button',
          {
            class: 'btn btn-remove',
            onclick: () => {
              if (confirm(`Remove your override for "${name}"?`)) {
                removeOverride(o.foodId);
                build();
              }
            },
          },
          'Remove',
        );
        correctionsList.appendChild(
          el('div', { class: 'correction-row' }, [
            el('div', { class: 'correction-name' }, name),
            el(
              'div',
              { class: 'correction-values' },
              `Suc ${o.sucs}g · Mal ${o.mals}g · Lac ${o.lacs}g per 100g`,
            ),
            el('div', { class: 'correction-actions' }, [editBtn, removeBtn]),
          ]),
        );
      }
    }

    root.appendChild(
      el('div', { class: 'view' }, [
        el('h2', { class: 'view-title' }, 'Settings'),

        el('section', { class: 'settings-section' }, [
          el('h3', {}, 'Traffic light thresholds'),
          el('div', { class: 'help' }, 'Per 100g of food. Red is the upper limit; amber is the warning level.'),
          thresholdRow('sucs', settings.thresholds),
          thresholdRow('mals', settings.thresholds),
          thresholdRow('lacs', settings.thresholds),
          el('div', { class: 'form-row' }, [resetBtn]),
        ]),

        el('section', { class: 'settings-section' }, [
          el('h3', {}, 'Claude API'),
          el(
            'div',
            { class: 'help' },
            'Stored in your browser only. Get a key at https://console.anthropic.com/.',
          ),
          el('label', { class: 'field' }, [
            el('span', { class: 'label' }, 'API key'),
            apiKeyInput,
            apiKeyStatus,
          ]),
          el('label', { class: 'field' }, [el('span', { class: 'label' }, 'Model'), modelInput]),
        ]),

        el('section', { class: 'settings-section' }, [
          el('h3', {}, 'My Corrections'),
          el(
            'div',
            { class: 'help' },
            'Foods where you\'ve manually entered values that take priority over the FOODfiles database.',
          ),
          correctionsList,
        ]),

        el('section', { class: 'settings-section' }, [
          el('h3', {}, 'Backup & restore'),
          el(
            'div',
            { class: 'help' },
            'Saves your go-to foods, blocked foods, saved recipes and manual overrides to a JSON file. The Claude API key and threshold settings are NOT included. Importing replaces everything.',
          ),
          countLine,
          el('div', { class: 'btn-row' }, [exportBtn, importBtn]),
          fileInput,
        ]),
      ]),
    );
  }

  build();
  return () => {};
}
