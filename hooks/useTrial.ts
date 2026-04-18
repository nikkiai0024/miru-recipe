import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTrial,
  saveTrial,
  startTrial as startTrialStorage,
  evaluateTrial,
  dismissTrialWarning as dismissTrialWarningStorage,
  type TrialState,
  type TrialStatus,
} from '../utils/storage';

/**
 * 初回起動特典トライアルを管理するフック
 */
export function useTrial() {
  const [state, setState] = useState<TrialState | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const data = await getTrial();
    setState(data);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  // 5分間隔で時刻再評価
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setNow(Date.now());
    }, 5 * 60 * 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  /**
   * トライアル開始 (初回のみ)
   */
  const startIfEligible = useCallback(async () => {
    const next = await startTrialStorage();
    setState(next);
    return next;
  }, []);

  const dismissWarning = useCallback(async () => {
    await dismissTrialWarningStorage();
    setState((prev) => (prev ? { ...prev, dismissedEndWarning: true } : prev));
  }, []);

  const status: TrialStatus = state
    ? evaluateTrial(state, now)
    : {
        isActive: false,
        msRemaining: 0,
        daysRemaining: 0,
        hoursRemaining: 0,
        hasEverStarted: false,
      };

  // トライアル終了まで24時間以内 かつまだwarning閉じてない時
  const shouldShowEndWarning =
    status.isActive &&
    status.msRemaining <= 24 * 3600 * 1000 &&
    !(state?.dismissedEndWarning ?? false);

  return {
    state,
    loading,
    status,
    shouldShowEndWarning,
    startIfEligible,
    dismissWarning,
    refresh,
  };
}
