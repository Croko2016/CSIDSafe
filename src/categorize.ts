import type { Category } from './types';

const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: 'dairy-alternatives',
    keywords: [
      'almond milk', 'oat milk', 'soy milk', 'rice milk', 'coconut milk',
      'cashew milk', 'macadamia milk', 'hazelnut milk', 'pea milk',
    ],
  },
  {
    category: 'proteins',
    keywords: [
      'beef', 'pork', 'lamb', 'chicken', 'turkey', 'duck', 'venison',
      'fish', 'salmon', 'tuna', 'snapper', 'cod', 'mackerel', 'sardine',
      'trout', 'hoki', 'paua', 'mussel', 'oyster', 'scallop', 'prawn',
      'shrimp', 'crab', 'lobster', 'crayfish', 'squid', 'calamari',
      'egg', 'eggs', 'tofu', 'tempeh',
      'lentil', 'chickpea', 'bean', 'edamame', 'split pea',
      'liver', 'kidney', 'heart', 'mince', 'sausage', 'bacon', 'ham',
      'steak', 'roast',
    ],
  },
  {
    category: 'vegetables',
    keywords: [
      'carrot', 'broccoli', 'cauliflower', 'cabbage', 'spinach', 'kale',
      'silverbeet', 'lettuce', 'rocket', 'celery', 'cucumber', 'tomato',
      'capsicum', 'pepper', 'onion', 'garlic', 'leek', 'shallot',
      'kumara', 'potato', 'pumpkin', 'squash', 'courgette', 'zucchini',
      'eggplant', 'aubergine', 'bok choy', 'pak choi', 'asparagus',
      'mushroom', 'parsnip', 'radish', 'beet', 'turnip', 'swede',
      'corn', 'sweetcorn', 'pea', 'green bean', 'snow pea', 'silver beet',
      'watercress', 'sprout', 'avocado', 'olive',
    ],
  },
  {
    category: 'grains',
    keywords: [
      'rice', 'oat', 'oats', 'oatmeal', 'porridge', 'quinoa', 'barley',
      'rye', 'buckwheat', 'millet', 'spelt',
      'bread', 'toast', 'bun', 'bagel', 'roll', 'pita', 'tortilla',
      'pasta', 'noodle', 'spaghetti', 'macaroni', 'lasagne', 'lasagna',
      'flour', 'cereal', 'wheat', 'bran', 'crumb', 'cracker',
    ],
  },
];

export function autoCategorize(foodName: string): Category {
  const name = foodName.toLowerCase();
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (name.includes(kw)) return rule.category;
    }
  }
  return 'condiments-other';
}

export const CATEGORY_LABELS: Record<Category, string> = {
  proteins: 'Proteins',
  vegetables: 'Vegetables',
  grains: 'Grains',
  'dairy-alternatives': 'Dairy alternatives',
  'condiments-other': 'Condiments / other',
};

export const CATEGORY_ORDER: Category[] = [
  'proteins',
  'vegetables',
  'grains',
  'dairy-alternatives',
  'condiments-other',
];
