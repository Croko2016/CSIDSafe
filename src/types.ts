export interface Food {
  id: string;
  name: string;
  serving: number | null;
  servingUnit: string | null;
  sucs: number;
  mals: number;
  lacs: number;
}

export interface FoodsPayload {
  version: string;
  count: number;
  foods: Food[];
}

export type Disaccharide = 'sucs' | 'mals' | 'lacs';

export type DotLight = 'green' | 'amber' | 'red';
export type TrafficLight = DotLight | 'unknown';

export interface Thresholds {
  sucs: { amber: number; red: number };
  mals: { amber: number; red: number };
  lacs: { amber: number; red: number };
}

export type Category =
  | 'proteins'
  | 'vegetables'
  | 'grains'
  | 'dairy-alternatives'
  | 'condiments-other';

export interface SafeFood {
  foodId: string;
  category: Category;
  addedAt: number;
}

export interface UnsafeFood {
  foodId: string;
  addedAt: number;
}

export interface FoodOverride {
  foodId: string;
  sucs: number;
  mals: number;
  lacs: number;
  updatedAt: number;
}

export type DataSource = 'override' | 'database' | 'category-default' | 'unknown';

export interface FoodAnalysis {
  food: Food;
  values: { sucs: number; mals: number; lacs: number };
  source: DataSource;
  lights: FoodLights;
}

export interface SavedRecipe {
  id: string;
  name: string;
  cuisine: string;
  mealType: string;
  text: string;
  savedAt: number;
}

export interface Settings {
  thresholds: Thresholds;
  apiKey: string;
  model: string;
}

export interface FoodLights {
  sucs: DotLight;
  mals: DotLight;
  lacs: DotLight;
  overall: TrafficLight;
}
