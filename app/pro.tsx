import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { usePurchase, PRODUCT_INFO, PRODUCTS, type ProductId } from '../hooks/usePurchase';
import { UsageDashboardStandalone } from '../components/UsageDashboard';

export default function ProScreen() {
  const router = useRouter();
  const { purchases, purchase, restorePurchases, trialActive, trialStatus } = usePurchase();

  const bundle = PRODUCT_INFO.find((p) => p.id === PRODUCTS.PRO_BUNDLE)!;
  const individualProducts = PRODUCT_INFO.filter((p) => p.id !== PRODUCTS.PRO_BUNDLE);
  const individualTotal = individualProducts.reduce((sum, p) => sum + p.priceValue, 0);
  const savings = individualTotal - bundle.priceValue;

  const isBundlePurchased = purchases[PRODUCTS.PRO_BUNDLE];
  const isPurchased = (productId: ProductId) =>
    purchases[productId] || isBundlePurchased;

  const allPurchased = individualProducts.every((p) => isPurchased(p.id as ProductId));

  return (
    <SafeAreaView style={styles.container} edges={["bottom","left","right"]}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 4 }}
            >
              <Text style={{ fontSize: 17, color: '#fff' }}>✕</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ヒーロー */}
        <View style={styles.hero}>
          <View style={styles.crownWrap}>
            <Text style={styles.crown}>👑</Text>
          </View>
          <Text style={styles.title}>ミルレシピ Pro</Text>
          <Text style={styles.subtitle}>
            料理を、もっと楽しく。{'\n'}
            買い切りで一生使える
          </Text>
          {allPurchased && (
            <View style={styles.allPurchasedBadge}>
              <Text style={styles.allPurchasedText}>✓ すべての機能を解放中</Text>
            </View>
          )}
          {trialActive && !allPurchased && (
            <View style={styles.trialHeaderBadge}>
              <Text style={styles.trialHeaderBadgeText}>
                🎁 Pro体験中 · あと{trialStatus.daysRemaining}日
              </Text>
            </View>
          )}
        </View>

        {/* 使用履歴ダッシュボード (sunk cost 可視化) */}
        {!allPurchased && <UsageDashboardStandalone />}

        {/* バンドル (推し) */}
        {!allPurchased && (
          <View style={styles.bundleSection}>
            <View style={styles.bundleRibbon}>
              <Text style={styles.bundleRibbonText}>✨ 一番人気・一番お得</Text>
            </View>
            <View style={[styles.bundleCard, isBundlePurchased && styles.bundleCardPurchased]}>
              <View style={styles.bundleTop}>
                <Text style={styles.bundleEmoji}>{bundle.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bundleName}>{bundle.name}</Text>
                  <Text style={styles.bundleTagline}>{bundle.tagline}</Text>
                </View>
              </View>

              <View style={styles.bundlePriceRow}>
                <View style={styles.bundlePriceLeft}>
                  <Text style={styles.bundleOriginalPrice}>
                    通常 ¥{individualTotal}
                  </Text>
                  <View style={styles.bundlePriceMain}>
                    <Text style={styles.bundlePrice}>¥{bundle.priceValue}</Text>
                    <Text style={styles.bundlePriceNote}>買い切り</Text>
                  </View>
                </View>
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsValue}>¥{savings}</Text>
                  <Text style={styles.savingsLabel}>お得</Text>
                </View>
              </View>

              <View style={styles.bundleBenefits}>
                {bundle.benefits.map((b, i) => (
                  <View key={i} style={styles.bundleBenefitRow}>
                    <Text style={styles.bundleBenefitIcon}>✓</Text>
                    <Text style={styles.bundleBenefitText}>{b}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.bundleCta,
                  isBundlePurchased && styles.bundleCtaPurchased,
                ]}
                onPress={() =>
                  !isBundlePurchased && purchase(PRODUCTS.PRO_BUNDLE)
                }
                disabled={isBundlePurchased}
                activeOpacity={0.88}
              >
                <Text
                  style={[
                    styles.bundleCtaText,
                    isBundlePurchased && styles.bundleCtaTextPurchased,
                  ]}
                >
                  {isBundlePurchased
                    ? '購入済み'
                    : `¥${bundle.priceValue} で全部アンロック`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* セパレータ */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>または必要なものだけ</Text>
              <View style={styles.separatorLine} />
            </View>
          </View>
        )}

        {/* 個別プロダクト */}
        {individualProducts.map((product) => {
          const purchased = isPurchased(product.id as ProductId);
          return (
            <View
              key={product.id}
              style={[styles.productCard, purchased && styles.productCardPurchased]}
            >
              <View style={styles.productHead}>
                <View style={styles.productEmojiWrap}>
                  <Text style={styles.productEmoji}>{product.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productTagline}>{product.tagline}</Text>
                </View>
              </View>

              <View style={styles.productBenefits}>
                {product.benefits.slice(0, 2).map((b, i) => (
                  <View key={i} style={styles.productBenefitRow}>
                    <Text style={styles.productBenefitIcon}>・</Text>
                    <Text style={styles.productBenefitText}>{b}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.productCta,
                  purchased && styles.productCtaPurchased,
                ]}
                onPress={() => !purchased && purchase(product.id as ProductId)}
                disabled={purchased}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.productCtaText,
                    purchased && styles.productCtaTextPurchased,
                  ]}
                >
                  {purchased ? '✓ 購入済み' : product.price}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* 安心ポイント */}
        <View style={styles.trustSection}>
          <Text style={styles.trustTitle}>安心ポイント</Text>
          <View style={styles.trustRow}>
            <Text style={styles.trustIcon}>♾️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.trustRowTitle}>買い切りで一生使える</Text>
              <Text style={styles.trustRowSub}>月額・年額のサブスクなし</Text>
            </View>
          </View>
          <View style={styles.trustRow}>
            <Text style={styles.trustIcon}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.trustRowTitle}>機種変更しても引き継げる</Text>
              <Text style={styles.trustRowSub}>Apple IDで自動復元</Text>
            </View>
          </View>
          <View style={styles.trustRow}>
            <Text style={styles.trustIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.trustRowTitle}>追加課金なし</Text>
              <Text style={styles.trustRowSub}>一度購入したら追加で請求されません</Text>
            </View>
          </View>
        </View>

        {/* 復元ボタン */}
        <TouchableOpacity style={styles.restoreButton} onPress={restorePurchases}>
          <Text style={styles.restoreButtonText}>購入を復元</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <Text style={styles.devNote}>
            ※ 開発版: 購入はモック (AsyncStorage保存)
          </Text>
        )}
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
    padding: 20,
    paddingBottom: 40,
  },
  // ヒーロー
  hero: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  crownWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FF6B35',
  },
  crown: {
    fontSize: 44,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2A1810',
    marginBottom: 8,
    fontFamily: 'BIZUDGothic_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B5B4D',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  allPurchasedBadge: {
    marginTop: 14,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  allPurchasedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  trialHeaderBadge: {
    marginTop: 14,
    backgroundColor: '#2A1810',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trialHeaderBadgeText: {
    color: '#FFD166',
    fontSize: 13,
    fontWeight: '800',
  },
  // バンドル
  bundleSection: {
    marginBottom: 8,
  },
  bundleRibbon: {
    alignSelf: 'center',
    backgroundColor: '#2A1810',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: -10,
    zIndex: 2,
  },
  bundleRibbonText: {
    color: '#FFD166',
    fontSize: 11,
    fontWeight: '800',
  },
  bundleCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    paddingTop: 24,
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  bundleCardPurchased: {
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  bundleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  bundleEmoji: {
    fontSize: 42,
  },
  bundleName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2A1810',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  bundleTagline: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '700',
    marginTop: 2,
  },
  bundlePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8F0',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  bundlePriceLeft: {
    flex: 1,
  },
  bundleOriginalPrice: {
    fontSize: 12,
    color: '#A0968D',
    textDecorationLine: 'line-through',
    fontWeight: '600',
    marginBottom: 2,
  },
  bundlePriceMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  bundlePrice: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  bundlePriceNote: {
    fontSize: 11,
    color: '#6B5B4D',
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    transform: [{ rotate: '-3deg' }],
  },
  savingsValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  savingsLabel: {
    color: '#FFE5D4',
    fontSize: 10,
    fontWeight: '700',
  },
  bundleBenefits: {
    marginBottom: 16,
    gap: 6,
  },
  bundleBenefitRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bundleBenefitIcon: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  bundleBenefitText: {
    flex: 1,
    fontSize: 13,
    color: '#2A1810',
    lineHeight: 19,
    fontWeight: '500',
  },
  bundleCta: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  bundleCtaPurchased: {
    backgroundColor: '#E8D5C4',
  },
  bundleCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  bundleCtaTextPurchased: {
    color: '#8A7A6D',
  },
  // セパレータ
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D4C5B0',
  },
  separatorText: {
    fontSize: 12,
    color: '#8A7A6D',
    fontWeight: '600',
  },
  // 個別プロダクト
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0E5D8',
  },
  productCardPurchased: {
    backgroundColor: '#F5F2EC',
    borderColor: '#D4C5B0',
    opacity: 0.75,
  },
  productHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  productEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF0E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productEmoji: {
    fontSize: 26,
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A1810',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  productTagline: {
    fontSize: 11,
    color: '#8A7A6D',
    fontWeight: '600',
    marginTop: 2,
  },
  productBenefits: {
    gap: 3,
    marginBottom: 12,
    paddingLeft: 4,
  },
  productBenefitRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  productBenefitIcon: {
    color: '#FF6B35',
    fontSize: 14,
  },
  productBenefitText: {
    flex: 1,
    fontSize: 12,
    color: '#6B5B4D',
    lineHeight: 18,
  },
  productCta: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  productCtaPurchased: {
    backgroundColor: '#E8D5C4',
  },
  productCtaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  productCtaTextPurchased: {
    color: '#8A7A6D',
  },
  // 安心ポイント
  trustSection: {
    marginTop: 28,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0E5D8',
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A1810',
    marginBottom: 14,
    fontFamily: 'BIZUDGothic_700Bold',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  trustIcon: {
    fontSize: 24,
  },
  trustRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A1810',
  },
  trustRowSub: {
    fontSize: 11,
    color: '#8A7A6D',
    marginTop: 2,
  },
  // 復元ボタン
  restoreButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 14,
  },
  restoreButtonText: {
    fontSize: 14,
    color: '#8A7A6D',
    textDecorationLine: 'underline',
  },
  devNote: {
    marginTop: 12,
    fontSize: 11,
    color: '#C4B8A8',
    textAlign: 'center',
  },
});
