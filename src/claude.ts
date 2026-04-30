import type { Food } from './types';

const API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a recipe generator for someone with Congenital Sucrase-Isomaltase Deficiency (CSID). The user cannot properly digest three specific disaccharides: sucrose, maltose, and lactose. You will receive a list of pre-approved "green" foods drawn from the NZ FOODfiles 2024 database. These foods have already been verified as safe based on the user's personal thresholds and exclusions. You must only use ingredients from this list. Do not substitute, add, or suggest ingredients outside this list without explicitly flagging them as needing verification. The user may also provide "priority ingredients" — foods they already have on hand. When priority ingredients are provided, build the recipe around them as the base of the dish and supplement with other items from the green foods list to complete it. Treat anything in priority ingredients as already known to be safe (the app has cross-checked them against the user's blocked list). When generating a recipe: use only the provided green foods list (and any priority ingredients) as ingredients; do not add sauces, condiments, or flavourings unless they appear in the green foods list; do not assume any ingredient is safe — if it is not in the list, do not use it; quantities should be practical for one to two people; steps should be simple and clear. Flag if fewer than three green ingredients are available and suggest the user loosen thresholds in Settings or review their blocked-foods list. The user enjoys Asian and Mexican flavours but is open to other cuisines — lean that way where the ingredients allow. Respond with: recipe name, cuisine style, ingredients with quantities, simple numbered steps, and a brief note on any disaccharide considerations. Do not include nutritional disclaimers or suggest the user consult a doctor.`;

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface RecipeRequest {
  apiKey: string;
  model: string;
  greenFoods: Food[];
  priorities?: string[];
  mealType: MealType;
  cuisine?: string;
}

export interface RecipeResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

function formatGreenFoods(foods: Food[]): string {
  if (foods.length === 0) return '(none)';
  return foods
    .map((f) => `- ${f.name} [sucrose ${f.sucs}g, maltose ${f.mals}g, lactose ${f.lacs}g per 100g]`)
    .join('\n');
}

export async function generateRecipe(req: RecipeRequest): Promise<RecipeResult> {
  if (!req.apiKey) throw new Error('No API key configured. Open Settings to add one.');

  const greenList = formatGreenFoods(req.greenFoods);

  const priorityBlock =
    req.priorities && req.priorities.length > 0
      ? `Priority ingredients I already have on hand (build the recipe around these as the base):\n` +
        req.priorities.map((p) => `- ${p}`).join('\n') +
        '\n\n'
      : '';

  const requestText =
    priorityBlock +
    `Meal type: ${req.mealType}` +
    (req.cuisine ? `\nPreferred cuisine: ${req.cuisine}` : '');

  console.info(
    `[CSID Safe] Sending ${req.greenFoods.length} green foods to Claude.`,
    {
      firstFiveGreens: req.greenFoods.slice(0, 5).map((f) => f.name),
      priorities: req.priorities ?? [],
    },
  );

  const body = {
    model: req.model,
    max_tokens: 1024,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Available green foods (use these to complement the priority ingredients):\n${greenList}`,
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: requestText },
        ],
      },
    ],
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': req.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message || JSON.stringify(err);
    } catch {
      detail = await res.text();
    }
    throw new Error(`Claude API ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('\n');

  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
    cacheReadTokens: data.usage?.cache_read_input_tokens ?? 0,
  };
}
