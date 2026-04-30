import type { Food, FoodsPayload, SafeFood, Settings, UnsafeFood } from './types';
import { DEFAULT_THRESHOLDS } from './traffic-light';

const SETTINGS_KEY = 'csid-safe.settings';
const SAFE_FOODS_KEY = 'csid-safe.safeFoods';
const UNSAFE_FOODS_KEY = 'csid-safe.unsafeFoods';

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
