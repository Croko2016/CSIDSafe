import type { DotLight, Food, FoodLights, Thresholds, TrafficLight } from './types';

export const DEFAULT_THRESHOLDS: Thresholds = {
  sucs: { amber: 1, red: 3 },
  mals: { amber: 1, red: 3 },
  lacs: { amber: 2, red: 5 },
};

function classify(value: number, amber: number, red: number): DotLight {
  if (value > red) return 'red';
  if (value > amber) return 'amber';
  return 'green';
}

const RANK: Record<DotLight, number> = { green: 0, amber: 1, red: 2 };

function worst(...lights: DotLight[]): DotLight {
  let max: DotLight = 'green';
  for (const l of lights) if (RANK[l] > RANK[max]) max = l;
  return max;
}

export function isUnknownFood(food: Food): boolean {
  return food.sucs === 0 && food.mals === 0 && food.lacs === 0;
}

export function lightsFor(food: Food, thresholds: Thresholds): FoodLights {
  const sucs = classify(food.sucs, thresholds.sucs.amber, thresholds.sucs.red);
  const mals = classify(food.mals, thresholds.mals.amber, thresholds.mals.red);
  const lacs = classify(food.lacs, thresholds.lacs.amber, thresholds.lacs.red);
  const overall: TrafficLight = isUnknownFood(food) ? 'unknown' : worst(sucs, mals, lacs);
  return { sucs, mals, lacs, overall };
}
