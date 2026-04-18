import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { useRecipe } from '../../hooks/useRecipes';
import { usePurchase } from '../../hooks/usePurchase';
import { TimerButton } from '../../components/TimerButton';

// iPhone SE (375px) で前/次ボタン両端固定 + 中央flex:1 の構造だと、
// 中央領域は約 100px。dot(8px) × N + active(22px) + gap(6px) × (N-1) が収まるのは N=6 まで。
const SHOW_DOTS_THRESHOLD = 6;

export default function CookingModeScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipe, loading } = useRecipe(id);
  const { hasCookingPro } = usePurchase();
  const [currentStep, setCurrentStep] = useState(0);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [proNudgeVisible, setProNudgeVisible] = useState(false);

  // 読み上げ: ステップ変更時
  useEffect(() => {
    if (!speechEnabled || !recipe || recipe.steps.length === 0) return;
    if (currentStep < 0 || currentStep >= recipe.steps.length) return;
    const step = recipe.steps[currentStep];
    if (!step?.text) return;
    Speech.stop();
    const timer = setTimeout(() => {
      try {
        Speech.speak(step.text, { language: 'ja-JP' });
      } catch (e) {
        if (__DEV__) console.warn('Speech.speak failed:', e);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep, speechEnabled, recipe]);

  // recipe変更時にcurrentStepを範囲内にクランプ
  useEffect(() => {
    if (!recipe || recipe.steps.length === 0) return;
    if (currentStep >= recipe.steps.length) {
      setCurrentStep(recipe.steps.length - 1);
    } else if (currentStep < 0) {
      setCurrentStep(0);
    }
  }, [recipe, currentStep]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const toggleSpeech = useCallback(() => {
    if (!hasCookingPro) {
      setProNudgeVisible(true);
      return;
    }
    if (!speechEnabled) {
      setSpeechEnabled(true);
    } else {
      setSpeechEnabled(false);
      Speech.stop();
    }
  }, [speechEnabled, hasCookingPro]);

  const reSpeak = useCallback(() => {
    if (!recipe || recipe.steps.length === 0) return;
    const idx = Math.max(0, Math.min(currentStep, recipe.steps.length - 1));
    const text = recipe.steps[idx]?.text;
    if (!text) return;
    Speech.stop();
    try {
      Speech.speak(text, { language: 'ja-JP' });
    } catch (e) {
      if (__DEV__) console.warn('Speech.speak failed:', e);
    }
  }, [recipe, currentStep]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!recipe || recipe.steps.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.noSteps}>手順がありません</Text>
      </View>
    );
  }

  const safeStep = Math.max(0, Math.min(currentStep, recipe.steps.length - 1));
  const step = recipe.steps[safeStep];
  const totalSteps = recipe.steps.length;
  const isFirst = safeStep === 0;
  const isLast = safeStep === totalSteps - 1;
  const progressPct = ((safeStep + 1) / totalSteps) * 100;
  const shouldShowDots = totalSteps <= SHOW_DOTS_THRESHOLD;

  const detectedTimerSeconds = (() => {
    if (step.timerSeconds != null) return step.timerSeconds;
    const text = step?.text ?? '';
    const match = text.match(/(\d+)\s*分/);
    const matchSec = text.match(/(\d+)\s*秒/);
    let total = 0;
    if (match) total += parseInt(match[1], 10) * 60;
    if (matchSec) total += parseInt(matchSec[1], 10);
    return total > 0 ? total : null;
  })();

  const goNext = () => {
    if (isLast) {
      router.back();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (!isFirst) setCurrentStep((prev) => prev - 1);
  };

  const handleTouchZone = (zone: 'left' | 'right') => {
    if (zone === 'left') goPrev();
    else goNext();
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.recipeTitle} numberOfLines={1}>
            {recipe.title}
          </Text>
          <TouchableOpacity
            onPress={toggleSpeech}
            style={[
              styles.speechPill,
              speechEnabled && styles.speechPillActive,
              !hasCookingPro && styles.speechPillLocked,
            ]}
          >
            <Text style={[
              styles.speechPillText,
              speechEnabled && styles.speechPillTextActive,
            ]}>
              {!hasCookingPro ? '🔒 読み上げ' : speechEnabled ? '🔊 読み上げ' : '🔇 読み上げ'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* プログレス */}
        <View style={styles.progressRow}>
          <View style={styles.progressNumberBox}>
            <Text style={styles.progressCurrent}>{safeStep + 1}</Text>
            <Text style={styles.progressTotal}>/ {totalSteps}</Text>
          </View>
          <View style={styles.progressBarOuter}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
        </View>
      </View>

      {/* ステップ表示 + タッチゾーンオーバーレイ */}
      <View style={styles.stepWrapper}>
        <ScrollView
          style={styles.stepContainer}
          contentContainerStyle={styles.stepContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP</Text>
            <Text style={styles.stepBadgeNumber}>{step.number}</Text>
          </View>
          <Text style={styles.stepText}>{step.text}</Text>

          {detectedTimerSeconds != null && (
            <View style={styles.timerInline}>
              <TimerButton
                key={`timer-${safeStep}-${detectedTimerSeconds}`}
                seconds={detectedTimerSeconds}
              />
            </View>
          )}
        </ScrollView>

        {/* タッチゾーンオーバーレイ (Pro機能) */}
        {hasCookingPro && (
          <View style={styles.touchZoneOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.touchZoneLeft}
              onPress={() => handleTouchZone('left')}
              activeOpacity={0.1}
            />
            <View style={styles.touchZoneCenter} pointerEvents="box-none" />
            <TouchableOpacity
              style={styles.touchZoneRight}
              onPress={() => handleTouchZone('right')}
              activeOpacity={0.1}
            />
          </View>
        )}
      </View>

      {/* ナビゲーションボタン */}
      <View style={[styles.navigation, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonPrev, isFirst && styles.navButtonDisabled]}
          onPress={goPrev}
          disabled={isFirst}
          activeOpacity={0.8}
        >
          <Text style={[styles.navButtonPrevText, isFirst && styles.navButtonTextDisabled]}>
            ←
          </Text>
          <Text style={[styles.navButtonPrevLabel, isFirst && styles.navButtonTextDisabled]}>
            前へ
          </Text>
        </TouchableOpacity>

        <View style={styles.navCenter} pointerEvents="box-none">
          {speechEnabled ? (
            <TouchableOpacity style={styles.reSpeakButton} onPress={reSpeak}>
              <Text style={styles.reSpeakButtonText}>↻ 再読み</Text>
            </TouchableOpacity>
          ) : shouldShowDots ? (
            <View style={styles.dots}>
              {recipe.steps.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === safeStep && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonNext,
            isLast && styles.navButtonComplete,
          ]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.navButtonNextLabel}>
            {isLast ? '完了！' : '次へ'}
          </Text>
          {!isLast && <Text style={styles.navButtonNextIcon}>→</Text>}
        </TouchableOpacity>
      </View>

      {/* Pro機能紹介モーダル (読み上げタップ時) */}
      <Modal
        visible={proNudgeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProNudgeVisible(false)}
      >
        <Pressable
          style={styles.nudgeOverlay}
          onPress={() => setProNudgeVisible(false)}
        >
          <Pressable style={styles.nudgeCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.nudgeEmoji}>👨‍🍳</Text>
            <Text style={styles.nudgeTitle}>手が汚れててもOK</Text>
            <Text style={styles.nudgeBody}>
              調理モードProなら、ステップを自動で読み上げ{'\n'}
              画面左右タップで前後操作できます。
            </Text>
            <View style={styles.nudgeFeatureRow}>
              <View style={styles.nudgeFeature}>
                <Text style={styles.nudgeFeatureIcon}>🔊</Text>
                <Text style={styles.nudgeFeatureText}>音声読み上げ</Text>
              </View>
              <View style={styles.nudgeFeature}>
                <Text style={styles.nudgeFeatureIcon}>👆</Text>
                <Text style={styles.nudgeFeatureText}>左右タップ操作</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.nudgeCta}
              onPress={() => {
                setProNudgeVisible(false);
                router.push('/pro');
              }}
            >
              <Text style={styles.nudgeCtaText}>¥160 で解放</Text>
              <Text style={styles.nudgeCtaSub}>買い切り・永久利用</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setProNudgeVisible(false)}>
              <Text style={styles.nudgeDismiss}>あとで</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F14',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F14',
  },
  noSteps: {
    color: '#888',
    fontSize: 18,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  // ヘッダー
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A32',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recipeTitle: {
    flex: 1,
    color: '#AAA0A0',
    fontSize: 13,
    marginRight: 12,
    letterSpacing: 0.3,
  },
  speechPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1F1F26',
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  speechPillActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  speechPillLocked: {
    backgroundColor: '#1F1F26',
    borderColor: '#2E2E38',
  },
  speechPillText: {
    fontSize: 12,
    color: '#AAA0A0',
    fontWeight: '600',
  },
  speechPillTextActive: {
    color: '#fff',
  },
  // プログレス
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressNumberBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressCurrent: {
    color: '#FF6B35',
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  progressTotal: {
    color: '#555560',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  progressBarOuter: {
    flex: 1,
    height: 6,
    backgroundColor: '#2A2A32',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 3,
  },
  progressPct: {
    color: '#666670',
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  // ステップ本文
  stepWrapper: {
    flex: 1,
    position: 'relative',
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  stepBadgeText: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  stepBadgeNumber: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  stepText: {
    color: '#F5F5F5',
    fontSize: 28,
    lineHeight: 44,
    fontWeight: '500',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  timerInline: {
    marginTop: 28,
  },
  // タッチゾーン
  touchZoneOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  touchZoneLeft: {
    flex: 1,
  },
  touchZoneCenter: {
    flex: 1,
  },
  touchZoneRight: {
    flex: 1,
  },
  // ナビゲーション
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2A2A32',
    backgroundColor: '#0F0F14',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  navButtonPrev: {
    backgroundColor: '#1F1F26',
    borderWidth: 1,
    borderColor: '#2E2E38',
    minWidth: 92,
  },
  navButtonPrevText: {
    color: '#DDDDE0',
    fontSize: 18,
    fontWeight: '700',
  },
  navButtonPrevLabel: {
    color: '#DDDDE0',
    fontSize: 15,
    fontWeight: '600',
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  navButtonTextDisabled: {
    color: '#55555E',
  },
  navButtonNext: {
    backgroundColor: '#FF6B35',
    minWidth: 120,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  navButtonComplete: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  navButtonNextLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  navButtonNextIcon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 2,
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reSpeakButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#26262E',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  reSpeakButtonText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A3A44',
  },
  dotActive: {
    backgroundColor: '#FF6B35',
    width: 22,
  },
  // Pro ナッジモーダル
  nudgeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  nudgeCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  nudgeEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  nudgeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2A1810',
    marginBottom: 10,
    fontFamily: 'BIZUDGothic_700Bold',
    textAlign: 'center',
  },
  nudgeBody: {
    fontSize: 14,
    color: '#6B5B4D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  nudgeFeatureRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  nudgeFeature: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E5D8',
  },
  nudgeFeatureIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  nudgeFeatureText: {
    fontSize: 12,
    color: '#2A1810',
    fontWeight: '700',
  },
  nudgeCta: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  nudgeCtaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  nudgeCtaSub: {
    color: '#FFE5D4',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  nudgeDismiss: {
    marginTop: 14,
    fontSize: 13,
    color: '#A0968D',
    padding: 8,
  },
});
