import Fuse from 'fuse.js';
import type { Food, FoodLights, TrafficLight } from './types';
import { lightsFor } from './traffic-light';
import { getFoods, getSettings } from './state';

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

export interface SearchHit {
  food: Food;
  lights: FoodLights;
}

export function searchFoods({ query, filter, limit = 50 }: SearchOptions): SearchHit[] {
  const thresholds = getSettings().thresholds;
  const trimmed = query.trim();

  let candidates: Food[];
  if (trimmed.length === 0) {
    candidates = getFoods();
  } else {
    candidates = fuse().search(trimmed).map((r) => r.item);
  }

  const hits: SearchHit[] = [];
  for (const food of candidates) {
    const lights = lightsFor(food, thresholds);
    if (filter !== 'all' && lights.overall !== filter) continue;
    hits.push({ food, lights });
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
