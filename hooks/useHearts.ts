import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getHearts,
  saveHearts,
  consumeHeart as consumeHeartStorage,
  addBonusHeart as addBonusHeartStorage,
  applyRegen,
  msUntilNextRegen,
  type HeartState,
} from '../utils/storage';

/**
 * ハートの残量・回復を管理するフック
 *
 * 副作用の原則:
 * - setState callback は pure (applyRegen 結果のみ返す)
 * - 永続化 (saveHearts) は state 変化監視の useEffect で一元化
 */
export function useHearts() {
  const [state, setState] = useState<HeartState | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 初回ロード直後の saveHearts 発火を抑制するための守護フラグ
  const justLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    const data = await getHearts();
    justLoadedRef.current = true;
    setState(data);
  }, []);

  // 初回ロード
  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  // 1分ごとに now を更新 (UI再描画用 + 下の useEffect トリガ)
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // state または now が変わるたび回復計算 + 差分があれば永続化
  useEffect(() => {
    if (!state) return;
    const regenerated = applyRegen(state, now);
    const changed =
      regenerated.currentHearts !== state.currentHearts ||
      regenerated.lastRegenAt !== state.lastRegenAt;
    if (!changed) return;

    // state 反映はここで 1 回だけ
    setState(regenerated);
    // 初回ロード直後は save 不要 (storage の値と同一)
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }
    saveHearts(regenerated).catch(() => {});
  }, [state, now]);

  const consume = useCallback(async (): Promise<boolean> => {
    const result = await consumeHeartStorage();
    // storage 側で既に save 済み → flag を立てて二重save防止
    justLoadedRef.current = true;
    setState(result.state);
    return result.success;
  }, []);

  const addBonus = useCallback(async () => {
    const next = await addBonusHeartStorage();
    justLoadedRef.current = true;
    setState(next);
    return next;
  }, []);

  const currentHearts = state?.currentHearts ?? 0;
  const maxHearts = state?.maxHearts ?? 5;
  const isEmpty = currentHearts === 0;
  const isFull = currentHearts >= maxHearts;
  const msToNext = state ? msUntilNextRegen(state, now) : 0;

  const timeToNextLabel = (() => {
    if (isFull) return '満タン';
    if (msToNext === 0) return 'まもなく';
    const h = Math.floor(msToNext / (3600 * 1000));
    const m = Math.ceil((msToNext % (3600 * 1000)) / (60 * 1000));
    if (h >= 1) return `${h}時間`;
    return `${m}分`;
  })();

  return {
    state,
    loading,
    currentHearts,
    maxHearts,
    isEmpty,
    isFull,
    msToNext,
    timeToNextLabel,
    consume,
    addBonus,
    refresh,
  };
}
