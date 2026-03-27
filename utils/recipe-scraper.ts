import type { Ingredient, RecipeStep } from './parser';

export interface ScrapedRecipe {
  title: string;
  image?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  cookTime?: string;
  servings?: string;
  source: string;
}

/**
 * レシピサイトからHTMLを取得しJSON-LDを抽出してレシピを構造化
 */
export async function scrapeRecipeSite(url: string): Promise<ScrapedRecipe | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MiruRecipe/1.0)',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const jsonLd = extractJsonLd(html);

    if (!jsonLd) return null;

    return parseJsonLdToRecipe(jsonLd, url);
  } catch {
    return null;
  }
}

/**
 * HTMLからSchema.org Recipe JSON-LDを抽出
 */
function extractJsonLd(html: string): any | null {
  // <script type="application/ld+json">...</script> を全て検索
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);

      // 直接Recipeの場合
      if (data['@type'] === 'Recipe') return data;

      // @graphの中にRecipeがある場合
      if (data['@graph'] && Array.isArray(data['@graph'])) {
        const recipe = data['@graph'].find(
          (item: any) => item['@type'] === 'Recipe'
        );
        if (recipe) return recipe;
      }

      // 配列の場合
      if (Array.isArray(data)) {
        const recipe = data.find((item: any) => item['@type'] === 'Recipe');
        if (recipe) return recipe;
      }
    } catch {
      // JSONパースエラーは無視して次のscriptタグへ
    }
  }

  return null;
}

/**
 * JSON-LDのRecipeオブジェクトをScrapedRecipeに変換
 */
function parseJsonLdToRecipe(jsonLd: any, sourceUrl: string): ScrapedRecipe {
  const ingredients = parseJsonLdIngredients(jsonLd.recipeIngredient);
  const steps = parseJsonLdInstructions(jsonLd.recipeInstructions);

  return {
    title: jsonLd.name || '',
    image: extractImage(jsonLd.image),
    ingredients,
    steps,
    cookTime: parseDuration(jsonLd.cookTime) || parseDuration(jsonLd.totalTime),
    servings: parseServings(jsonLd.recipeYield),
    source: sourceUrl,
  };
}

/**
 * recipeIngredientをパース
 */
function parseJsonLdIngredients(ingredients: any): Ingredient[] {
  if (!ingredients || !Array.isArray(ingredients)) return [];

  return ingredients.map((item: string) => {
    // 末尾の量パターンで分割（大さじ/小さじ/数字+単位/適量/少々等）
    const amountPattern = /[　\s]+(大さじ\S+|小さじ\S+|少々|少し|適量|ひとつまみ|お好みで|\d[\d./と]*\s*\S*)$/;
    const amountMatch = item.match(amountPattern);
    if (amountMatch) {
      const name = item.slice(0, item.length - amountMatch[0].length).trim();
      return { name, amount: amountMatch[1].trim() };
    }
    // 全角スペースで分割
    const fullWidthMatch = item.match(/^(.+?)　+(.+)$/);
    if (fullWidthMatch) {
      return { name: fullWidthMatch[1].trim(), amount: fullWidthMatch[2].trim() };
    }
    return { name: item, amount: '' };
  });
}

/**
 * recipeInstructionsをパース（HowToStepまたは文字列配列）
 */
function parseJsonLdInstructions(instructions: any): RecipeStep[] {
  if (!instructions) return [];

  // 文字列の場合
  if (typeof instructions === 'string') {
    return instructions
      .split(/\n+/)
      .filter((line: string) => line.trim())
      .map((text: string, i: number) => ({
        number: i + 1,
        text: text.trim(),
        timerSeconds: null,
        timestamp: null,
      }));
  }

  if (!Array.isArray(instructions)) return [];

  const steps: RecipeStep[] = [];
  let stepNum = 1;

  for (const item of instructions) {
    if (typeof item === 'string') {
      steps.push({
        number: stepNum++,
        text: item,
        timerSeconds: null,
        timestamp: null,
      });
    } else if (item['@type'] === 'HowToStep') {
      steps.push({
        number: stepNum++,
        text: item.text || item.name || '',
        timerSeconds: null,
        timestamp: null,
      });
    } else if (item['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
      for (const subItem of item.itemListElement) {
        steps.push({
          number: stepNum++,
          text: subItem.text || subItem.name || '',
          timerSeconds: null,
          timestamp: null,
        });
      }
    }
  }

  return steps;
}

/**
 * ISO 8601 duration (PT30M) を読みやすい文字列に変換
 */
function parseDuration(duration: string | undefined): string | undefined {
  if (!duration) return undefined;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const mins = match[2] ? parseInt(match[2]) : 0;
  const secs = match[3] ? parseInt(match[3]) : 0;

  // 秒のみの場合は分に変換
  const totalMins = hours * 60 + mins + Math.floor(secs / 60);
  const remSecs = secs % 60;

  const parts: string[] = [];
  if (totalMins >= 60) parts.push(`${Math.floor(totalMins / 60)}時間`);
  if (totalMins % 60 > 0) parts.push(`${totalMins % 60}分`);
  if (remSecs > 0 && totalMins === 0) parts.push(`${remSecs}秒`);
  return parts.join('') || undefined;
}

/**
 * recipeYieldをパース
 */
function parseServings(yield_: any): string | undefined {
  if (!yield_) return undefined;
  const raw = Array.isArray(yield_) ? yield_[0]?.toString() : yield_.toString();
  if (!raw) return undefined;

  // 英語表記 "2 servings" / "4 serving" → 「2人分」
  const servingMatch = raw.match(/^(\d+)\s*servings?$/i);
  if (servingMatch) return `${servingMatch[1]}人分`;

  // 数字のみ "4" → 「4人分」
  const numOnly = raw.match(/^(\d+)$/);
  if (numOnly) return `${numOnly[1]}人分`;

  return raw;
}

/**
 * imageフィールドからURL文字列を抽出
 */
function extractImage(image: any): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return image[0];
  if (image.url) return image.url;
  return undefined;
}
