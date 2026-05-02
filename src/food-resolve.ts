import type {
  DataSource,
  DotLight,
  Food,
  FoodAnalysis,
  FoodLights,
  FoodOverride,
  Thresholds,
} from './types';
import { inferFoodGroup } from './food-group';

interface ResolvedValues {
  sucs: number;
  mals: number;
  lacs: number;
  source: DataSource;
}

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

export function resolveValues(food: Food, override: FoodOverride | undefined): ResolvedValues {
  // Tier 1 — manual override
  if (override) {
    return { sucs: override.sucs, mals: override.mals, lacs: override.lacs, source: 'override' };
  }

  // Tier 2 — FOODfiles measured data, trusted as long as any value is non-zero
  const allZero = food.sucs === 0 && food.mals === 0 && food.lacs === 0;
  if (!allZero) {
    return { sucs: food.sucs, mals: food.mals, lacs: food.lacs, source: 'database' };
  }

  // Tier 3 — category default for foods we're confident are inherently zero
  if (inferFoodGroup(food) === 'inherently-zero') {
    return { sucs: 0, mals: 0, lacs: 0, source: 'category-default' };
  }

  // Otherwise, the food is probably just unmeasured.
  return { sucs: 0, mals: 0, lacs: 0, source: 'unknown' };
}

function lightsFromResolved(resolved: ResolvedValues, thresholds: Thresholds): FoodLights {
  if (resolved.source === 'unknown') {
    return { sucs: 'green', mals: 'green', lacs: 'green', overall: 'unknown' };
  }
  const sucs = classify(resolved.sucs, thresholds.sucs.amber, thresholds.sucs.red);
  const mals = classify(resolved.mals, thresholds.mals.amber, thresholds.mals.red);
  const lacs = classify(resolved.lacs, thresholds.lacs.amber, thresholds.lacs.red);
  return { sucs, mals, lacs, overall: worst(sucs, mals, lacs) };
}

export function analyseFood(
  food: Food,
  thresholds: Thresholds,
  override: FoodOverride | undefined,
): FoodAnalysis {
  const resolved = resolveValues(food, override);
  const lights = lightsFromResolved(resolved, thresholds);
  return {
    food,
    values: { sucs: resolved.sucs, mals: resolved.mals, lacs: resolved.lacs },
    source: resolved.source,
    lights,
  };
}
