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
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import type { YoutubeIframeRef } from 'react-native-youtube-iframe';
import { useRecipe } from '../../hooks/useRecipes';
import { usePurchase } from '../../hooks/usePurchase';
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
  const { hasShoppingList } = usePurchase();
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);
  const [refreshedRecipe, setRefreshedRecipe] = useState(initialRecipe);
  const [shoppingNudge, setShoppingNudge] = useState(false);
  const playerRef = useRef<YoutubeIframeRef>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getRecipe(id).then((data) => {
        if (data) setRefreshedRecipe(data);
      });
    }, [id])
  );

  const recipe = refreshedRecipe ?? initialRecipe;
  const currentIsFavorite = isFavorite ?? recipe?.isFavorite ?? false;

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
    if (!hasShoppingList) {
      setShoppingNudge(true);
      return;
    }
    await addToShoppingList(recipe);
    Alert.alert('追加完了', '材料を買い物リストに追加しました');
  };

  const handleToggleFavorite = async () => {
    await toggleFavorite(recipe.id);
    setIsFavorite(!currentIsFavorite);
  };

  const stepCount = recipe.steps.length;
  const ingredientCount = recipe.ingredients.length;

  return (
    <SafeAreaView style={styles.container} edges={["bottom","left","right"]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* 動画 or サムネイル */}
        {recipe.videoId ? (
          <View style={styles.playerContainer}>
            <YouTubePlayer videoId={recipe.videoId} ref={playerRef} />
          </View>
        ) : recipe.thumbnailUrl ? (
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: recipe.thumbnailUrl }} style={styles.thumbnail} />
            <View style={styles.thumbnailScrim} />
          </View>
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailPlaceholderEmoji}>
              {getCategoryEmoji(recipe.category)}
            </Text>
          </View>
        )}

        {/* ヘッダー情報 */}
        <View style={styles.headerSection}>
          <View style={styles.metaChipRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipEmoji}>{getCategoryEmoji(recipe.category)}</Text>
              <Text style={styles.categoryChipLabel}>{getCategoryLabel(recipe.category)}</Text>
            </View>
            {recipe.cookTime ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>⏱ {recipe.cookTime}</Text>
              </View>
            ) : null}
            {stepCount > 0 && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>📝 {stepCount}ステップ</Text>
              </View>
            )}
            {ingredientCount > 0 && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>🧺 {ingredientCount}食材</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{recipe.title}</Text>

          {!!recipe.channelTitle && (
            <Text style={styles.channel}>
              出典: {recipe.channelTitle}
            </Text>
          )}
        </View>

        {/* 調理モード CTA - ヒーロー級 */}
        <TouchableOpacity
          style={styles.cookButton}
          onPress={() => router.push(`/cooking/${recipe.id}`)}
          activeOpacity={0.88}
        >
          <View style={styles.cookButtonTextArea}>
            <Text style={styles.cookButtonTitle}>調理モードで始める</Text>
            <Text style={styles.cookButtonSub}>手が汚れててもOK・画面は常時オン</Text>
          </View>
          <View style={styles.cookButtonIconWrap}>
            <Text style={styles.cookButtonIcon}>👨‍🍳</Text>
          </View>
        </TouchableOpacity>

        {/* サブアクション */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddToShopping} activeOpacity={0.7}>
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>🛒</Text>
              {!hasShoppingList && (
                <View style={styles.actionLockBadge}>
                  <Text style={styles.actionLockText}>Pro</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionLabel}>買い物リスト</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite} activeOpacity={0.7}>
            <View style={styles.actionIconWrap}>
              <Text style={[styles.actionIcon, currentIsFavorite && styles.actionIconStar]}>
                {currentIsFavorite ? '★' : '☆'}
              </Text>
            </View>
            <Text style={styles.actionLabel}>
              {currentIsFavorite ? '解除' : 'お気に入り'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/edit/${recipe.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>✏️</Text>
            </View>
            <Text style={styles.actionLabel}>編集</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleDelete} activeOpacity={0.7}>
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>🗑</Text>
            </View>
            <Text style={styles.actionLabel}>削除</Text>
          </TouchableOpacity>
        </View>

        {/* 材料 */}
        <View style={styles.sectionWrap}>
          <IngredientList ingredients={recipe.ingredients} servings={recipe.servings} />
        </View>

        {/* 手順 */}
        <View style={styles.sectionWrap}>
          <View style={styles.stepsSection}>
            <View style={styles.stepsHeader}>
              <Text style={styles.sectionTitle}>作り方</Text>
              <Text style={styles.sectionSub}>{stepCount} ステップ</Text>
            </View>
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
        </View>

        {/* 末尾の調理モード再CTA */}
        {stepCount > 0 && (
          <TouchableOpacity
            style={styles.cookButtonSecondary}
            onPress={() => router.push(`/cooking/${recipe.id}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.cookButtonSecondaryText}>▶ 調理モードを開始</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 買い物リスト Pro ナッジモーダル */}
      <Modal
        visible={shoppingNudge}
        transparent
        animationType="fade"
        onRequestClose={() => setShoppingNudge(false)}
      >
        <Pressable style={styles.nudgeOverlay} onPress={() => setShoppingNudge(false)}>
          <Pressable style={styles.nudgeCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.nudgeEmoji}>🛒</Text>
            <Text style={styles.nudgeTitle}>買い物がもっと簡単に</Text>
            <Text style={styles.nudgeBody}>
              レシピの材料をワンタップで買い物リストに追加{'\n'}
              スーパーでチェックしながら買える
            </Text>
            <View style={styles.nudgeBenefitList}>
              <Text style={styles.nudgeBenefit}>✓ 複数レシピの材料をまとめて管理</Text>
              <Text style={styles.nudgeBenefit}>✓ チェックリスト形式でカゴ忘れ防止</Text>
              <Text style={styles.nudgeBenefit}>✓ 一度買えば追加料金なし</Text>
            </View>
            <TouchableOpacity
              style={styles.nudgeCta}
              onPress={() => {
                setShoppingNudge(false);
                router.push('/pro');
              }}
            >
              <Text style={styles.nudgeCtaText}>¥160 で解放</Text>
              <Text style={styles.nudgeCtaSub}>買い切り・永久利用</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShoppingNudge(false)}>
              <Text style={styles.nudgeDismiss}>あとで</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: 240,
  },
  thumbnailScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    backgroundColor: 'rgba(255, 248, 240, 0.7)',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#FFF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#FF6B35',
  },
  thumbnailPlaceholderEmoji: {
    fontSize: 80,
  },
  // ヘッダー
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  metaChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
  },
  categoryChipEmoji: {
    fontSize: 12,
  },
  categoryChipLabel: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E5D8',
  },
  metaChipText: {
    fontSize: 11,
    color: '#6B5B4D',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2A1810',
    lineHeight: 32,
    fontFamily: 'BIZUDGothic_700Bold',
  },
  channel: {
    fontSize: 13,
    color: '#A0968D',
    marginTop: 6,
    fontWeight: '500',
  },
  // 調理モード CTA
  cookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF6B35',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cookButtonTextArea: {
    flex: 1,
  },
  cookButtonTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  cookButtonSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 3,
    fontWeight: '500',
  },
  cookButtonIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
  },
  cookButtonIcon: {
    fontSize: 28,
  },
  // サブアクション
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E5D8',
    marginBottom: 12,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  actionIconWrap: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionIconStar: {
    color: '#FFB347',
    fontSize: 24,
  },
  actionLockBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  actionLockText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  actionLabel: {
    fontSize: 11,
    color: '#6B5B4D',
    fontWeight: '600',
  },
  // セクション
  sectionWrap: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  stepsSection: {
    paddingHorizontal: 0,
    marginTop: 4,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A1810',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  sectionSub: {
    fontSize: 12,
    color: '#A0968D',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#A0968D',
    textAlign: 'center',
    paddingVertical: 20,
  },
  cookButtonSecondary: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FF6B35',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cookButtonSecondaryText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  // ナッジモーダル
  nudgeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  nudgeBenefitList: {
    width: '100%',
    gap: 6,
    marginBottom: 22,
  },
  nudgeBenefit: {
    fontSize: 13,
    color: '#2A1810',
    fontWeight: '600',
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
