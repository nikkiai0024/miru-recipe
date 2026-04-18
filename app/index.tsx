import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { useHearts } from '../hooks/useHearts';
import { RecipeCard } from '../components/RecipeCard';
import { HeartBar } from '../components/HeartBar';
import { categories } from '../data/categories';
import AdBanner from '../components/AdBanner';

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 4) return { text: 'こんばんは', emoji: '🌙' };
  if (hour < 10) return { text: 'おはようございます', emoji: '🌅' };
  if (hour < 16) return { text: 'こんにちは', emoji: '☀️' };
  if (hour < 19) return { text: 'お疲れさまです', emoji: '🌇' };
  return { text: 'こんばんは', emoji: '🌙' };
}

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { recipes, loading, toggleFav, reorderRecipes, refresh } = useRecipes();
  const { hasUnlimited, trialActive, trialStatus, ownedUnlimited } = usePurchase();
  const hearts = useHearts();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isReordering, setIsReordering] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<typeof recipes>([]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      hearts.refresh();
    }, [refresh, hearts.refresh])
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

  const filteredRecipes = useMemo(() => {
    return selectedCategory === 'all'
      ? [...recipes].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
      : selectedCategory === 'favorites'
        ? recipes.filter((r) => r.isFavorite)
        : recipes.filter((r) => r.category === selectedCategory);
  }, [recipes, selectedCategory]);

  const greeting = useMemo(() => getGreeting(), []);
  const favoriteCount = useMemo(() => recipes.filter((r) => r.isFavorite).length, [recipes]);

  // ハートバナーの状態 (購入済/トライアル中は非表示)
  const heartBannerState: 'hidden' | 'warning' | 'empty' = ownedUnlimited || trialActive
    ? 'hidden'
    : hearts.currentHearts === 0
      ? 'empty'
      : hearts.currentHearts <= 1
        ? 'warning'
        : 'hidden';

  if (loading && recipes.length === 0) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom","left","right"]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }

  const heroHeader = (
    <View style={styles.hero}>
      <View style={styles.greetingRow}>
        <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingText}>{greeting.text}</Text>
          <Text style={styles.greetingPrompt}>今日は何を作りましょう？</Text>
        </View>
      </View>

      {/* トライアル中 or ハート表示 */}
      {trialActive ? (
        <TouchableOpacity
          style={styles.trialBanner}
          onPress={() => router.push('/pro')}
          activeOpacity={0.88}
        >
          <Text style={styles.trialBannerEmoji}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.trialBannerTitle}>
              Pro全機能お試し中 · あと{trialStatus.daysRemaining}日
            </Text>
            <Text style={styles.trialBannerSub}>
              終了後は¥480で維持可能 · 買い切り
            </Text>
          </View>
          <Text style={styles.trialBannerArrow}>›</Text>
        </TouchableOpacity>
      ) : ownedUnlimited ? (
        <View style={styles.unlimitedBanner}>
          <Text style={styles.unlimitedEmoji}>♾️</Text>
          <Text style={styles.unlimitedText}>無制限プラン</Text>
        </View>
      ) : (
        <View style={styles.heartSection}>
          <HeartBar
            current={hearts.currentHearts}
            max={hearts.maxHearts}
            timeToNextLabel={hearts.timeToNextLabel}
            isFull={hearts.isFull}
          />
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{recipes.length}</Text>
          <Text style={styles.statLabel}>保存レシピ</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{favoriteCount}</Text>
          <Text style={styles.statLabel}>お気に入り</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom","left","right"]}>
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
            activeOpacity={0.7}
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
          ListHeaderComponent={selectedCategory === 'all' && recipes.length > 0 ? heroHeader : null}
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
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyAddButtonText}>最初のレシピを追加</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ハート制のプロモバナー */}
      {heartBannerState !== 'hidden' && !isReordering && (
        <TouchableOpacity
          style={[
            styles.limitBanner,
            heartBannerState === 'empty' && styles.limitBannerReached,
          ]}
          onPress={() => router.push('/pro')}
          activeOpacity={0.9}
        >
          <View style={styles.limitBannerIcon}>
            <Text style={styles.limitBannerIconText}>
              {heartBannerState === 'empty' ? '⚡' : '⚠️'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.limitBannerTitle}>
              {heartBannerState === 'empty'
                ? 'クレジット切れ'
                : `残りクレジット ${hearts.currentHearts}個`}
            </Text>
            <Text style={styles.limitBannerSubtitle}>
              {heartBannerState === 'empty'
                ? `あと${hearts.timeToNextLabel}で+1回復 · Proなら待ち時間なし`
                : `¥320の無制限プランなら、クレジット切れ無し`}
            </Text>
          </View>
          <Text style={styles.limitBannerCta}>›</Text>
        </TouchableOpacity>
      )}

      {/* 広告バナー (Pro購入前) */}
      {!hasUnlimited && (
        <View style={styles.adContainer}>
          <AdBanner />
        </View>
      )}

      {/* フッター */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerIconBtn}
          onPress={() => router.push('/shopping')}
          activeOpacity={0.7}
        >
          <Text style={styles.footerIconText}>🛒</Text>
          <Text style={styles.footerIconLabel}>買い物</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add')}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonPlus}>+</Text>
          <Text style={styles.addButtonText}>レシピ追加</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerIconBtn}
          onPress={() => router.push('/pro')}
          activeOpacity={0.7}
        >
          <Text style={styles.footerIconText}>{ownedUnlimited ? '👑' : trialActive ? '🎁' : '⭐'}</Text>
          <Text style={styles.footerIconLabel}>
            {ownedUnlimited ? 'Pro' : trialActive ? '体験中' : 'アップグレード'}
          </Text>
        </TouchableOpacity>
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
  // ヒーロー
  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  greetingEmoji: {
    fontSize: 32,
  },
  greetingText: {
    fontSize: 13,
    color: '#8A7A6D',
    fontWeight: '600',
    marginBottom: 2,
  },
  greetingPrompt: {
    fontSize: 18,
    color: '#2A1810',
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  // ハート・トライアル表示
  heartSection: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFF0E6',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#2A1810',
    borderRadius: 14,
    marginBottom: 12,
  },
  trialBannerEmoji: {
    fontSize: 28,
  },
  trialBannerTitle: {
    color: '#FFD166',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  trialBannerSub: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  trialBannerArrow: {
    color: '#FFD166',
    fontSize: 22,
    fontWeight: '800',
  },
  unlimitedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#FFF0E6',
    borderRadius: 12,
    marginBottom: 12,
  },
  unlimitedEmoji: {
    fontSize: 20,
  },
  unlimitedText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0E5D8',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  statNumberWarning: {
    color: '#E85D2C',
  },
  statLabel: {
    fontSize: 11,
    color: '#A0968D',
    marginTop: 2,
    fontWeight: '600',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: '#F0E5D8',
  },
  // カテゴリ
  categoryBar: {
    maxHeight: 76,
    paddingVertical: 2,
  },
  categoryContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    marginRight: 6,
    gap: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 56,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#E85D2C',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    transform: [{ translateY: -1 }],
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: 11,
    color: '#6B5B4D',
    fontWeight: '600',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  categoryLabelActive: {
    color: '#fff',
  },
  // リスト
  listContent: {
    paddingVertical: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  // 空状態
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
    color: '#2A1810',
    marginBottom: 8,
    fontFamily: 'BIZUDGothic_700Bold',
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    color: '#8A7A6D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  emptyAddButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  // 月間制限バナー
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFF3E8',
    borderWidth: 1,
    borderColor: '#FFD4BF',
    gap: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  limitBannerReached: {
    backgroundColor: '#FFE5E0',
    borderColor: '#FFB7A5',
  },
  limitBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitBannerIconText: {
    fontSize: 20,
    color: '#fff',
  },
  limitBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A1810',
    marginBottom: 2,
    fontFamily: 'BIZUDGothic_700Bold',
  },
  limitBannerSubtitle: {
    fontSize: 12,
    color: '#6B5B4D',
    fontWeight: '500',
  },
  limitBannerCta: {
    fontSize: 28,
    color: '#FF6B35',
    fontWeight: '800',
  },
  // 広告
  adContainer: {
    alignItems: 'center',
  },
  // フッター
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F0E5D8',
    backgroundColor: '#FFF8F0',
    gap: 10,
  },
  footerIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 64,
  },
  footerIconText: {
    fontSize: 22,
    marginBottom: 2,
  },
  footerIconLabel: {
    fontSize: 10,
    color: '#8A7A6D',
    fontWeight: '600',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    gap: 6,
  },
  addButtonPlus: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  // 並び替え
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
});
