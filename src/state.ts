import type { Food, FoodsPayload, SafeFood, SavedRecipe, Settings, UnsafeFood } from './types';
import { DEFAULT_THRESHOLDS } from './traffic-light';

const SETTINGS_KEY = 'kai-ora.settings';
const SAFE_FOODS_KEY = 'kai-ora.safeFoods';
const UNSAFE_FOODS_KEY = 'kai-ora.unsafeFoods';
const SAVED_RECIPES_KEY = 'kai-ora.savedRecipes';

// One-shot migration from the previous "csid-safe.*" namespace. Runs at module
// load before any reads, so existing user data carries over after the rename.
const LEGACY_KEY_MAP: Record<string, string> = {
  'csid-safe.settings': SETTINGS_KEY,
  'csid-safe.safeFoods': SAFE_FOODS_KEY,
  'csid-safe.unsafeFoods': UNSAFE_FOODS_KEY,
  'csid-safe.savedRecipes': SAVED_RECIPES_KEY,
};
try {
  for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
    if (localStorage.getItem(newKey) !== null) continue;
    const value = localStorage.getItem(oldKey);
    if (value !== null) {
      localStorage.setItem(newKey, value);
      localStorage.removeItem(oldKey);
    }
  }
} catch {
  /* ignore — private mode or storage disabled */
}

const DEFAULT_SETTINGS: Settings = {
  thresholds: DEFAULT_THRESHOLDS,
  apiKey: '',
  model: 'claude-haiku-4-5-20251001',
};

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

let _settings: Settings = readJSON(SETTINGS_KEY, DEFAULT_SETTINGS);
let _safeFoods: SafeFood[] = (() => {
  try {
    const raw = localStorage.getItem(SAFE_FOODS_KEY);
    return raw ? (JSON.parse(raw) as SafeFood[]) : [];
  } catch {
    return [];
  }
})();
let _unsafeFoods: UnsafeFood[] = (() => {
  try {
    const raw = localStorage.getItem(UNSAFE_FOODS_KEY);
    return raw ? (JSON.parse(raw) as UnsafeFood[]) : [];
  } catch {
    return [];
  }
})();
let _savedRecipes: SavedRecipe[] = (() => {
  try {
    const raw = localStorage.getItem(SAVED_RECIPES_KEY);
    return raw ? (JSON.parse(raw) as SavedRecipe[]) : [];
  } catch {
    return [];
  }
})();
let _foodsById: Map<string, Food> = new Map();
let _foodsList: Food[] = [];

const listeners = new Set<() => void>();
function notify(): void {
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function loadFoods(): Promise<void> {
  const url = new URL('foods.json', document.baseURI).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load foods.json: ${res.status}`);
  const payload = (await res.json()) as FoodsPayload;
  _foodsList = payload.foods;
  _foodsById = new Map(payload.foods.map((f) => [f.id, f]));
  notify();
}

export function getFoods(): Food[] {
  return _foodsList;
}

export function getFood(id: string): Food | undefined {
  return _foodsById.get(id);
}

export function getSettings(): Settings {
  return _settings;
}

export function updateSettings(patch: Partial<Settings>): void {
  _settings = { ..._settings, ...patch };
  writeJSON(SETTINGS_KEY, _settings);
  notify();
}

export function getSafeFoods(): SafeFood[] {
  return _safeFoods;
}

export function isSafeFood(foodId: string): boolean {
  return _safeFoods.some((s) => s.foodId === foodId);
}

export function addSafeFood(safe: SafeFood): void {
  if (isSafeFood(safe.foodId)) return;
  _safeFoods = [..._safeFoods, safe];
  writeJSON(SAFE_FOODS_KEY, _safeFoods);
  notify();
}

export function updateSafeFoodCategory(foodId: string, category: SafeFood['category']): void {
  _safeFoods = _safeFoods.map((s) => (s.foodId === foodId ? { ...s, category } : s));
  writeJSON(SAFE_FOODS_KEY, _safeFoods);
  notify();
}

export function removeSafeFood(foodId: string): void {
  _safeFoods = _safeFoods.filter((s) => s.foodId !== foodId);
  writeJSON(SAFE_FOODS_KEY, _safeFoods);
  notify();
}

export function getUnsafeFoods(): UnsafeFood[] {
  return _unsafeFoods;
}

export function isUnsafeFood(foodId: string): boolean {
  return _unsafeFoods.some((u) => u.foodId === foodId);
}

export function addUnsafeFood(foodId: string): void {
  if (isUnsafeFood(foodId)) return;
  _unsafeFoods = [..._unsafeFoods, { foodId, addedAt: Date.now() }];
  writeJSON(UNSAFE_FOODS_KEY, _unsafeFoods);
  notify();
}

export function removeUnsafeFood(foodId: string): void {
  _unsafeFoods = _unsafeFoods.filter((u) => u.foodId !== foodId);
  writeJSON(UNSAFE_FOODS_KEY, _unsafeFoods);
  notify();
}

export function getSavedRecipes(): SavedRecipe[] {
  return _savedRecipes;
}

export function addSavedRecipe(recipe: SavedRecipe): void {
  _savedRecipes = [recipe, ..._savedRecipes];
  writeJSON(SAVED_RECIPES_KEY, _savedRecipes);
  notify();
}

export function removeSavedRecipe(id: string): void {
  _savedRecipes = _savedRecipes.filter((r) => r.id !== id);
  writeJSON(SAVED_RECIPES_KEY, _savedRecipes);
  notify();
}

// ---- backup / restore -------------------------------------------------------

export interface BackupPayload {
  version: number;
  exportedAt: string;
  safeFoods: SafeFood[];
  unsafeFoods: UnsafeFood[];
  savedRecipes: SavedRecipe[];
}

export interface ImportSummary {
  safeFoods: number;
  unsafeFoods: number;
  savedRecipes: number;
  skipped: number;
}

export function exportData(): BackupPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    safeFoods: _safeFoods,
    unsafeFoods: _unsafeFoods,
    savedRecipes: _savedRecipes,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validSafeFoods(value: unknown, ctx: { skipped: number }): SafeFood[] | null {
  if (!Array.isArray(value)) return null;
  const out: SafeFood[] = [];
  for (const item of value) {
    if (!isObject(item) || typeof item.foodId !== 'string' || typeof item.category !== 'string') {
      ctx.skipped++;
      continue;
    }
    out.push({
      foodId: item.foodId,
      category: item.category as SafeFood['category'],
      addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
    });
  }
  return out;
}

function validUnsafeFoods(value: unknown, ctx: { skipped: number }): UnsafeFood[] | null {
  if (!Array.isArray(value)) return null;
  const out: UnsafeFood[] = [];
  for (const item of value) {
    if (!isObject(item) || typeof item.foodId !== 'string') {
      ctx.skipped++;
      continue;
    }
    out.push({
      foodId: item.foodId,
      addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
    });
  }
  return out;
}

function validSavedRecipes(value: unknown, ctx: { skipped: number }): SavedRecipe[] | null {
  if (!Array.isArray(value)) return null;
  const out: SavedRecipe[] = [];
  for (const item of value) {
    if (
      !isObject(item) ||
      typeof item.id !== 'string' ||
      typeof item.text !== 'string' ||
      typeof item.name !== 'string'
    ) {
      ctx.skipped++;
      continue;
    }
    out.push({
      id: item.id,
      name: item.name,
      cuisine: typeof item.cuisine === 'string' ? item.cuisine : '—',
      mealType: typeof item.mealType === 'string' ? item.mealType : 'dinner',
      text: item.text,
      savedAt: typeof item.savedAt === 'number' ? item.savedAt : Date.now(),
    });
  }
  return out;
}

export function replaceWithBackup(raw: unknown): ImportSummary {
  if (!isObject(raw)) {
    throw new Error('Backup file is not a JSON object.');
  }

  const ctx = { skipped: 0 };
  const newSafe = validSafeFoods(raw.safeFoods, ctx);
  const newUnsafe = validUnsafeFoods(raw.unsafeFoods, ctx);
  const newRecipes = validSavedRecipes(raw.savedRecipes, ctx);

  if (newSafe === null && newUnsafe === null && newRecipes === null) {
    throw new Error(
      'Backup is missing all of safeFoods, unsafeFoods, and savedRecipes. Wrong file?',
    );
  }

  if (newSafe !== null) {
    _safeFoods = newSafe;
    writeJSON(SAFE_FOODS_KEY, _safeFoods);
  }
  if (newUnsafe !== null) {
    _unsafeFoods = newUnsafe;
    writeJSON(UNSAFE_FOODS_KEY, _unsafeFoods);
  }
  if (newRecipes !== null) {
    _savedRecipes = newRecipes;
    writeJSON(SAVED_RECIPES_KEY, _savedRecipes);
  }

  notify();

  return {
    safeFoods: newSafe?.length ?? 0,
    unsafeFoods: newUnsafe?.length ?? 0,
    savedRecipes: newRecipes?.length ?? 0,
    skipped: ctx.skipped,
  };
}
