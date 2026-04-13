import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import type { YoutubeIframeRef } from 'react-native-youtube-iframe';
import { useRecipe } from '../../hooks/useRecipes';
import { getRecipe } from '../../utils/storage';
import { IngredientList } from '../../components/IngredientList';
import { StepView } from '../../components/StepView';
import { YouTubePlayer, seekTo } from '../../components/YouTubePlayer';
import { getCategoryLabel, getCategoryEmoji } from '../../data/categories';
import { addToShoppingList, deleteRecipe, toggleFavorite } from '../../utils/storage';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recipe: initialRecipe, loading } = useRecipe(id);
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);
  const [refreshedRecipe, setRefreshedRecipe] = useState(initialRecipe);
  const playerRef = useRef<YoutubeIframeRef>(null);

  // フォーカス時に最新データを再読み込み（編集後の反映）
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getRecipe(id).then((data) => {
        if (data) setRefreshedRecipe(data);
      });
    }, [id])
  );

  // Use local isFavorite state if toggled, else use recipe data
  const recipe = refreshedRecipe ?? initialRecipe;
  const currentIsFavorite = isFavorite ?? recipe?.isFavorite ?? false;

  // ⚠️ Hooksはearly returnの前に全部呼ぶ（Reactのルール）
  const handleTimestampPress = useCallback((seconds: number) => {
    seekTo(playerRef, seconds);
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom","left","right"]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom","left","right"]}>
        <Text style={styles.errorText}>レシピが見つかりません</Text>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert('削除確認', 'このレシピを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deleteRecipe(recipe.id);
          router.back();
        },
      },
    ]);
  };

  const handleAddToShopping = async () => {
    await addToShoppingList(recipe);
    Alert.alert('追加完了', '材料を買い物リストに追加しました');
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite(recipe.id);
    setIsFavorite(!currentIsFavorite);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom","left","right"]}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      {/* YouTubeプレイヤー or サムネイル */}
      {recipe.videoId ? (
        <View style={styles.playerContainer}>
          <YouTubePlayer videoId={recipe.videoId} ref={playerRef} />
        </View>
      ) : recipe.thumbnailUrl ? (
        <Image source={{ uri: recipe.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailPlaceholderEmoji}>
            {getCategoryEmoji(recipe.category)}
          </Text>
        </View>
      )}

      {/* タイトル */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.category}>
            {getCategoryEmoji(recipe.category)} {getCategoryLabel(recipe.category)}
          </Text>
          <Text style={styles.channel}>{recipe.channelTitle}</Text>
        </View>
      </View>

      {/* 調理モード CTA */}
      <TouchableOpacity
        style={styles.cookButton}
        onPress={() => router.push(`/cooking/${recipe.id}`)}
      >
        <Text style={styles.cookButtonIcon}>👨‍🍳</Text>
        <Text style={styles.cookButtonText}>調理モードで始める</Text>
      </TouchableOpacity>

      {/* サブアクション */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleAddToShopping}>
          <Text style={styles.actionIcon}>🛒</Text>
          <Text style={styles.actionLabel}>買い物リスト</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite}>
          <Text style={styles.actionIcon}>
            {currentIsFavorite ? '★' : '☆'}
          </Text>
          <Text style={styles.actionLabel}>お気に入り</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/edit/${recipe.id}`)}
        >
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={styles.actionLabel}>編集</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
          <Text style={styles.actionIcon}>🗑</Text>
          <Text style={styles.actionLabel}>削除</Text>
        </TouchableOpacity>
      </View>

      {/* 材料 */}
      <IngredientList ingredients={recipe.ingredients} servings={recipe.servings} />

      {/* 手順 */}
      <View style={styles.stepsSection}>
        <Text style={styles.sectionTitle}>作り方</Text>
        {recipe.steps.map((step) => (
          <StepView
            key={step.number}
            step={step}
            onTimestampPress={recipe.videoId ? handleTimestampPress : undefined}
          />
        ))}
        {recipe.steps.length === 0 && (
          <Text style={styles.emptyText}>手順情報がありません</Text>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
  },
  errorText: {
    fontSize: 16,
    color: '#888',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  playerContainer: {
    paddingHorizontal: 0,
  },
  thumbnail: {
    width: '100%',
    height: 220,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#FFF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#FF6B35',
  },
  thumbnailPlaceholderEmoji: {
    fontSize: 80,
  },
  titleSection: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    lineHeight: 28,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  category: {
    fontSize: 14,
    color: '#666',
  },
  channel: {
    fontSize: 13,
    color: '#aaa',
  },
  cookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  cookButtonIcon: {
    fontSize: 22,
  },
  cookButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0d8d0',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 11,
    color: '#666',
  },
  stepsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
