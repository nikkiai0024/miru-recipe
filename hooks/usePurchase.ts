import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTrial } from './useTrial';

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
    priceValue: 320,
    emoji: '📚',
    tagline: '月の制限なし',
    description: '月5件の制限を解除。好きなだけレシピを保存できます。',
    benefits: [
      '今月追加5件を超えても追加OK',
      'レシピコレクションを自由に拡張',
      '来月まで待つストレスなし',
    ],
  },
  {
    id: PRODUCTS.COOKING_MODE,
    name: '調理モードPro',
    price: '¥160',
    priceValue: 160,
    emoji: '👨‍🍳',
    tagline: '料理中ずっと快適',
    description: 'ステップ自動読み上げ・画面左右タップで前後操作。',
    benefits: [
      '音声読み上げで目を離さず調理',
      '画面左右タップで前後操作 (手が汚れててもOK)',
      'タップゾーン拡大で濡れ手にもやさしい',
    ],
  },
  {
    id: PRODUCTS.SHOPPING_LIST,
    name: '買い物リスト',
    price: '¥160',
    priceValue: 160,
    emoji: '🛒',
    tagline: 'スーパーで迷わない',
    description: 'レシピから材料を自動抽出。チェックリストでお買い物。',
    benefits: [
      '材料をワンタップでリスト追加',
      '複数レシピをまとめて管理',
      'チェックで買い忘れ防止',
    ],
  },
  {
    id: PRODUCTS.PRO_BUNDLE,
    name: '全部入りバンドル',
    price: '¥480',
    priceValue: 480,
    emoji: '🎁',
    tagline: '一番お得',
    description: 'すべての機能をアンロック！個別購入より¥160お得。',
    benefits: [
      '上記3機能すべてを一括解放',
      '個別購入 ¥640 → バンドル ¥480',
      '買い切り・永久利用・追加課金なし',
    ],
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

  // トライアル中は全機能を有効化
  const trial = useTrial();
  const trialActive = trial.status.isActive;

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

  const isBundleOwned = purchases[PRODUCTS.PRO_BUNDLE];

  // 各機能: 個別購入 / バンドル / トライアル中のいずれかで解放
  const hasUnlimited =
    purchases[PRODUCTS.UNLIMITED] || isBundleOwned || trialActive;

  const hasCookingPro =
    purchases[PRODUCTS.COOKING_MODE] || isBundleOwned || trialActive;

  const hasShoppingList =
    purchases[PRODUCTS.SHOPPING_LIST] || isBundleOwned || trialActive;

  // 実際に購入した機能 (トライアルを含まない判定、UI表示に使う)
  const ownedUnlimited =
    purchases[PRODUCTS.UNLIMITED] || isBundleOwned;
  const ownedCookingPro =
    purchases[PRODUCTS.COOKING_MODE] || isBundleOwned;
  const ownedShoppingList =
    purchases[PRODUCTS.SHOPPING_LIST] || isBundleOwned;

  return {
    purchases,
    loading,
    purchase,
    restorePurchases,
    hasUnlimited,
    hasCookingPro,
    hasShoppingList,
    ownedUnlimited,
    ownedCookingPro,
    ownedShoppingList,
    trialActive,
    trialStatus: trial.status,
    startTrialIfEligible: trial.startIfEligible,
    shouldShowTrialEndWarning: trial.shouldShowEndWarning,
    dismissTrialWarning: trial.dismissWarning,
  };
}
