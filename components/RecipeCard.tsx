import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { getCategoryEmoji, getCategoryLabel } from '../data/categories';
import { PlatformBadge } from './PlatformBadge';
import type { Recipe } from '../utils/storage';

interface Props {
  recipe: Recipe;
  onPress: () => void;
  onFavorite: () => void;
}

export function RecipeCard({ recipe, onPress, onFavorite }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasThumbnail = !!recipe.thumbnailUrl;
  const stepCount = recipe.steps?.length ?? 0;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  if (hasThumbnail) {
    return (
      <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={styles.posterCard}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <Image
            source={{ uri: recipe.thumbnailUrl }}
            style={styles.posterThumbnail}
            resizeMode="cover"
          />

          {/* 上部バッジ: プラットフォーム + お気に入り */}
          <View style={styles.posterTopRow}>
            {recipe.platform && <PlatformBadge platform={recipe.platform} size="small" />}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={onFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.favoriteChip}
            >
              <Text style={[styles.favoriteIcon, recipe.isFavorite && styles.favoriteIconActive]}>
                {recipe.isFavorite ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 下部グラデ風オーバーレイ */}
          <View style={styles.posterScrim1} pointerEvents="none" />
          <View style={styles.posterScrim2} pointerEvents="none" />
          <View style={styles.posterScrim3} pointerEvents="none" />

          {/* 下部タイトル部 */}
          <View style={styles.posterBottom}>
            <View style={styles.posterMetaRow}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillEmoji}>
                  {getCategoryEmoji(recipe.category)}
                </Text>
                <Text style={styles.categoryPillLabel}>
                  {getCategoryLabel(recipe.category)}
                </Text>
              </View>
              {stepCount > 0 && (
                <View style={styles.stepChip}>
                  <Text style={styles.stepChipText}>{stepCount}ステップ</Text>
                </View>
              )}
            </View>
            <Text style={styles.posterTitle} numberOfLines={2}>
              {recipe.title}
            </Text>
            {!!recipe.channelTitle && (
              <Text style={styles.posterChannel} numberOfLines={1}>
                {recipe.channelTitle}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // サムネなし: 水平レイアウト
  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.noThumbCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.noThumbIconArea}>
          <Text style={styles.noThumbEmoji}>{getCategoryEmoji(recipe.category)}</Text>
        </View>
        <View style={styles.noThumbContent}>
          <View style={styles.noThumbBadgeRow}>
            {recipe.platform && <PlatformBadge platform={recipe.platform} size="small" />}
            {stepCount > 0 && (
              <View style={styles.stepChipLight}>
                <Text style={styles.stepChipLightText}>{stepCount}ステップ</Text>
              </View>
            )}
          </View>
          <Text style={styles.noThumbTitle} numberOfLines={2}>
            {recipe.title}
          </Text>
          {!!recipe.channelTitle && (
            <Text style={styles.noThumbChannel} numberOfLines={1}>
              {recipe.channelTitle}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onFavorite}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.noThumbFav}
        >
          <Text style={[styles.favoriteIcon, recipe.isFavorite && styles.favoriteIconActive]}>
            {recipe.isFavorite ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  // ポスター型
  posterCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2A1810',
    aspectRatio: 16 / 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    position: 'relative',
  },
  posterThumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  posterTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  favoriteChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 22,
    color: '#fff',
    lineHeight: 24,
  },
  favoriteIconActive: {
    color: '#FFD166',
  },
  // 擬似グラデーション (3 層で下に向かって濃く)
  posterScrim1: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  posterScrim2: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  posterScrim3: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '24%',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  posterBottom: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    zIndex: 2,
  },
  posterMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.95)',
  },
  categoryPillEmoji: {
    fontSize: 11,
  },
  categoryPillLabel: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  stepChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepChipText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  posterTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    fontFamily: 'BIZUDGothic_700Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  posterChannel: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  // サムネなし型
  noThumbCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
    padding: 10,
  },
  noThumbIconArea: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noThumbEmoji: {
    fontSize: 32,
  },
  noThumbContent: {
    flex: 1,
    paddingRight: 8,
  },
  noThumbBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  noThumbTitle: {
    fontSize: 15,
    color: '#2A1810',
    lineHeight: 21,
    fontFamily: 'BIZUDGothic_400Regular',
    fontWeight: '600',
  },
  noThumbChannel: {
    fontSize: 12,
    color: '#A0968D',
    marginTop: 2,
  },
  noThumbFav: {
    padding: 6,
  },
  stepChipLight: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FFF0E6',
  },
  stepChipLightText: {
    fontSize: 10,
    color: '#C04A17',
    fontWeight: '700',
  },
});
