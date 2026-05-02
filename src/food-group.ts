import type { Food } from './types';

// Conservative classifier: returns 'inherently-zero' only when we're confident
// the food category contains essentially no sucrose, maltose, or lactose. Used
// as Tier 3 for foods whose FOODfiles entry has all-zero values, to distinguish
// "actually zero" from "wasn't measured".
//
// Anything we can't confidently place stays 'unknown-eligible' — i.e. if its
// FOODfiles row is 0-0-0 we keep treating it as unknown.

export type FoodGroup = 'inherently-zero' | 'unknown-eligible';

const PLANT_MILKS = [
  'almond milk',
  'oat milk',
  'soy milk',
  'soya milk',
  'rice milk',
  'coconut milk',
  'cashew milk',
  'hazelnut milk',
  'macadamia milk',
  'pea milk',
];

const RAW_PROTEIN_KEYS = [
  'beef',
  'lamb',
  'pork',
  'mutton',
  'venison',
  'veal',
  'goat',
  'chicken',
  'turkey',
  'duck',
  'quail',
  'fish',
  'salmon',
  'tuna',
  'snapper',
  'cod',
  'mackerel',
  'trout',
  'hoki',
  'gurnard',
  'tarakihi',
  'kahawai',
  'kingfish',
  'sardine',
  'anchovy',
  'paua',
  'mussel',
  'oyster',
  'scallop',
  'prawn',
  'shrimp',
  'crab',
  'lobster',
  'crayfish',
  'squid',
  'octopus',
];

// If any of these appear, the food has been processed/combined with other
// ingredients and we shouldn't blanket-assume zero.
const PROCESSED_INDICATORS = [
  'sauce',
  'gravy',
  'marinated',
  'marinade',
  'seasoned',
  'crumbed',
  'crumb',
  'breaded',
  'battered',
  'fritter',
  'sausage',
  'salami',
  'pâté',
  'pate ',
  'roll',
  'meatball',
  'pie',
  'patty',
  'cake',
  'casserole',
  'curry',
  'stew',
  'soup',
  'pizza',
  'burger',
  'kebab',
  'wrap',
  'sandwich',
  'lasagne',
  'lasagna',
  'risotto',
  'pasta',
  'noodle',
  'ham,',
  'bacon',
  'jerky',
  'biltong',
  'with ',
  ' in ',
  ' & ',
  'sweetened',
  'flavour',
  'flavor',
  'syrup',
  'honey',
  'sugar',
  'glazed',
  'smoked',
  'cured',
  'pickled',
  'fermented',
];

function lower(s: string): string {
  return s.toLowerCase();
}

function hasAny(haystack: string, needles: string[]): boolean {
  for (const n of needles) if (haystack.includes(n)) return true;
  return false;
}

export function inferFoodGroup(food: Food): FoodGroup {
  const name = lower(food.name);

  // Plain water — tap, mineral, distilled. Reject flavoured / sweetened.
  if (/\bwater\b/.test(name) && !/(flavour|flavor|sweet|tonic|cordial|cola|lemonade)/.test(name)) {
    return 'inherently-zero';
  }

  // Plant milks — explicit phrase match.
  if (hasAny(name, PLANT_MILKS)) return 'inherently-zero';

  // Plain eggs — name starts with "egg" or is "eggs, ...". Plain scramble/fried/boiled
  // egg dishes are also OK; processed egg products (egg-and-bacon-pie etc.) are not.
  if (/^eggs?\b/.test(name)) {
    if (!hasAny(name, PROCESSED_INDICATORS)) return 'inherently-zero';
  }

  // Oils & cooking fats. Be cautious about "oily fish", "fatty acids".
  if (/\boil\b/.test(name) && !name.includes('fish') && !name.includes('acid')) {
    if (!hasAny(name, PROCESSED_INDICATORS)) return 'inherently-zero';
  }
  // "Fat, beef, raw", "Lard", "Dripping", "Ghee".
  if (/\bfat\b/.test(name) && !/(low fat|reduced fat|no fat|fat free|fatty)/.test(name)) {
    return 'inherently-zero';
  }
  if (/\b(lard|dripping|ghee|tallow|suet)\b/.test(name)) return 'inherently-zero';

  // Butter — has trace lactose (~0.1g) but close enough to zero for our purposes.
  // Exclude nut butters and butter-containing cooked goods.
  if (/\bbutter\b/.test(name)) {
    const isNutButter = /(peanut|almond|cashew|hazelnut|macadamia|sunflower)\s+butter/.test(name);
    if (!isNutButter && !hasAny(name, PROCESSED_INDICATORS)) {
      return 'inherently-zero';
    }
  }

  // Raw / cooked plain proteins. Need either "raw" or "cooked" + a protein keyword,
  // and no processed indicators.
  const isPlainPrep = /\b(raw|cooked|grilled|baked|roasted|boiled|steamed|poached|barbecued|bbq|broiled|stewed|fried)\b/.test(
    name,
  );
  if (isPlainPrep && hasAny(name, RAW_PROTEIN_KEYS) && !hasAny(name, PROCESSED_INDICATORS)) {
    return 'inherently-zero';
  }

  return 'unknown-eligible';
}
