import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getRecipes,
  getRecipe,
  saveRecipe,
  deleteRecipe,
  toggleFavorite,
  reorderRecipes as reorderRecipesStorage,
  getMonthlyCount,
  incrementMonthlyCount,
  addToShoppingList,
  isInitialized,
  setInitialized,
  type Recipe,
} from '../utils/storage';
import { presetRecipes } from '../data/preset-recipes';

const FREE_MONTHLY_LIMIT = 5;

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const initializingRef = useRef(false);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      // 初回起動時にプリセットレシピを保存（二重実行防止）
      const initialized = await isInitialized();
      if (!initialized && !initializingRef.current) {
        initializingRef.current = true;
        try {
          const existing = await getRecipes();
          if (existing.length === 0) {
            for (const preset of presetRecipes) {
              await saveRecipe(preset);
            }
          }
          await setInitialized();
        } finally {
          initializingRef.current = false;
        }
      }

      const data = await getRecipes();
      setRecipes(data);
      const count = await getMonthlyCount();
      setMonthlyCount(count);
    } catch (e) {
      console.error('[useRecipes] loadRecipes failed:', e);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const addRecipe = useCallback(
    async (recipe: Recipe) => {
      try {
        await saveRecipe(recipe);
      } catch {
        throw new Error('レシピの保存に失敗しました');
      }
      await incrementMonthlyCount();
      await loadRecipes();
    },
    [loadRecipes]
  );

  const removeRecipe = useCallback(
    async (id: string) => {
      await deleteRecipe(id);
      await loadRecipes();
    },
    [loadRecipes]
  );

  const toggleFav = useCallback(
    async (id: string) => {
      await toggleFavorite(id);
      await loadRecipes();
    },
    [loadRecipes]
  );

  const addToShopping = useCallback(async (recipe: Recipe) => {
    await addToShoppingList(recipe);
  }, []);

  const updateRecipe = useCallback(
    async (recipe: Recipe) => {
      try {
        await saveRecipe(recipe);
      } catch {
        throw new Error('レシピの更新に失敗しました');
      }
      await loadRecipes();
    },
    [loadRecipes]
  );

  const reorderRecipes = useCallback(
    async (ids: string[]) => {
      await reorderRecipesStorage(ids);
      await loadRecipes();
    },
    [loadRecipes]
  );

  const canAddRecipe = monthlyCount < FREE_MONTHLY_LIMIT;

  return {
    recipes,
    loading,
    monthlyCount,
    canAddRecipe,
    freeLimit: FREE_MONTHLY_LIMIT,
    addRecipe,
    updateRecipe,
    removeRecipe,
    toggleFav,
    addToShopping,
    reorderRecipes,
    refresh: loadRecipes,
  };
}

export function useRecipe(id: string) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getRecipe(id);
      setRecipe(data);
      setLoading(false);
    })();
  }, [id]);

  return { recipe, loading };
}
