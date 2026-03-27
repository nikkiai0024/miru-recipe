import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { getCategoryEmoji } from '../data/categories';
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

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.card, !hasThumbnail && styles.cardNoThumb]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {hasThumbnail ? (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: recipe.thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            {recipe.platform && (
              <View style={styles.badgeOverlay}>
                <PlatformBadge platform={recipe.platform} size="small" />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.accentBar} />
        )}
        <View style={[styles.content, !hasThumbnail && styles.contentNoThumb]}>
          {!hasThumbnail && (
            <Text style={styles.noThumbEmoji}>
              {getCategoryEmoji(recipe.category)}
            </Text>
          )}
          <View style={styles.textArea}>
            <View style={styles.header}>
              {hasThumbnail && (
                <Text style={styles.category}>
                  {getCategoryEmoji(recipe.category)}
                </Text>
              )}
              <Text style={styles.title} numberOfLines={2}>
                {recipe.title}
              </Text>
            </View>
            <View style={styles.footer}>
              <Text style={styles.channel}>{recipe.channelTitle}</Text>
              <TouchableOpacity onPress={onFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.favorite}>
                  {recipe.isFavorite ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: 16,
    marginVertical: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardNoThumb: {
    flexDirection: 'row',
  },
  accentBar: {
    width: 4,
    backgroundColor: '#FF6B35',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  thumbnailContainer: {
    position: 'relative' as const,
  },
  thumbnail: {
    width: '100%',
    height: 140,
  },
  badgeOverlay: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
  },
  content: {
    padding: 10,
  },
  contentNoThumb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noThumbEmoji: {
    fontSize: 32,
  },
  textArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  category: {
    fontSize: 20,
    marginTop: 2,
    fontFamily: undefined,
  },
  title: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  channel: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  favorite: {
    fontSize: 24,
    color: '#FF6B35',
  },
});
