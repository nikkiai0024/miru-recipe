import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Vibration,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useNavigation } from 'expo-router';
import { useRecipes } from '../hooks/useRecipes';
import { usePurchase } from '../hooks/usePurchase';
import { RecipeCard } from '../components/RecipeCard';
import { categories } from '../data/categories';
import AdBanner from '../components/AdBanner';

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { recipes, loading, toggleFav, reorderRecipes, monthlyCount, freeLimit, refresh } = useRecipes();
  const { hasUnlimited } = usePurchase();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isReordering, setIsReordering] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<typeof recipes>([]);

  // フォーカス時にレシピ一覧をリフレッシュ
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const startReorder = useCallback(() => {
    setPendingOrder([...recipes]);
    setIsReordering(true);
  }, [recipes]);

  const cancelReorder = useCallback(() => {
    setIsReordering(false);
    setPendingOrder([]);
  }, []);

  const saveReorder = useCallback(async () => {
    await reorderRecipes(pendingOrder.map((r) => r.id));
    setIsReordering(false);
    setPendingOrder([]);
  }, [pendingOrder, reorderRecipes]);

  // ヘッダーを動的に変更
  useEffect(() => {
    if (isReordering) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity onPress={cancelReorder} style={{ paddingHorizontal: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>キャンセル</Text>
          </TouchableOpacity>
        ),
        headerTitle: '並び替え',
        headerRight: () => (
          <TouchableOpacity onPress={saveReorder} style={{ paddingHorizontal: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>保存</Text>
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerLeft: undefined,
        headerTitle: 'ミルレシピ',
        headerRight: () => (
          <TouchableOpacity onPress={startReorder} style={{ paddingHorizontal: 8 }}>
            <Text style={{ color: '#fff', fontSize: 22 }}>☰</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [isReordering, cancelReorder, saveReorder, startReorder]);

  const filteredRecipes =
    selectedCategory === 'all'
      ? [...recipes].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
      : selectedCategory === 'favorites'
        ? recipes.filter((r) => r.isFavorite)
        : recipes.filter((r) => r.category === selectedCategory);

  if (loading && recipes.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom","left","right"]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom","left","right"]}>
      {/* ヘッダーグラデーション風アクセント */}
      <View style={styles.headerAccent}>
        <View style={styles.headerAccentInner} />
      </View>

      {/* カテゴリフィルター */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryBar}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === cat.id && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* レシピ一覧 */}
      {isReordering ? (
        <DraggableFlatList
          data={pendingOrder}
          keyExtractor={(item) => item.id}
          activationDistance={0}
          autoscrollThreshold={60}
          autoscrollSpeed={150}
          onDragEnd={({ data }) => setPendingOrder(data)}
          renderItem={({ item, drag, isActive }: RenderItemParams<typeof recipes[0]>) => (
            <ScaleDecorator>
              <View style={[styles.reorderRow, isActive && styles.reorderRowActive]}>
                <View style={{ flex: 1 }}>
                  <RecipeCard
                    recipe={item}
                    onPress={() => {}}
                    onFavorite={() => {}}
                  />
                </View>
                <TouchableOpacity
                  onPressIn={() => {
                    Vibration.vibrate(10);
                    drag();
                  }}
                  disabled={isActive}
                  style={[styles.dragHandle, isActive && styles.dragHandleActive]}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.dragHandleText, isActive && styles.dragHandleTextActive]}>
                    ≡
                  </Text>
                </TouchableOpacity>
              </View>
            </ScaleDecorator>
          )}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              onPress={() => router.push(`/recipe/${item.id}`)}
              onFavorite={() => toggleFav(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIllustration}>
                {selectedCategory === 'favorites' ? '⭐' : '🍳🥘🍰'}
              </Text>
              <Text style={styles.emptyTitle}>
                {selectedCategory === 'favorites' ? 'まだお気に入りがありません' : 'レシピがありません'}
              </Text>
              <Text style={styles.emptyText}>
                {selectedCategory === 'favorites'
                  ? 'レシピの☆をタップしてお気に入りに追加しましょう'
                  : `YouTube・TikTok・Cookpad等のURLを追加して${'\n'}テキストレシピに変換しましょう`}
              </Text>
              {selectedCategory !== 'favorites' && (
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={() => router.push('/add')}
                >
                  <Text style={styles.emptyAddButtonText}>最初のレシピを追加</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* 広告バナー */}
      <View style={styles.adContainer}>
        <AdBanner />
      </View>

      {/* フッター */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/shopping')}
          >
            <Text style={styles.iconButtonText}>🛒</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add')}
          >
            <Text style={styles.addButtonText}>+ レシピ追加</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/pro')}
          >
            <Text style={styles.iconButtonText}>👑</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.counter}>
          {hasUnlimited ? '∞ 無制限' : `今月 ${monthlyCount}/${freeLimit} 件`}
        </Text>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
  },
  headerAccent: {
    height: 4,
    overflow: 'hidden',
  },
  headerAccentInner: {
    flex: 1,
    backgroundColor: '#FF6B35',
    opacity: 0.3,
  },
  categoryBar: {
    maxHeight: 72,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0d8d0',
  },
  categoryContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    gap: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 52,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#E85D2C',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryLabel: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  categoryLabelActive: {
    color: '#fff',
  },
  listContent: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIllustration: {
    fontSize: 56,
    marginBottom: 20,
    letterSpacing: 8,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  emptyAddButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  adContainer: {
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0d8d0',
    backgroundColor: '#FFF8F0',
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  addButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconButtonText: {
    fontSize: 20,
  },
  counter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  reorderToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderIcon: {
    fontSize: 22,
    color: '#999',
  },
  reorderIconActive: {
    color: '#FF6B35',
  },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  reorderRowActive: {
    opacity: 0.9,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandle: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: 4,
  },
  dragHandleActive: {
    backgroundColor: '#FFF0E6',
  },
  dragHandleText: {
    fontSize: 28,
    color: '#bbb',
    fontWeight: '700',
  },
  dragHandleTextActive: {
    color: '#FF6B35',
  },
  reorderButtons: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  reorderArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderArrowDisabled: {
    backgroundColor: '#ddd',
  },
  reorderArrowText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  reorderArrowTextDisabled: {
    color: '#bbb',
  },
  reorderCardWrapper: {
    flex: 1,
  },
});
