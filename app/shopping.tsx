import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getShoppingList,
  saveShoppingList,
  type ShoppingItem,
} from '../utils/storage';
import { usePurchase } from '../hooks/usePurchase';
import { LockedOverlay } from '../components/LockedOverlay';

export default function ShoppingScreen() {
  const { hasShoppingList, loading: purchaseLoading } = usePurchase();

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(async () => {
    setLoading(true);
    const data = await getShoppingList();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const toggleItem = async (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(updated);
    try {
      await saveShoppingList(updated);
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const clearChecked = () => {
    Alert.alert('確認', 'チェック済みの項目を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        onPress: async () => {
          const remaining = items.filter((item) => !item.checked);
          setItems(remaining);
          try {
            await saveShoppingList(remaining);
          } catch {
            Alert.alert('エラー', '保存に失敗しました');
          }
        },
      },
    ]);
  };

  const removeItem = async (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    try {
      await saveShoppingList(updated);
    } catch {
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const removeRecipeGroup = (recipeTitle: string) => {
    Alert.alert('確認', `「${recipeTitle}」の材料をすべて削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          const remaining = items.filter(
            (item) => item.recipeTitle !== recipeTitle
          );
          setItems(remaining);
          try {
            await saveShoppingList(remaining);
          } catch {
            Alert.alert('エラー', '保存に失敗しました');
          }
        },
      },
    ]);
  };

  const clearAll = () => {
    Alert.alert('確認', '買い物リストをすべてクリアしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'クリア',
        style: 'destructive',
        onPress: async () => {
          setItems([]);
          try {
            await saveShoppingList([]);
          } catch {
            Alert.alert('エラー', '保存に失敗しました');
          }
        },
      },
    ]);
  };

  // レシピ名ごとにグループ化
  const groupedItems = items.reduce<Record<string, ShoppingItem[]>>(
    (groups, item) => {
      const key = item.recipeTitle;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    },
    {}
  );

  const sections = Object.entries(groupedItems);

  const checkedCount = items.filter((i) => i.checked).length;

  if (!purchaseLoading && !hasShoppingList) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom","left","right"]}>
        <LockedOverlay message="買い物リスト機能はPro版で利用できます" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom","left","right"]}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>買い物リストは空です</Text>
          <Text style={styles.emptyText}>
            レシピ詳細画面の買い物リストボタンを押すと追加できます
          </Text>
        </View>
      ) : (
        <>
          {/* ヘッダー */}
          <View style={styles.header}>
            <Text style={styles.count}>
              {checkedCount}/{items.length} 完了
            </Text>
            <View style={styles.headerActions}>
              {checkedCount > 0 && (
                <TouchableOpacity onPress={clearChecked}>
                  <Text style={styles.headerButton}>チェック済みを削除</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={clearAll}>
                <Text style={[styles.headerButton, styles.headerButtonDanger]}>
                  全削除
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={sections}
            keyExtractor={([title]) => title}
            renderItem={({ item: [recipeTitle, recipeItems] }) => (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{recipeTitle}</Text>
                  <TouchableOpacity
                    onPress={() => removeRecipeGroup(recipeTitle)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.sectionDelete}>削除</Text>
                  </TouchableOpacity>
                </View>
                {recipeItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.item}
                    onPress={() => toggleItem(item.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        item.checked && styles.checkboxChecked,
                      ]}
                    >
                      {item.checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text
                      style={[
                        styles.itemName,
                        item.checked && styles.itemNameChecked,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.itemAmount,
                        item.checked && styles.itemAmountChecked,
                      ]}
                    >
                      {item.amount}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.itemDelete}
                    >
                      <Text style={styles.itemDeleteText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            contentContainerStyle={styles.listContent}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'BIZUDGothic_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0d8d0',
  },
  count: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
  },
  headerButtonDanger: {
    color: '#e74c3c',
  },
  listContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  sectionDelete: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#bbb',
  },
  itemAmount: {
    fontSize: 14,
    color: '#666',
  },
  itemAmountChecked: {
    color: '#ccc',
  },
  itemDelete: {
    padding: 4,
    marginLeft: 4,
  },
  itemDeleteText: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '600',
  },
});
