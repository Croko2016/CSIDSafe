import './styles.css';
import { el, clear } from './dom';
import { loadFoods } from './state';
import { render as renderSearch } from './views/search-view';
import { render as renderSafeFoods } from './views/safe-foods-view';
import { render as renderBlocked } from './views/blocked-view';
import { render as renderRecipes } from './views/recipes-view';
import { render as renderSettings } from './views/settings-view';

type TabId = 'search' | 'safe' | 'blocked' | 'recipes' | 'settings';

const TABS: { id: TabId; label: string; render: (r: HTMLElement) => () => void }[] = [
  { id: 'search', label: 'Search', render: renderSearch },
  { id: 'safe', label: 'Safe', render: renderSafeFoods },
  { id: 'blocked', label: 'Blocked', render: renderBlocked },
  { id: 'recipes', label: 'Recipes', render: renderRecipes },
  { id: 'settings', label: 'Settings', render: renderSettings },
];

let currentTab: TabId = 'search';
let cleanup: (() => void) | null = null;

function activateTab(id: TabId, viewRoot: HTMLElement, tabBar: HTMLElement): void {
  currentTab = id;
  if (cleanup) cleanup();
  const tab = TABS.find((t) => t.id === id);
  if (!tab) return;
  cleanup = tab.render(viewRoot);
  for (const btn of Array.from(tabBar.querySelectorAll('.tab'))) {
    btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === id);
  }
}

async function bootstrap(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('No #app root');

  clear(app);
  const splash = el('div', { class: 'splash' }, 'Loading foods…');
  app.appendChild(splash);

  try {
    await loadFoods();
  } catch (e) {
    clear(app);
    app.appendChild(
      el('div', { class: 'splash splash-error' }, `Failed to load foods data: ${(e as Error).message}`),
    );
    return;
  }

  clear(app);

  const viewRoot = el('main', { class: 'view-root' });
  const tabBar = el('nav', { class: 'tabs' });

  for (const t of TABS) {
    tabBar.appendChild(
      el(
        'button',
        {
          class: 'tab',
          'data-tab': t.id,
          onclick: () => activateTab(t.id, viewRoot, tabBar),
        },
        t.label,
      ),
    );
  }

  app.appendChild(
    el('div', { class: 'app-shell' }, [
      el('header', { class: 'app-header' }, [el('h1', {}, 'CSID Safe')]),
      viewRoot,
      tabBar,
    ]),
  );

  activateTab(currentTab, viewRoot, tabBar);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', document.baseURI).toString();
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* ignore — dev or unsupported */
    });
  });
}

bootstrap();
