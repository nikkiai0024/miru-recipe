import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TimerButton } from './TimerButton';
import type { RecipeStep } from '../utils/parser';

interface Props {
  step: RecipeStep;
  isActive?: boolean;
  large?: boolean;
  onTimestampPress?: (seconds: number) => void;
}

export function StepView({ step, isActive, large, onTimestampPress }: Props) {
  const formatTimestamp = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, isActive && styles.active, large && styles.large]}>
      <View style={styles.numberContainer}>
        <Text style={[styles.number, large && styles.largeNumber]}>
          {step.number}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.text, large && styles.largeText]}>
          {step.text || '（手順テキストなし）'}
        </Text>
        <View style={styles.actions}>
          {step.timestamp != null && onTimestampPress && (
            <Text
              style={styles.timestamp}
              onPress={() => onTimestampPress(step.timestamp ?? 0)}
            >
              {formatTimestamp(step.timestamp)}
            </Text>
          )}
          {step.timerSeconds != null && (
            <TimerButton seconds={step.timerSeconds} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    gap: 12,
  },
  active: {
    backgroundColor: '#FFF0E6',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  large: {
    padding: 20,
    marginVertical: 8,
  },
  numberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'BIZUDGothic_700Bold',
  },
  largeNumber: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  largeText: {
    fontSize: 22,
    lineHeight: 34,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  timestamp: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: 'BIZUDGothic_700Bold',
  },
});
