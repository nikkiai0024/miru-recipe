import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ingredient, RecipeStep } from './parser';
import type { Platform } from './platform';

export interface Recipe {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  servings: string;
  category: string;
  isFavorite: boolean;
  createdAt: string;
  platform?: Platform;
  sourceUrl?: string;
  cookTime?: string;
  captionsAvailable?: boolean;
}

const RECIPES_KEY = 'mirurecipe_recipes';
const MONTHLY_COUNT_KEY = 'mirurecipe_monthly_count';
const PURCHASES_KEY = 'mirurecipe_purchases';
const SHOPPING_LIST_KEY = 'mirurecipe_shopping_list';

/**
 * 全レシピを取得
 */
export async function getRecipes(): Promise<Recipe[]> {
  try {
    const json = await AsyncStorage.getItem(RECIPES_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * レシピを1件取得
 */
export async function getRecipe(id: string): Promise<Recipe | null> {
  const recipes = await getRecipes();
  return recipes.find((r) => r.id === id) ?? null;
}

/**
 * レシピを保存
 */
export async function saveRecipe(recipe: Recipe): Promise<void> {
  const recipes = await getRecipes();
  const index = recipes.findIndex((r) => r.id === recipe.id);
  if (index >= 0) {
    recipes[index] = recipe;
  } else {
    recipes.unshift(recipe);
  }
  await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
}

/**
 * レシピを削除
 */
export async function deleteRecipe(id: string): Promise<void> {
  const recipes = await getRecipes();
  const filtered = recipes.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(filtered));
}

/**
 * お気に入り切り替え
 */
export async function toggleFavorite(id: string): Promise<void> {
  const recipes = await getRecipes();
  const recipe = recipes.find((r) => r.id === id);
  if (recipe) {
    recipe.isFavorite = !recipe.isFavorite;
    await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
  }
}

/**
 * 今月のレシピ追加数を取得
 */
export async function getMonthlyCount(): Promise<number> {
  const now = new Date();
  const key = `${MONTHLY_COUNT_KEY}_${now.getFullYear()}_${now.getMonth()}`;
  const count = await AsyncStorage.getItem(key);
  return count ? parseInt(count) : 0;
}

/**
 * 今月のレシピ追加数をインクリメント
 */
export async function incrementMonthlyCount(): Promise<number> {
  const now = new Date();
  const key = `${MONTHLY_COUNT_KEY}_${now.getFullYear()}_${now.getMonth()}`;
  const current = await getMonthlyCount();
  const next = current + 1;
  await AsyncStorage.setItem(key, next.toString());
  return next;
}

/**
 * 購入状態を保存（モックIAP）
 */
export async function savePurchase(productId: string): Promise<void> {
  const purchases = await getPurchases();
  if (!purchases.includes(productId)) {
    purchases.push(productId);
    await AsyncStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
  }
}

/**
 * 購入済みプロダクトを取得
 */
export async function getPurchases(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(PURCHASES_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * 特定のプロダクトが購入済みか
 */
export async function isPurchased(productId: string): Promise<boolean> {
  const purchases = await getPurchases();
  return (
    purchases.includes(productId) ||
    purchases.includes('com.mirurecipe.pro_bundle')
  );
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  checked: boolean;
  recipeTitle: string;
}

/**
 * 買い物リストを取得
 */
export async function getShoppingList(): Promise<ShoppingItem[]> {
  try {
    const json = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * 買い物リストを保存
 */
export async function saveShoppingList(items: ShoppingItem[]): Promise<void> {
  await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
}

/**
 * レシピの材料を買い物リストに追加
 */
const INITIALIZED_KEY = '@initialized';

/**
 * 初期化済みかどうかを確認
 */
export async function isInitialized(): Promise<boolean> {
  const value = await AsyncStorage.getItem(INITIALIZED_KEY);
  return value === 'true';
}

/**
 * 初期化済みフラグをセット
 */
export async function setInitialized(): Promise<void> {
  await AsyncStorage.setItem(INITIALIZED_KEY, 'true');
}

/**
 * レシピの材料を買い物リストに追加
 */
/**
 * レシピを並び替え（IDの配列順に）
 */
export async function reorderRecipes(ids: string[]): Promise<void> {
  const recipes = await getRecipes();
  const map = new Map(recipes.map((r) => [r.id, r]));
  const reordered = ids.map((id) => map.get(id)!).filter(Boolean);
  // ids に含まれないレシピがあれば末尾に追加
  const remaining = recipes.filter((r) => !ids.includes(r.id));
  await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify([...reordered, ...remaining]));
}

/**
 * レシピの材料を買い物リストに追加
 */
export async function addToShoppingList(recipe: Recipe): Promise<void> {
  const list = await getShoppingList();
  const newItems: ShoppingItem[] = recipe.ingredients.map((ing, i) => ({
    id: `${recipe.id}_${i}`,
    name: ing.name,
    amount: ing.amount,
    checked: false,
    recipeTitle: recipe.title,
  }));

  // 既存の同じレシピのアイテムを除去してから追加
  const filtered = list.filter(
    (item) => !item.id.startsWith(`${recipe.id}_`)
  );
  await saveShoppingList([...filtered, ...newItems]);
}
