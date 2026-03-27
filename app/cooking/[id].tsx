import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { useRecipe } from '../../hooks/useRecipes';
import { usePurchase } from '../../hooks/usePurchase';
import { TimerButton } from '../../components/TimerButton';

export default function CookingModeScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipe, loading } = useRecipe(id);
  const { hasCookingPro } = usePurchase();
  const [currentStep, setCurrentStep] = useState(0);
  const [speechEnabled, setSpeechEnabled] = useState(false);

  // 読み上げ: ステップ変更時
  useEffect(() => {
    if (!speechEnabled || !recipe || recipe.steps.length === 0) return;
    const step = recipe.steps[currentStep];
    Speech.stop();
    try {
      Speech.speak(step.text, { language: 'ja-JP' });
    } catch (e) {
      if (__DEV__) console.warn('Speech.speak failed:', e);
    }
  }, [currentStep, speechEnabled, recipe]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const toggleSpeech = useCallback(() => {
    if (!speechEnabled) {
      setSpeechEnabled(true);
      // 即座に現在のステップを読み上げ
      if (recipe && recipe.steps.length > 0) {
        try {
          Speech.speak(recipe.steps[currentStep].text, { language: 'ja-JP' });
        } catch (e) {
          if (__DEV__) console.warn('Speech.speak failed:', e);
        }
      }
    } else {
      setSpeechEnabled(false);
      Speech.stop();
    }
  }, [speechEnabled, recipe, currentStep]);

  const reSpeak = useCallback(() => {
    if (!recipe || recipe.steps.length === 0) return;
    Speech.stop();
    try {
      Speech.speak(recipe.steps[currentStep].text, { language: 'ja-JP' });
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

  const step = recipe.steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === recipe.steps.length - 1;

  // テキストから「X分」「X秒」を検出してタイマー秒数を算出
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
        <Text style={styles.recipeTitle} numberOfLines={1}>
          {recipe.title}
        </Text>
        {hasCookingPro && (
          <TouchableOpacity onPress={toggleSpeech} style={[styles.speechPill, speechEnabled && styles.speechPillActive]}>
            <Text style={[styles.speechPillText, speechEnabled && styles.speechPillTextActive]}>
              {speechEnabled ? '🔊 読み上げON' : '🔇 読み上げOFF'}
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.progress}>
          {currentStep + 1} / {recipe.steps.length}
        </Text>
      </View>

      {/* プログレスバー */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${((currentStep + 1) / recipe.steps.length) * 100}%`,
            },
          ]}
        />
      </View>

      {/* ステップ表示 + タッチゾーンオーバーレイ */}
      <View style={styles.stepWrapper}>
        <ScrollView style={styles.stepContainer} contentContainerStyle={styles.stepContent}>
          <Text style={styles.stepNumber}>ステップ {step.number}</Text>
          <Text style={styles.stepText}>{step.text}</Text>
        </ScrollView>

        {detectedTimerSeconds != null && (
          <View style={styles.timerContainer}>
            <TimerButton seconds={detectedTimerSeconds} />
          </View>
        )}

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
          style={[styles.navButton, isFirst && styles.navButtonDisabled]}
          onPress={goPrev}
          disabled={isFirst}
        >
          <Text style={[styles.navButtonText, isFirst && styles.navButtonTextDisabled]}>
            ← 前へ
          </Text>
        </TouchableOpacity>

        {speechEnabled ? (
          <TouchableOpacity style={styles.reSpeakButton} onPress={reSpeak}>
            <Text style={styles.reSpeakButtonText}>↩ 再読み上げ</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.dots}>
            {recipe.steps.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentStep && styles.dotActive]}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonNext, isLast && styles.navButtonComplete]}
          onPress={goNext}
        >
          <Text style={styles.navButtonNextText}>
            {isLast ? '完了！' : '次へ →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  noSteps: {
    color: '#888',
    fontSize: 18,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  recipeTitle: {
    flex: 1,
    color: '#aaa',
    fontSize: 14,
    marginRight: 16,
  },
  speechPill: {
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333',
  },
  speechPillActive: {
    backgroundColor: '#FF6B35',
  },
  speechPillText: {
    fontSize: 13,
    color: '#aaa',
  },
  speechPillTextActive: {
    color: '#fff',
  },
  progress: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#333',
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
  stepWrapper: {
    flex: 1,
    position: 'relative',
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    padding: 24,
    paddingTop: 40,
    justifyContent: 'center',
    flexGrow: 1,
  },
  stepNumber: {
    color: '#FF6B35',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  stepText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 44,
    fontWeight: '500',
  },
  timerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
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
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#333',
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#666',
  },
  navButtonNext: {
    backgroundColor: '#FF6B35',
  },
  navButtonComplete: {
    backgroundColor: '#4CAF50',
  },
  navButtonNextText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  reSpeakButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#444',
  },
  reSpeakButtonText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  dotActive: {
    backgroundColor: '#FF6B35',
    width: 20,
  },
});
