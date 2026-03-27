import type { Caption } from './captions';

export interface Ingredient {
  name: string;
  amount: string;
}

export interface RecipeStep {
  number: number;
  text: string;
  timerSeconds: number | null;
  timestamp: number | null; // seconds from start
}

export interface ParsedRecipe {
  ingredients: Ingredient[];
  steps: RecipeStep[];
  servings: string;
  cookTime?: string;
  source?: 'description' | 'captions' | 'jsonld';
}

// ── Unit patterns for ingredient detection ──

const UNIT_PATTERN = [
  // Weight
  'グラム', 'g', 'kg', 'キロ',
  // Volume
  'ミリリットル', 'ml', 'cc', 'リットル', 'l',
  // Spoon measures
  '大さじ', '小さじ',
  // Counting units
  '個', '本', '枚', '切れ', '丁', '束', '片', 'かけ',
  'パック', '缶', '袋', 'カップ', '合',
  // Vague amounts (no number needed)
  '適量', '少々', '少し', 'お好みで', 'ひとつまみ', 'たっぷり', 'ひとかけ',
].join('|');

// Vague amounts that don't require a preceding number
const VAGUE_AMOUNTS = /適量|少々|少し|お好みで|ひとつまみ|たっぷり|ひとかけ/;

// Number pattern: full-width or half-width digits, fractions, decimals
const NUM = `[0-9０-９]+(?:[./．／][0-9０-９]+)?`;

// Combined: number + unit  OR  spoon + number  OR  vague
const AMOUNT_PATTERN = new RegExp(
  `(?:(?:${NUM})\\s*(?:${UNIT_PATTERN}))|` +
  `(?:(?:大さじ|小さじ)\\s*(?:${NUM}))|` +
  `(?:${VAGUE_AMOUNTS.source})`,
  'g'
);

// Single match version for testing presence
const AMOUNT_PATTERN_SINGLE = new RegExp(
  `(?:(?:${NUM})\\s*(?:${UNIT_PATTERN}))|` +
  `(?:(?:大さじ|小さじ)\\s*(?:${NUM}))|` +
  `(?:${VAGUE_AMOUNTS.source})`
);

// ── Bullet / section header patterns ──

const BULLET_PREFIX = /^[・\-\*•■▪▸▹►▻→⇒☆★◆◇○●]\s*/;

const INGREDIENT_SECTION_HEADERS = /材料/;
// ⚠️ 「レシピ」は動画タイトルに含まれやすいので除外。明確なセクション表記のみ
const STEP_SECTION_HEADERS = /【作り方|【手順|■作り方|■手順|▼作り方|▼手順|〜作り方|～作り方|━+作り方|={2,}作り方|^作り方$|^手順$|^ステップ$/;

// Numbered step formats: 1. 1） ① (1) ❶ full-width
const NUMBERED_STEP = /^(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]|[❶❷❸❹❺❻❼❽❾❿]|[（(]?\s*[0-9０-９]+\s*[)）]?[.．、)\s]\s*)(.+)/;

// Map circled numbers to integers
function circledNumberToInt(ch: string): number | null {
  const circled = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  const filled = '❶❷❸❹❺❻❼❽❾❿';
  let idx = circled.indexOf(ch);
  if (idx >= 0) return idx + 1;
  idx = filled.indexOf(ch);
  if (idx >= 0) return idx + 1;
  return null;
}

// ── Cooking action verbs & transitions (for caption parsing) ──

const ACTION_VERBS = /切り?ます|切る|炒めます|炒める|茹でます|茹でる|ゆでます|ゆでる|混ぜます|混ぜる|焼きます|焼く|煮ます|煮る|入れます|入れる|加えます|加える|盛り付け|のせ|かけ|蒸し|揚げ|漬け|和え|絡め|沸かし|沸騰|冷まし|冷やし|温め|つけ|ふた|蓋|フタをし|落とし蓋|アクを取|水を切|水気を|油を引|油を入れ|火を止め|火を通し|下ごしらえ|下味|味を調え|味付け|塩をふ|塩を入れ|盛り付け|仕上げ|完成/;

const TRANSITION_WORDS = /^(?:まず|次に|そして|それから|続いて|ここで|では|そしたら|できたら|最後に|それでは|じゃあ|はい\s*(?:では|じゃ|それ)|で\s*(?:次|その))/;

// Temperature patterns
const TEMPERATURE = /(?:中火|強火|弱火|とろ火|中強火|弱中火|\d+度|\d+℃)/;

// ── Full-width to half-width number conversion ──

function normalizeNumber(s: string): string {
  return s.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30)
  );
}

// ══════════════════════════════════════════════════
//  parseDescription - enhanced for varied formats
// ══════════════════════════════════════════════════

export function parseDescription(description: string): ParsedRecipe {
  const ingredients = parseIngredientsFromDescription(description);
  const steps = parseStepsFromDescription(description);
  const servings = parseServings(description);

  return { ingredients, steps, servings, source: 'description' };
}

function parseIngredientsFromDescription(text: string): Ingredient[] {
  const ingredients: Ingredient[] = [];
  const lines = text.split('\n');

  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect ingredient section header
    if (INGREDIENT_SECTION_HEADERS.test(trimmed)) {
      inSection = true;
      continue;
    }

    // End on step section header or other major section
    if (inSection && (STEP_SECTION_HEADERS.test(trimmed) || /【|■|▼|━{3,}|={3,}/.test(trimmed))) {
      if (!INGREDIENT_SECTION_HEADERS.test(trimmed)) {
        inSection = false;
        continue;
      }
    }

    // Timestamp-only lines end the section
    if (inSection && /^\d+:\d+/.test(trimmed)) {
      inSection = false;
      continue;
    }

    if (inSection) {
      const ingredient = parseIngredientLine(trimmed);
      if (ingredient) {
        ingredients.push(ingredient);
      }
    }
  }

  return ingredients;
}

function parseIngredientLine(line: string): Ingredient | null {
  // Strip bullet prefix
  const cleaned = line.replace(BULLET_PREFIX, '').trim();
  if (!cleaned || cleaned.length > 80) return null;

  // Pattern: "name  amount" (2+ spaces or full-width space)
  const splitMatch =
    cleaned.match(/^(.+?)\s{2,}(.+)$/) ||
    cleaned.match(/^(.+?)　+(.+)$/) ||
    cleaned.match(/^(.+?)\s+(\d+.*)$/);

  if (splitMatch) {
    return { name: splitMatch[1].trim(), amount: normalizeNumber(splitMatch[2].trim()) };
  }

  // Pattern: "name…amount" or "name：amount" (colon separator)
  const colonMatch = cleaned.match(/^(.+?)[：:](.+)$/);
  if (colonMatch) {
    return { name: colonMatch[1].trim(), amount: normalizeNumber(colonMatch[2].trim()) };
  }

  // Pattern: "name…amount" (dots as separator)
  const dotMatch = cleaned.match(/^(.+?)[…]{1,}(.+)$/);
  if (dotMatch) {
    return { name: dotMatch[1].trim(), amount: normalizeNumber(dotMatch[2].trim()) };
  }

  // If the line contains an amount-like pattern, try to split
  if (AMOUNT_PATTERN_SINGLE.test(cleaned)) {
    // Try splitting at the amount
    const amtMatch = cleaned.match(new RegExp(`^(.+?)((?:${NUM})\\s*(?:${UNIT_PATTERN})|(?:大さじ|小さじ)\\s*(?:${NUM})|${VAGUE_AMOUNTS.source})(.*)$`));
    if (amtMatch) {
      const name = amtMatch[1].trim();
      const amount = normalizeNumber((amtMatch[2] + (amtMatch[3] || '')).trim());
      if (name) return { name, amount };
    }
  }

  // Plain text ingredient with no amount
  return { name: cleaned, amount: '' };
}

function parseStepsFromDescription(text: string): RecipeStep[] {
  const steps: RecipeStep[] = [];
  const lines = text.split('\n');

  let inSection = false;
  let stepNumber = 0;

  const timestamps = parseTimestamps(text);

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect step section header
    if (STEP_SECTION_HEADERS.test(trimmed)) {
      inSection = true;
      continue;
    }

    // End on another section header
    if (inSection && /【|■|▼|━{3,}|={3,}/.test(trimmed) && !STEP_SECTION_HEADERS.test(trimmed)) {
      inSection = false;
      continue;
    }

    // Timestamp-only line
    if (/^\d+:\d+/.test(trimmed)) {
      inSection = false;
      continue;
    }

    // ハッシュタグ行・絵文字だけの行・URL行はスキップ
    if (/^#[^\s]|^https?:\/\/|^[^\w\u3040-\u9fff]+$/.test(trimmed)) continue;

    if (inSection && trimmed.length > 0) {
      // Try numbered step (various formats)
      const numMatch = NUMBERED_STEP.exec(trimmed);
      if (numMatch) {
        stepNumber++;
        const stepText = numMatch[1] || numMatch[0].replace(NUMBERED_STEP, '$1');
        const timerSeconds = detectTimer(stepText);
        const timestamp = findTimestampForStep(stepNumber, timestamps);

        steps.push({ number: stepNumber, text: stepText.trim(), timerSeconds, timestamp });
        continue;
      }

      // Circled number at start
      const firstChar = trimmed[0];
      const circledNum = circledNumberToInt(firstChar);
      if (circledNum !== null) {
        stepNumber = circledNum;
        const stepText = trimmed.slice(1).trim();
        steps.push({
          number: stepNumber,
          text: stepText,
          timerSeconds: detectTimer(stepText),
          timestamp: findTimestampForStep(stepNumber, timestamps),
        });
        continue;
      }

      // Bullet-prefixed line as a step
      if (BULLET_PREFIX.test(trimmed)) {
        stepNumber++;
        const stepText = trimmed.replace(BULLET_PREFIX, '').trim();
        steps.push({
          number: stepNumber,
          text: stepText,
          timerSeconds: detectTimer(stepText),
          timestamp: findTimestampForStep(stepNumber, timestamps),
        });
        continue;
      }

      // Plain text line within step section
      if (trimmed.length > 5) {
        stepNumber++;
        steps.push({
          number: stepNumber,
          text: trimmed,
          timerSeconds: detectTimer(trimmed),
          timestamp: findTimestampForStep(stepNumber, timestamps),
        });
      }
    }
  }

  return steps;
}

// ══════════════════════════════════════════════════
//  parseCaptions - robust spoken Japanese extraction
// ══════════════════════════════════════════════════

export function parseCaptions(captions: Caption[]): ParsedRecipe {
  if (!captions || captions.length === 0) {
    return { ingredients: [], steps: [], servings: '', source: 'captions' };
  }

  const fullText = captions.map((c) => c.text).join(' ');
  const ingredients = extractIngredientsFromCaptions(captions);
  const steps = extractStepsFromCaptions(captions);
  const servings = parseServings(fullText);

  return { ingredients, steps, servings, source: 'captions' };
}

/**
 * Extract ingredients from caption text.
 * Spoken captions don't have neat sections — ingredients are mentioned
 * inline with amounts. We scan all captions for amount patterns and
 * extract the food name that precedes them.
 */
function extractIngredientsFromCaptions(captions: Caption[]): Ingredient[] {
  const ingredients: Ingredient[] = [];
  const seen = new Set<string>();

  // Join all caption text for continuous parsing
  const fullText = captions.map((c) => c.text).join(' ');

  // Strategy 1: Look for "ingredient section" context in captions
  // Speakers often say 材料 then list items
  const sectionIngredients = extractIngredientSection(captions);
  for (const ing of sectionIngredients) {
    const key = ing.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      ingredients.push(ing);
    }
  }

  // Strategy 2: Pattern match across full text for "name + amount"
  const inlineIngredients = extractInlineIngredients(fullText);
  for (const ing of inlineIngredients) {
    const key = ing.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      ingredients.push(ing);
    }
  }

  return ingredients;
}

/**
 * Look for a section signaled by 材料/ざいりょう/用意するもの keywords,
 * then collect ingredients until the cooking starts.
 */
function extractIngredientSection(captions: Caption[]): Ingredient[] {
  const ingredients: Ingredient[] = [];
  let inSection = false;
  let sectionText = '';

  for (const caption of captions) {
    const text = caption.text;

    if (/材料|ざいりょう|用意するもの|使うもの/.test(text)) {
      inSection = true;
      // The keyword caption itself may contain ingredients after the keyword
      const afterKeyword = text.replace(/.*(?:材料|ざいりょう|用意するもの|使うもの)[はがを、。\s]*/, '');
      if (afterKeyword.trim()) sectionText += ' ' + afterKeyword;
      continue;
    }

    // End section when cooking actions start
    if (inSection && ACTION_VERBS.test(text) && /まず|では|最初|作っていき|始め/.test(text)) {
      break;
    }

    if (inSection) {
      sectionText += ' ' + text;
    }
  }

  if (sectionText.trim()) {
    const found = extractInlineIngredients(sectionText);
    ingredients.push(...found);
  }

  return ingredients;
}

/**
 * Extract "food name + amount" patterns from continuous text.
 * Handles patterns like:
 *   パスタ200グラム → {name: パスタ, amount: 200グラム}
 *   ベーコンはブロックのやつを100グラム → {name: ベーコン, amount: 100グラム}
 *   オリーブオイル大さじ1 → {name: オリーブオイル, amount: 大さじ1}
 *   塩も適量 → {name: 塩, amount: 適量}
 */
function extractInlineIngredients(text: string): Ingredient[] {
  const ingredients: Ingredient[] = [];
  const normalized = normalizeNumber(text);

  // Pattern A: name + number + unit (e.g. パスタ200グラム, 卵黄3つ -> 3個)
  const unitList = 'グラム|g|kg|キロ|ミリリットル|ml|cc|リットル|l|個|本|枚|切れ|丁|束|片|かけ|パック|缶|袋|カップ|合|つ';
  const patternA = new RegExp(
    `([\\p{Script=Katakana}\\p{Script=Hiragana}\\p{Script=Han}ー]+?)(?:[はがをも、の].*?)?([0-9]+(?:[./][0-9]+)?\\s*(?:${unitList}))`,
    'gu'
  );

  let m;
  while ((m = patternA.exec(normalized)) !== null) {
    const name = cleanIngredientName(m[1]);
    if (name && name.length >= 1 && name.length <= 20) {
      ingredients.push({ name, amount: m[2].trim() });
    }
  }

  // Pattern B: name + 大さじ/小さじ + number (e.g. オリーブオイル大さじ1)
  const patternB = new RegExp(
    `([\\p{Script=Katakana}\\p{Script=Hiragana}\\p{Script=Han}ー]+?)(?:[はがをも、の].*?)?((?:大さじ|小さじ)\\s*[0-9]+(?:[./][0-9]+)?)`,
    'gu'
  );

  while ((m = patternB.exec(normalized)) !== null) {
    const name = cleanIngredientName(m[1]);
    if (name && name.length >= 1 && name.length <= 20) {
      // Avoid duplicates from pattern A
      if (!ingredients.some((i) => i.name === name)) {
        ingredients.push({ name, amount: m[2].trim() });
      }
    }
  }

  // Pattern C: name + vague amount (e.g. 塩も適量, 黒こしょうは適量)
  const patternC = new RegExp(
    `([\\p{Script=Katakana}\\p{Script=Hiragana}\\p{Script=Han}ー]+?)(?:[はがをも、の].*?)?(適量|少々|少し|お好みで|ひとつまみ|たっぷり|ひとかけ)`,
    'gu'
  );

  while ((m = patternC.exec(normalized)) !== null) {
    const name = cleanIngredientName(m[1]);
    if (name && name.length >= 1 && name.length <= 20) {
      if (!ingredients.some((i) => i.name === name)) {
        ingredients.push({ name, amount: m[2].trim() });
      }
    }
  }

  return ingredients;
}

/**
 * Clean up ingredient name by removing trailing particles and filler words.
 */
function cleanIngredientName(raw: string): string {
  return raw
    .replace(/(?:はい|えーと|えー|まあ|あと|それと|あとは|それから|次は|次に|続いて|で)$/, '')
    .replace(/(?:なんですけど|ですけど|ですが|ですね|だけど|けど|が)$/, '')
    .replace(/[はがをもの、。]$/, '')
    .trim();
}

/**
 * Extract steps from captions using transition words and action verbs.
 * Each step gets a timestamp from the caption it was derived from.
 */
function extractStepsFromCaptions(captions: Caption[]): RecipeStep[] {
  const steps: RecipeStep[] = [];
  let stepNum = 0;
  let currentText = '';
  let currentStart: number | null = null;
  let cookingStarted = false;

  for (let i = 0; i < captions.length; i++) {
    const caption = captions[i];
    const text = caption.text.trim();
    if (!text) continue;

    // Detect cooking start
    if (!cookingStarted) {
      if (
        TRANSITION_WORDS.test(text) ||
        (/作っていき|始め|スタート/.test(text)) ||
        (ACTION_VERBS.test(text) && i > captions.length * 0.05) // skip intro
      ) {
        cookingStarted = true;
      } else {
        continue;
      }
    }

    // Should we start a new step?
    const isNewStep =
      TRANSITION_WORDS.test(text) ||
      (ACTION_VERBS.test(text) && shouldSplitStep(currentText, text));

    if (isNewStep && currentText.trim()) {
      // Flush current step
      stepNum++;
      const cleaned = cleanStepText(currentText);
      steps.push({
        number: stepNum,
        text: cleaned,
        timerSeconds: detectTimer(cleaned),
        timestamp: currentStart !== null ? Math.floor(currentStart) : null,
      });
      currentText = text;
      currentStart = caption.start;
    } else {
      if (currentStart === null) currentStart = caption.start;
      currentText += (currentText ? ' ' : '') + text;
    }
  }

  // Flush last step
  if (currentText.trim()) {
    stepNum++;
    const cleaned = cleanStepText(currentText);
    steps.push({
      number: stepNum,
      text: cleaned,
      timerSeconds: detectTimer(cleaned),
      timestamp: currentStart !== null ? Math.floor(currentStart) : null,
    });
  }

  // Post-process: merge very short steps into previous
  return mergeShortSteps(steps);
}

/**
 * Decide whether an action verb in new text warrants splitting from current.
 * Avoids over-splitting on every verb mention.
 */
function shouldSplitStep(current: string, newText: string): boolean {
  // Always split if current is long enough (30+ chars)
  if (current.length >= 30) return true;
  // Split if new text starts with a transition
  if (TRANSITION_WORDS.test(newText)) return true;
  // Split if there's a temperature change
  if (TEMPERATURE.test(newText) && !TEMPERATURE.test(current)) return true;
  // Don't split tiny fragments
  if (current.length < 10) return false;
  return true;
}

/**
 * Clean spoken filler from step text.
 */
function cleanStepText(text: string): string {
  return text
    .replace(/(?:^|\s)(?:えーと|えー|まあ|うーん|はい|ね)\s/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Merge steps shorter than 15 chars into the previous step.
 */
function mergeShortSteps(steps: RecipeStep[]): RecipeStep[] {
  if (steps.length <= 1) return steps;

  const merged: RecipeStep[] = [steps[0]];

  for (let i = 1; i < steps.length; i++) {
    const prev = merged[merged.length - 1];
    if (steps[i].text.length < 15 && !TRANSITION_WORDS.test(steps[i].text)) {
      // Merge into previous
      prev.text += ' ' + steps[i].text;
      prev.timerSeconds = prev.timerSeconds ?? detectTimer(steps[i].text);
    } else {
      merged.push(steps[i]);
    }
  }

  // Renumber
  return merged.map((s, i) => ({ ...s, number: i + 1 }));
}

// ══════════════════════════════════════════════════
//  smartParse - best-effort combining description + captions
// ══════════════════════════════════════════════════

export interface SmartParseResult extends ParsedRecipe {
  source: 'description' | 'captions' | 'jsonld';
}

/**
 * Try description parsing first. If result is too sparse,
 * fall back to caption-based parsing.
 * Returns the best result with source annotation.
 */
export function smartParse(
  description: string,
  captions: Caption[] | null
): SmartParseResult {
  const descResult = parseDescription(description);

  const descHasEnough =
    descResult.ingredients.length >= 2 && descResult.steps.length >= 2;

  if (descHasEnough) {
    return { ...descResult, source: 'description' };
  }

  // Try captions
  if (captions && captions.length > 0) {
    const capResult = parseCaptions(captions);

    const capHasMore =
      capResult.ingredients.length > descResult.ingredients.length ||
      capResult.steps.length > descResult.steps.length;

    if (capHasMore) {
      // Merge: prefer captions but keep any description data as supplement
      return {
        ingredients:
          capResult.ingredients.length >= descResult.ingredients.length
            ? capResult.ingredients
            : descResult.ingredients,
        steps:
          capResult.steps.length >= descResult.steps.length
            ? capResult.steps
            : descResult.steps,
        servings: descResult.servings || capResult.servings,
        cookTime: descResult.cookTime || capResult.cookTime,
        source: 'captions',
      };
    }
  }

  // Return description result even if sparse
  return { ...descResult, source: 'description' };
}

// ══════════════════════════════════════════════════
//  Timer & timestamp utilities (shared)
// ══════════════════════════════════════════════════

/**
 * Detect timer duration from text (returns seconds).
 * Handles: X分, X秒, X分X秒
 */
export function detectTimer(text: string): number | null {
  const minMatch = text.match(/(\d+)\s*分/);
  const secMatch = text.match(/(\d+)\s*秒/);

  if (minMatch && secMatch) {
    return parseInt(minMatch[1]) * 60 + parseInt(secMatch[1]);
  }
  if (minMatch) {
    return parseInt(minMatch[1]) * 60;
  }
  if (secMatch) {
    return parseInt(secMatch[1]);
  }

  return null;
}

function parseTimestamps(text: string): Map<number, number> {
  const timestamps = new Map<number, number>();
  const lines = text.split('\n');
  let index = 0;

  for (const line of lines) {
    const match = line.trim().match(/^(\d+):(\d+)\s+(.+)/);
    if (match) {
      const seconds = parseInt(match[1]) * 60 + parseInt(match[2]);
      timestamps.set(index, seconds);
      index++;
    }
  }

  return timestamps;
}

function findTimestampForStep(
  stepNumber: number,
  timestamps: Map<number, number>
): number | null {
  const offset = 2;
  const tsIndex = stepNumber - 1 + offset;
  return timestamps.get(tsIndex) ?? null;
}

function parseServings(text: string): string {
  const match =
    text.match(/[（(](\d+人分)[）)]/) ||
    text.match(/(\d+人分)/) ||
    text.match(/(\d+人前)/);
  return match ? match[1] : '';
}

// ══════════════════════════════════════════════════
//  JSON-LD parsing (unchanged)
// ══════════════════════════════════════════════════

export function parseJsonLd(jsonLd: any): ParsedRecipe {
  const ingredients = parseJsonLdIngredients(jsonLd.recipeIngredient);
  const steps = parseJsonLdInstructions(jsonLd.recipeInstructions);
  const servings = jsonLd.recipeYield
    ? Array.isArray(jsonLd.recipeYield)
      ? jsonLd.recipeYield[0]?.toString() || ''
      : jsonLd.recipeYield.toString()
    : '';
  const cookTime = parseDurationToString(jsonLd.cookTime || jsonLd.totalTime);

  return { ingredients, steps, servings, cookTime, source: 'jsonld' };
}

function parseJsonLdIngredients(ingredients: any): Ingredient[] {
  if (!ingredients || !Array.isArray(ingredients)) return [];
  return ingredients.map((item: string) => {
    const match = item.match(/^(.+?)\s+(\d+.*)$/) || item.match(/^(.+?)　+(.+)$/);
    if (match) return { name: match[1].trim(), amount: match[2].trim() };
    return { name: item, amount: '' };
  });
}

function parseJsonLdInstructions(instructions: any): RecipeStep[] {
  if (!instructions) return [];

  if (typeof instructions === 'string') {
    return instructions
      .split(/\n+/)
      .filter((l: string) => l.trim())
      .map((text: string, i: number) => ({
        number: i + 1,
        text: text.trim(),
        timerSeconds: detectTimer(text),
        timestamp: null,
      }));
  }

  if (!Array.isArray(instructions)) return [];

  const steps: RecipeStep[] = [];
  let num = 1;
  for (const item of instructions) {
    if (typeof item === 'string') {
      steps.push({ number: num++, text: item, timerSeconds: detectTimer(item), timestamp: null });
    } else if (item['@type'] === 'HowToStep') {
      const text = item.text || item.name || '';
      steps.push({ number: num++, text, timerSeconds: detectTimer(text), timestamp: null });
    } else if (item['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
      for (const sub of item.itemListElement) {
        const text = sub.text || sub.name || '';
        steps.push({ number: num++, text, timerSeconds: detectTimer(text), timestamp: null });
      }
    }
  }
  return steps;
}

function parseDurationToString(duration: string | undefined): string | undefined {
  if (!duration) return undefined;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;
  const parts: string[] = [];
  if (match[1]) parts.push(`${match[1]}時間`);
  if (match[2]) parts.push(`${match[2]}分`);
  if (match[3]) parts.push(`${match[3]}秒`);
  return parts.join('') || undefined;
}
