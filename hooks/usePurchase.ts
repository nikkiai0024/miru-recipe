import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

let useIAP: any;
let ErrorCode: any;

if (!isExpoGo) {
  try {
    const iap = require('expo-iap');
    useIAP = iap.useIAP;
    ErrorCode = iap.ErrorCode;
  } catch {}
}

export type ProductId =
  | 'com.mirurecipe.unlimited'
  | 'com.mirurecipe.cooking_mode'
  | 'com.mirurecipe.shopping_list'
  | 'com.mirurecipe.pro_bundle';

export const PRODUCTS = {
  UNLIMITED: 'com.mirurecipe.unlimited' as ProductId,
  COOKING_MODE: 'com.mirurecipe.cooking_mode' as ProductId,
  SHOPPING_LIST: 'com.mirurecipe.shopping_list' as ProductId,
  PRO_BUNDLE: 'com.mirurecipe.pro_bundle' as ProductId,
} as const;

export const PRODUCT_IDS: ProductId[] = [
  PRODUCTS.UNLIMITED,
  PRODUCTS.COOKING_MODE,
  PRODUCTS.SHOPPING_LIST,
  PRODUCTS.PRO_BUNDLE,
];

const BUNDLE_PRODUCT_IDS: ProductId[] = [
  PRODUCTS.UNLIMITED,
  PRODUCTS.COOKING_MODE,
  PRODUCTS.SHOPPING_LIST,
  PRODUCTS.PRO_BUNDLE,
];

export const PRODUCT_INFO = [
  {
    id: PRODUCTS.UNLIMITED,
    name: '無制限レシピ取り込み',
    price: '¥320',
    description: '月5件の制限を解除。好きなだけレシピを保存できます。',
  },
  {
    id: PRODUCTS.COOKING_MODE,
    name: '調理モードPro',
    price: '¥160',
    description: 'ステップ自動読み上げ・画面左右タップで前後操作。手が汚れていても次のステップへ。',
  },
  {
    id: PRODUCTS.SHOPPING_LIST,
    name: '買い物リスト',
    price: '¥160',
    description: 'レシピから材料を自動抽出。チェックリストでお買い物。',
  },
  {
    id: PRODUCTS.PRO_BUNDLE,
    name: '全部入りバンドル',
    price: '¥480',
    description: 'すべての機能をお得にアンロック！',
  },
];

const PURCHASE_STORAGE_KEY = '@mirurecipe_purchases_v2';

type PurchaseState = Record<ProductId, boolean>;

const defaultState: PurchaseState = {
  'com.mirurecipe.unlimited': false,
  'com.mirurecipe.cooking_mode': false,
  'com.mirurecipe.shopping_list': false,
  'com.mirurecipe.pro_bundle': false,
};

async function savePurchases(state: PurchaseState): Promise<void> {
  await AsyncStorage.setItem(PURCHASE_STORAGE_KEY, JSON.stringify(state));
}

async function loadPurchasesFromStorage(): Promise<PurchaseState> {
  try {
    const stored = await AsyncStorage.getItem(PURCHASE_STORAGE_KEY);
    if (stored) {
      return { ...defaultState, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...defaultState };
}

export function usePurchase() {
  const [purchases, setPurchases] = useState<PurchaseState>(defaultState);
  const [loading, setLoading] = useState(true);
  const purchasesRef = useRef(purchases);
  purchasesRef.current = purchases;

  // In Expo Go or when expo-iap is unavailable, skip IAP entirely
  const iapAvailable = !isExpoGo && useIAP != null;

  // useIAP は常に同じhookとして呼び出す必要がある（Rules of Hooks）
  // iapAvailableがfalseのときはno-opのフォールバックhookを使う
  const safeUseIAP = useIAP ?? (() => ({
    connected: false,
    fetchProducts: async () => {},
    requestPurchase: async () => {},
    finishTransaction: async () => {},
    getAvailablePurchases: async () => {},
    availablePurchases: [],
    restorePurchases: async () => {},
  }));

  const iapResult = safeUseIAP({
        onPurchaseSuccess: async (purchaseItem: any) => {
          const productId = purchaseItem.productId as ProductId;
          if (PRODUCT_IDS.includes(productId)) {
            const newPurchases = { ...purchasesRef.current };

            if (productId === PRODUCTS.PRO_BUNDLE) {
              for (const id of BUNDLE_PRODUCT_IDS) {
                newPurchases[id] = true;
              }
            } else {
              newPurchases[productId] = true;
            }

            setPurchases(newPurchases);
            await savePurchases(newPurchases);
          }

          await iapResult.finishTransaction({
            purchase: purchaseItem,
            isConsumable: false,
          });
        },
        onPurchaseError: (error: any) => {
          if (ErrorCode && error.code === ErrorCode.UserCancelled) return;
          Alert.alert(
            '購入エラー',
            error.message || '購入処理中にエラーが発生しました。'
          );
        },
      });

  const {
    connected,
    fetchProducts: iapFetchProducts,
    requestPurchase: iapRequestPurchase,
    getAvailablePurchases,
    availablePurchases,
    restorePurchases: iapRestorePurchases,
  } = iapResult;

  // Load purchases from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      const stored = await loadPurchasesFromStorage();
      setPurchases(stored);
      setLoading(false);
    })();
  }, []);

  // Fetch store products once connected
  useEffect(() => {
    if (connected && !__DEV__) {
      iapFetchProducts({ skus: PRODUCT_IDS, type: 'in-app' }).catch(() => {});
    }
  }, [connected, iapFetchProducts]);

  const purchase = useCallback(
    async (productId: ProductId) => {
      if (__DEV__ || !iapAvailable) {
        // DEV mode or Expo Go: mock purchase
        const newPurchases = { ...purchasesRef.current };

        if (productId === PRODUCTS.PRO_BUNDLE) {
          for (const id of BUNDLE_PRODUCT_IDS) {
            newPurchases[id] = true;
          }
        } else {
          newPurchases[productId] = true;
        }

        setPurchases(newPurchases);
        await savePurchases(newPurchases);
        return;
      }

      await iapRequestPurchase({
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: 'in-app',
      });
    },
    [iapRequestPurchase, iapAvailable]
  );

  const restorePurchases = useCallback(async () => {
    if (__DEV__ || !iapAvailable) {
      const stored = await loadPurchasesFromStorage();
      setPurchases(stored);
      Alert.alert('復元完了', '購入情報を復元しました。');
      return;
    }

    try {
      await iapRestorePurchases();
      await getAvailablePurchases();
      Alert.alert('復元完了', '購入情報を復元しました。');
    } catch {
      Alert.alert('リストアエラー', '購入履歴の復元に失敗しました。');
    }
  }, [iapRestorePurchases, getAvailablePurchases, iapAvailable]);

  // Sync restored purchases to local state
  useEffect(() => {
    if (!availablePurchases || availablePurchases.length === 0) return;

    (async () => {
      const newPurchases = { ...purchasesRef.current };
      let changed = false;

      for (const p of availablePurchases) {
        if (!p?.productId) continue;
        const pid = p.productId as ProductId;
        if (PRODUCT_IDS.includes(pid) && !newPurchases[pid]) {
          if (pid === PRODUCTS.PRO_BUNDLE) {
            for (const id of BUNDLE_PRODUCT_IDS) {
              newPurchases[id] = true;
            }
          } else {
            newPurchases[pid] = true;
          }
          changed = true;
        }
      }

      if (changed) {
        setPurchases(newPurchases);
        await savePurchases(newPurchases);
      }
    })();
  }, [availablePurchases]);

  const hasUnlimited =
    purchases[PRODUCTS.UNLIMITED] || purchases[PRODUCTS.PRO_BUNDLE];

  const hasCookingPro =
    purchases[PRODUCTS.COOKING_MODE] || purchases[PRODUCTS.PRO_BUNDLE];

  const hasShoppingList =
    purchases[PRODUCTS.SHOPPING_LIST] || purchases[PRODUCTS.PRO_BUNDLE];

  return {
    purchases,
    loading,
    purchase,
    restorePurchases,
    hasUnlimited,
    hasCookingPro,
    hasShoppingList,
  };
}
