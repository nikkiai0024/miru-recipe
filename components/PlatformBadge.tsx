import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Platform } from '../utils/platform';

interface Props {
  platform: Platform;
  size?: 'small' | 'normal';
}

const PLATFORM_CONFIG: Record<Platform, { label: string; icon: string; bg: string; color: string }> = {
  youtube: { label: 'YouTube', icon: '▶', bg: '#FF0000', color: '#fff' },
  youtube_shorts: { label: 'Shorts', icon: '▶', bg: '#FF0000', color: '#fff' },
  tiktok: { label: 'TikTok', icon: '♪', bg: '#000000', color: '#fff' },
  cookpad: { label: 'Cookpad', icon: '🍳', bg: '#F48220', color: '#fff' },
  recipe_site: { label: 'レシピ', icon: '📝', bg: '#888888', color: '#fff' },
  unknown: { label: 'その他', icon: '🔗', bg: '#AAAAAA', color: '#fff' },
};

export function PlatformBadge({ platform, size = 'small' }: Props) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.unknown;
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSmall && styles.badgeSmall]}>
      <Text style={[styles.icon, isSmall && styles.iconSmall]}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.color }, isSmall && styles.labelSmall]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  icon: {
    fontSize: 12,
  },
  iconSmall: {
    fontSize: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  labelSmall: {
    fontSize: 9,
    fontWeight: '600',
    fontFamily: 'BIZUDGothic_700Bold',
  },
});
