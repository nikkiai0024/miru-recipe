import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import type { Ingredient, RecipeStep } from './parser';
import type { Platform } from './platform';

// SecureStore は Expo Go では使えないので遅延require + 例外吸収
const isExpoGo = Constants.appOwnership === 'expo';
let SecureStore: typeof import('expo-secure-store') | null = null;
if (!isExpoGo) {
  try {
    SecureStore = require('expo-secure-store');
  } catch {
    SecureStore = null;
  }
}

/**
 * SecureStore を安全に操作 (未サポート環境では no-op / null を返す)
 */
async function secureGet(key: string): Promise<string | null> {
  if (!SecureStore) return null;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
async function secureSet(key: string, value: string): Promise<void> {
  if (!SecureStore) return;
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // noop
  }
}

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
const SCHEMA_VERSION_KEY = 'mirurecipe_schema_version';
const HEARTS_KEY = 'mirurecipe_hearts';
const TRIAL_KEY = 'mirurecipe_trial';
// SecureStore (Keychain) 側のキー: アプリ再インストール後も残る可能性あり
const SECURE_TRIAL_USED_KEY = 'mirurecipe_trial_used_v1';
const CURRENT_SCHEMA_VERSION = 2;

// ハート制 (レシピ追加クレジット)
export interface HeartState {
  currentHearts: number;
  maxHearts: number;
  lastRegenAt: string; // ISO
  regenIntervalHours: number;
  bonusFromAd: number;
  totalConsumed: number;
}

const DEFAULT_HEART_STATE: HeartState = {
  currentHearts: 5,
  maxHearts: 5,
  lastRegenAt: new Date().toISOString(),
  regenIntervalHours: 24,
  bonusFromAd: 0,
  totalConsumed: 0,
};

// トライアル (初回起動ボーナス)
export interface TrialState {
  startedAt: string | null; // ISO, null なら未開始
  durationDays: number;
  dismissedEndWarning: boolean;
  hasUsedTrial: boolean;
}

const DEFAULT_TRIAL_STATE: TrialState = {
  startedAt: null,
  durationDays: 14,
  dismissedEndWarning: false,
  hasUsedTrial: false,
};

/**
 * スキーママイグレーション
 * アプリ更新でRecipe型が変わった場合にデータを安全に変換する
 */
export async function runMigrations(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
    const version = stored ? parseInt(stored, 10) : 0;

    if (version >= CURRENT_SCHEMA_VERSION) return;

    // v0 → v1: 既存レシピにデフォルトフィールドを補完
    if (version < 1) {
      const json = await AsyncStorage.getItem(RECIPES_KEY);
      if (json) {
        try {
          const recipes = JSON.parse(json);
          if (Array.isArray(recipes)) {
            const migrated = recipes.map((r: any) => ({
              id: r.id ?? '',
              videoId: r.videoId ?? '',
              title: r.title ?? '',
              description: r.description ?? '',
              thumbnailUrl: r.thumbnailUrl ?? '',
              channelTitle: r.channelTitle ?? '',
              ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
              steps: Array.isArray(r.steps) ? r.steps : [],
              servings: r.servings ?? '',
              category: r.category ?? 'breakfast',
              isFavorite: r.isFavorite ?? false,
              createdAt: r.createdAt ?? new Date().toISOString(),
              platform: r.platform,
              sourceUrl: r.sourceUrl,
              cookTime: r.cookTime,
              captionsAvailable: r.captionsAvailable,
            }));
            await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(migrated));
          }
        } catch {
          Sentry.captureMessage('v1 migration failed', { level: 'warning' });
        }
      }
    }

    // v1 → v2: 月間カウンターをハート制に移行
    if (version < 2) {
      try {
        const existing = await AsyncStorage.getItem(HEARTS_KEY);
        if (!existing) {
          // 今月のカウントから残りハートを計算
          const now = new Date();
          const key = `${MONTHLY_COUNT_KEY}_${now.getFullYear()}_${now.getMonth()}`;
          const count = await AsyncStorage.getItem(key);
          const currentMonthlyCount = count ? parseInt(count, 10) : 0;
          // v2 移行記念: 過去の monthlyCount に関わらず全員 maxHearts でフレッシュスタート
          // (過去実績は totalConsumed に残す)
          const migrated: HeartState = {
            ...DEFAULT_HEART_STATE,
            currentHearts: DEFAULT_HEART_STATE.maxHearts,
            lastRegenAt: new Date().toISOString(),
            totalConsumed: currentMonthlyCount,
          };
          await AsyncStorage.setItem(HEARTS_KEY, JSON.stringify(migrated));
        }
      } catch {
        Sentry.captureMessage('v2 hearts migration failed', { level: 'warning' });
      }
    }

    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION.toString());
  } catch (e) {
    Sentry.captureException(e);
  }
}

/**
 * 全レシピを取得
 */
export async function getRecipes(): Promise<Recipe[]> {
  try {
    const json = await AsyncStorage.getItem(RECIPES_KEY);
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      Sentry.captureMessage('レシピデータのパースに失敗', { level: 'error' });
      return [];
    }
  } catch (e) {
    Sentry.captureException(e);
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
  const updated = recipes.map((r) =>
    r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
  );
  await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
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
    await AsyncStorage.setItem(
      PURCHASES_KEY,
      JSON.stringify([...purchases, productId])
    );
  }
}

/**
 * 購入済みプロダクトを取得
 */
export async function getPurchases(): Promise<string[]> {
  try {
    const json = await AsyncStorage.getItem(PURCHASES_KEY);
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      Sentry.captureMessage('購入データのパースに失敗', { level: 'error' });
      return [];
    }
  } catch (e) {
    Sentry.captureException(e);
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
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      Sentry.captureMessage('買い物リストのパースに失敗', { level: 'error' });
      return [];
    }
  } catch (e) {
    Sentry.captureException(e);
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
  const reordered = ids
    .map((id) => map.get(id))
    .filter((r): r is Recipe => r !== undefined);
  // ids に含まれないレシピがあれば末尾に追加
  const remaining = recipes.filter((r) => !ids.includes(r.id));
  await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify([...reordered, ...remaining]));
}

// ------------------------------------------------------
// ハート制 (Pro非購入者のレシピ追加クレジット)
// ------------------------------------------------------

export async function getHearts(): Promise<HeartState> {
  try {
    const json = await AsyncStorage.getItem(HEARTS_KEY);
    if (!json) return { ...DEFAULT_HEART_STATE };
    const parsed = JSON.parse(json);
    const state: HeartState = { ...DEFAULT_HEART_STATE, ...parsed };
    return applyRegen(state);
  } catch (e) {
    Sentry.captureException(e);
    return { ...DEFAULT_HEART_STATE };
  }
}

export async function saveHearts(state: HeartState): Promise<void> {
  await AsyncStorage.setItem(HEARTS_KEY, JSON.stringify(state));
}

/**
 * 回復ロジック: 最後の回復時刻からの経過時間で自動回復
 */
export function applyRegen(state: HeartState, now: number = Date.now()): HeartState {
  if (state.currentHearts >= state.maxHearts) {
    return { ...state, lastRegenAt: new Date(now).toISOString() };
  }
  const lastRegenMs = new Date(state.lastRegenAt).getTime();
  const intervalMs = state.regenIntervalHours * 3600 * 1000;
  const elapsed = now - lastRegenMs;
  if (elapsed < intervalMs) return state;
  const regens = Math.floor(elapsed / intervalMs);
  const newHearts = Math.min(state.maxHearts, state.currentHearts + regens);
  const consumedRegens = newHearts - state.currentHearts;
  const newLastRegenMs = lastRegenMs + consumedRegens * intervalMs;
  return {
    ...state,
    currentHearts: newHearts,
    lastRegenAt: new Date(newLastRegenMs).toISOString(),
  };
}

/**
 * 次の回復までのミリ秒 (MAX なら 0)
 */
export function msUntilNextRegen(state: HeartState, now: number = Date.now()): number {
  if (state.currentHearts >= state.maxHearts) return 0;
  const lastRegenMs = new Date(state.lastRegenAt).getTime();
  const intervalMs = state.regenIntervalHours * 3600 * 1000;
  return Math.max(0, lastRegenMs + intervalMs - now);
}

/**
 * ハートを1個消費。成功/失敗を返す
 */
export async function consumeHeart(): Promise<{ success: boolean; state: HeartState }> {
  const current = await getHearts();
  if (current.currentHearts <= 0) {
    return { success: false, state: current };
  }
  const next: HeartState = {
    ...current,
    currentHearts: current.currentHearts - 1,
    totalConsumed: current.totalConsumed + 1,
    // MAXから消費開始時のみ lastRegenAt を更新 (回復カウントダウンスタート)
    lastRegenAt:
      current.currentHearts === current.maxHearts
        ? new Date().toISOString()
        : current.lastRegenAt,
  };
  await saveHearts(next);
  return { success: true, state: next };
}

/**
 * ボーナスハート付与 (広告視聴など)
 */
export async function addBonusHeart(): Promise<HeartState> {
  const current = await getHearts();
  const next: HeartState = {
    ...current,
    currentHearts: Math.min(current.maxHearts, current.currentHearts + 1),
    bonusFromAd: current.bonusFromAd + 1,
  };
  await saveHearts(next);
  return next;
}

// ------------------------------------------------------
// 14日無料トライアル (初回起動特典)
// ------------------------------------------------------

export async function getTrial(): Promise<TrialState> {
  try {
    const json = await AsyncStorage.getItem(TRIAL_KEY);
    if (!json) return { ...DEFAULT_TRIAL_STATE };
    return { ...DEFAULT_TRIAL_STATE, ...JSON.parse(json) };
  } catch (e) {
    Sentry.captureException(e);
    return { ...DEFAULT_TRIAL_STATE };
  }
}

export async function saveTrial(state: TrialState): Promise<void> {
  await AsyncStorage.setItem(TRIAL_KEY, JSON.stringify(state));
}

/**
 * トライアル開始 (既に開始済み or 使用済みなら何もしない)
 *
 * アプリ再インストール時の重複開始を防ぐため、SecureStore (Keychain) も
 * 併用して hasUsedTrial フラグを保持する。
 * iOS 15+ ではアプリ削除時に Keychain が消えるが、デバイス互換のベストエフォート。
 */
export async function startTrial(): Promise<TrialState> {
  const current = await getTrial();

  // AsyncStorage 側で既に開始済み or 使用済みの場合
  if (current.startedAt || current.hasUsedTrial) return current;

  // SecureStore 側の履歴をチェック (再インストール対策)
  const secureRecord = await secureGet(SECURE_TRIAL_USED_KEY);
  if (secureRecord) {
    try {
      const parsed = JSON.parse(secureRecord);
      const restored: TrialState = {
        ...current,
        startedAt: parsed.startedAt ?? null,
        hasUsedTrial: true,
      };
      await saveTrial(restored);
      return restored;
    } catch {
      // JSON 壊れてたら新規扱い
    }
  }

  const now = new Date().toISOString();
  const next: TrialState = {
    ...current,
    startedAt: now,
    hasUsedTrial: true,
  };
  await saveTrial(next);
  // SecureStore にも記録 (再インストール後の復元用)
  await secureSet(
    SECURE_TRIAL_USED_KEY,
    JSON.stringify({ startedAt: now, hasUsedTrial: true })
  );
  return next;
}

/**
 * トライアル状態の判定
 */
export interface TrialStatus {
  isActive: boolean;
  msRemaining: number;
  daysRemaining: number;
  hoursRemaining: number;
  hasEverStarted: boolean;
}

export function evaluateTrial(state: TrialState, now: number = Date.now()): TrialStatus {
  if (!state.startedAt) {
    return {
      isActive: false,
      msRemaining: 0,
      daysRemaining: 0,
      hoursRemaining: 0,
      hasEverStarted: false,
    };
  }
  const startMs = new Date(state.startedAt).getTime();
  const durationMs = state.durationDays * 24 * 3600 * 1000;
  const msRemaining = Math.max(0, startMs + durationMs - now);
  const isActive = msRemaining > 0;
  return {
    isActive,
    msRemaining,
    daysRemaining: Math.ceil(msRemaining / (24 * 3600 * 1000)),
    hoursRemaining: Math.ceil(msRemaining / (3600 * 1000)),
    hasEverStarted: true,
  };
}

export async function dismissTrialWarning(): Promise<void> {
  const state = await getTrial();
  await saveTrial({ ...state, dismissedEndWarning: true });
}

/**
 * レシピの材料を買い物リストに追加
 */
export async function addToShoppingList(recipe: Recipe): Promise<void> {
  if (!recipe.ingredients || recipe.ingredients.length === 0) return;
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
