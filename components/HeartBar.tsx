import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  current: number;
  max: number;
  timeToNextLabel: string;
  isFull: boolean;
  onPress?: () => void;
  compact?: boolean;
}

export function HeartBar({
  current,
  max,
  timeToNextLabel,
  isFull,
  onPress,
  compact,
}: Props) {
  const hearts = Array.from({ length: max }, (_, i) => i < current);

  const Wrapper: any = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Wrapper {...wrapperProps} style={[styles.container, compact && styles.compact]}>
      <View style={styles.hearts}>
        {hearts.map((filled, i) => (
          <Text key={i} style={[styles.heart, !filled && styles.heartEmpty]}>
            {filled ? '❤️' : '🤍'}
          </Text>
        ))}
      </View>
      <View style={styles.labelArea}>
        <Text style={[styles.countLabel, compact && styles.countLabelCompact]}>
          {current}/{max}
        </Text>
        {!compact && (
          <Text style={styles.subLabel}>
            {isFull
              ? '満タン'
              : current === 0
                ? `${timeToNextLabel}で1個回復`
                : `次+1: ${timeToNextLabel}`}
          </Text>
        )}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  compact: {
    gap: 6,
    paddingVertical: 2,
  },
  hearts: {
    flexDirection: 'row',
    gap: 2,
  },
  heart: {
    fontSize: 18,
  },
  heartEmpty: {
    opacity: 0.55,
  },
  labelArea: {
    flexDirection: 'column',
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A1810',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  countLabelCompact: {
    fontSize: 12,
  },
  subLabel: {
    fontSize: 10,
    color: '#8A7A6D',
    fontWeight: '500',
    marginTop: 1,
  },
});
