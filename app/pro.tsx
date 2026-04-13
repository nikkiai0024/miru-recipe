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
import { usePurchase, PRODUCT_INFO, type ProductId } from '../hooks/usePurchase';

export default function ProScreen() {
  const router = useRouter();
  const { purchases, purchase, restorePurchases, hasUnlimited, hasCookingPro, hasShoppingList } =
    usePurchase();

  const isPurchased = (productId: ProductId) => purchases[productId];
  const isBundlePurchased = purchases['com.mirurecipe.pro_bundle'];

  return (
    <SafeAreaView style={styles.container} edges={["bottom","left","right"]}>
    <Stack.Screen
      options={{
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 17, color: '#fff' }}>✕</Text>
          </TouchableOpacity>
        ),
      }}
    />
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.title}>ミルレシピ Pro</Text>
        <Text style={styles.subtitle}>
          すべての機能をアンロックして{'\n'}料理をもっと楽しく！
        </Text>
      </View>

      {PRODUCT_INFO.map((product) => {
        const purchased =
          isPurchased(product.id) || isBundlePurchased;

        return (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDescription}>
                {product.description}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                purchased && styles.purchasedButton,
              ]}
              onPress={() => !purchased && purchase(product.id as ProductId)}
              disabled={purchased}
            >
              <Text
                style={[
                  styles.purchaseButtonText,
                  purchased && styles.purchasedButtonText,
                ]}
              >
                {purchased ? '購入済み' : product.price}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.comparisonRow}>
        <View style={styles.comparisonCard}>
          <Text style={styles.comparisonCardTitle}>無料版</Text>
          <View style={styles.comparisonItem}><Text style={styles.comparisonText}>レシピ取り込み（月5件）</Text></View>
          <View style={styles.comparisonItem}><Text style={styles.comparisonText}>調理モード基本</Text></View>
          <View style={styles.comparisonItem}><Text style={styles.comparisonText}>タイマー内蔵</Text></View>
        </View>
        <View style={[styles.comparisonCard, styles.comparisonCardPro]}>
          <Text style={[styles.comparisonCardTitle, styles.comparisonCardTitlePro]}>Pro版</Text>
          <View style={styles.comparisonItem}><Text style={styles.comparisonTextPro}>無制限レシピ追加</Text></View>
          <View style={styles.comparisonItem}><Text style={styles.comparisonTextPro}>音声読み上げ</Text></View>
          <View style={styles.comparisonItem}><Text style={styles.comparisonTextPro}>画面左右タップで前後操作</Text></View>
          <View style={styles.comparisonItem}><Text style={styles.comparisonTextPro}>買い物リスト</Text></View>
        </View>
      </View>

      <TouchableOpacity style={styles.restoreButton} onPress={restorePurchases}>
        <Text style={styles.restoreButtonText}>購入を復元</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <Text style={styles.note}>
          ※ 開発版のため、購入はモック（AsyncStorage保存）です
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 16,
  },
  crown: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 8,
    fontFamily: 'BIZUDGothic_700Bold',
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  purchaseButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  purchasedButton: {
    backgroundColor: '#e0d8d0',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  purchasedButtonText: {
    color: '#999',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  comparisonCardPro: {
    backgroundColor: '#FFF0E6',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  comparisonCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#888',
    marginBottom: 12,
    textAlign: 'center',
  },
  comparisonCardTitlePro: {
    color: '#FF6B35',
  },
  comparisonItem: {
    paddingVertical: 5,
  },
  comparisonText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  comparisonTextPro: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
    fontWeight: '600',
  },
  restoreButton: {
    marginTop: 24,
    alignItems: 'center' as const,
    paddingVertical: 14,
  },
  restoreButtonText: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'underline' as const,
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    color: '#bbb',
    textAlign: 'center',
  },
});
