import { el, clear } from '../dom';
import { getSettings, updateSettings } from '../state';
import { DEFAULT_THRESHOLDS } from '../traffic-light';
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

export function render(root: HTMLElement): () => void {
  function build(): void {
    clear(root);
    const settings = getSettings();

    const apiKeyInput = el('input', {
      type: 'password',
      class: 'api-key-input',
      value: settings.apiKey,
      placeholder: 'sk-ant-...',
      autocomplete: 'off',
      onchange: (e) => {
        updateSettings({ apiKey: (e.target as HTMLInputElement).value.trim() });
      },
    });

    const modelInput = el('input', {
      type: 'text',
      class: 'model-input',
      value: settings.model,
      onchange: (e) => {
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
          ]),
          el('label', { class: 'field' }, [el('span', { class: 'label' }, 'Model'), modelInput]),
        ]),
      ]),
    );
  }

  build();
  return () => {};
}
