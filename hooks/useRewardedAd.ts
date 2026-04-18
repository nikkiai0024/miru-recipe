import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

// Expo Go では使えないので遅延 require
let RewardedAd: any;
let RewardedAdEventType: any;
let AdEventType: any;
let TestIds: any;

if (!isExpoGo) {
  try {
    const ads = require('react-native-google-mobile-ads');
    RewardedAd = ads.RewardedAd;
    RewardedAdEventType = ads.RewardedAdEventType;
    AdEventType = ads.AdEventType;
    TestIds = ads.TestIds;
  } catch {}
}

/**
 * 本番の Rewarded Ad Unit ID
 * iOS: ミルレシピ iOS (~1772220628) 配下で発行
 * Android: 未発行 (AdMob で作成したら差し替え)
 */
const PROD_REWARDED_UNIT_IOS: string | null = 'ca-app-pub-1198964108696763/4102407471';
const PROD_REWARDED_UNIT_ANDROID: string | null = null;

function resolveUnitId(): string | null {
  if (!TestIds) return null;
  if (__DEV__) return TestIds.REWARDED;
  const prodId =
    Platform.OS === 'ios' ? PROD_REWARDED_UNIT_IOS : PROD_REWARDED_UNIT_ANDROID;
  return prodId ?? TestIds.REWARDED;
}

/**
 * Rewarded Ad を管理するフック
 * - `load()` で事前ロード (画面マウント時に自動呼び出し)
 * - `show()` で広告表示 + 視聴完了時 Promise resolve (reward オブジェクト)
 * - 失敗時は reject、呼び出し側で適切にハンドリング
 */
export function useRewardedAd() {
  const adRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const available = !isExpoGo && !!RewardedAd;

  const load = useCallback(() => {
    if (!available) return;
    if (loading || loaded) return;
    const unitId = resolveUnitId();
    if (!unitId) return;

    setLoading(true);
    const ad = RewardedAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = ad.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setLoaded(true);
        setLoading(false);
      }
    );
    const unsubscribeError = ad.addAdEventListener(
      AdEventType.ERROR,
      () => {
        setLoaded(false);
        setLoading(false);
      }
    );

    adRef.current = { ad, unsubscribeLoaded, unsubscribeError };
    ad.load();
  }, [available, loaded, loading]);

  useEffect(() => {
    load();
    return () => {
      const cur = adRef.current;
      if (cur) {
        cur.unsubscribeLoaded?.();
        cur.unsubscribeError?.();
        adRef.current = null;
      }
    };
  }, [load]);

  /**
   * 広告を表示し、視聴完了を待つ
   * @returns reward オブジェクト (type, amount)
   * @throws 失敗時 (ロード未完了 / ユーザー途中終了 / エラー)
   */
  const show = useCallback((): Promise<{ type: string; amount: number }> => {
    return new Promise((resolve, reject) => {
      if (!available || !adRef.current?.ad || !loaded) {
        reject(new Error('AD_NOT_READY'));
        return;
      }
      const { ad } = adRef.current;
      let earned: { type: string; amount: number } | null = null;

      const unsubEarned = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward: any) => {
          earned = { type: reward?.type ?? 'coin', amount: reward?.amount ?? 1 };
        }
      );
      const unsubClosed = ad.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          unsubEarned?.();
          unsubClosed?.();
          setLoaded(false);
          // 次回表示のため再ロード
          setTimeout(() => load(), 500);
          if (earned) resolve(earned);
          else reject(new Error('AD_CLOSED_WITHOUT_REWARD'));
        }
      );
      const unsubError = ad.addAdEventListener(
        AdEventType.ERROR,
        (err: any) => {
          unsubEarned?.();
          unsubClosed?.();
          unsubError?.();
          reject(new Error(err?.message ?? 'AD_ERROR'));
        }
      );

      try {
        ad.show();
      } catch (e) {
        unsubEarned?.();
        unsubClosed?.();
        unsubError?.();
        reject(e);
      }
    });
  }, [available, loaded, load]);

  return {
    available,
    loaded,
    loading,
    show,
    reload: load,
  };
}
