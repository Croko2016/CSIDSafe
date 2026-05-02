import Fuse from 'fuse.js';
import type { Food, FoodAnalysis, TrafficLight } from './types';
import { analyseFood } from './food-resolve';
import { getFoods, getOverride, getSettings } from './state';

let _fuse: Fuse<Food> | null = null;
let _lastFoods: Food[] = [];

function fuse(): Fuse<Food> {
  const foods = getFoods();
  if (_fuse && foods === _lastFoods) return _fuse;
  _lastFoods = foods;
  _fuse = new Fuse(foods, {
    keys: ['name'],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  return _fuse;
}

export interface SearchOptions {
  query: string;
  filter: TrafficLight | 'all';
  limit?: number;
}

export function searchFoods({ query, filter, limit = 50 }: SearchOptions): FoodAnalysis[] {
  const thresholds = getSettings().thresholds;
  const trimmed = query.trim();

  let candidates: Food[];
  if (trimmed.length === 0) {
    candidates = getFoods();
  } else {
    candidates = fuse().search(trimmed).map((r) => r.item);
  }

  const hits: FoodAnalysis[] = [];
  for (const food of candidates) {
    const analysis = analyseFood(food, thresholds, getOverride(food.id));
    if (filter !== 'all' && analysis.lights.overall !== filter) continue;
    hits.push(analysis);
    if (hits.length >= limit) break;
  }

  if (trimmed.length === 0) {
    const rank: Record<TrafficLight, number> = { green: 0, amber: 1, red: 2, unknown: 3 };
    hits.sort((a, b) => {
      const r = rank[a.lights.overall] - rank[b.lights.overall];
      return r !== 0 ? r : a.food.name.localeCompare(b.food.name);
    });
  }

  return hits;
}
