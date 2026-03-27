import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Ingredient } from '../utils/parser';

interface Props {
  ingredients: Ingredient[];
  servings?: string;
}

/**
 * 分量テキストから数値を調整する
 * ratio = adjustedServings / originalServings
 */
function adjustAmount(original: string, ratio: number): string {
  // ratio が 1 ならそのまま返す
  if (ratio === 1) return original;

  // 数値が含まれない・調味的表現はスキップ
  const skipPatterns = ['適量', '少々', '少し', 'お好みで', '適宜'];
  if (skipPatterns.some((p) => original.includes(p))) return original;

  // 数値（分数含む）を検出して置換
  // マッチ対象: "1/2", "1.5", "200" など
  const result = original.replace(
    /(\d+)\/(\d+)|\d+\.?\d*/g,
    (match) => {
      let value: number;

      // 分数の処理
      if (match.includes('/')) {
        const [numerator, denominator] = match.split('/');
        value = parseInt(numerator) / parseInt(denominator);
      } else {
        value = parseFloat(match);
      }

      const adjusted = value * ratio;

      // 整数ならそのまま、小数なら1桁まで
      if (Number.isInteger(adjusted)) {
        return adjusted.toString();
      }
      // 分数だった場合で結果がきれいな分数になるケースは小数で表示
      return adjusted.toFixed(1).replace(/\.0$/, '');
    }
  );

  return result;
}

/**
 * "2人分" などの文字列から数値を抽出
 */
function parseServingsNumber(servings: string): number {
  const match = servings.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

export function IngredientList({ ingredients, servings }: Props) {
  const originalServings = parseServingsNumber(servings || '');
  const [adjustedServings, setAdjustedServings] = useState<number>(
    originalServings > 0 ? originalServings : 2
  );

  const ratio = originalServings > 0 ? adjustedServings / originalServings : 1;
  const isAdjusted = ratio !== 1;

  const adjustedIngredients = useMemo(
    () =>
      ingredients.map((item) => ({
        ...item,
        adjustedAmount: adjustAmount(item.amount, ratio),
      })),
    [ingredients, ratio]
  );

  const decrease = () => {
    setAdjustedServings((prev) => Math.max(1, prev - 1));
  };

  const increase = () => {
    setAdjustedServings((prev) => Math.min(10, prev + 1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>材料</Text>
        {originalServings > 0 && (
          <View style={styles.servingsAdjuster}>
            <TouchableOpacity
              onPress={decrease}
              style={[
                styles.adjustButton,
                adjustedServings <= 1 && styles.adjustButtonDisabled,
              ]}
              disabled={adjustedServings <= 1}
              accessibilityLabel="人数を減らす"
            >
              <Text
                style={[
                  styles.adjustButtonText,
                  adjustedServings <= 1 && styles.adjustButtonTextDisabled,
                ]}
              >
                −
              </Text>
            </TouchableOpacity>
            <Text style={styles.servingsText}>{adjustedServings}人分</Text>
            <TouchableOpacity
              onPress={increase}
              style={[
                styles.adjustButton,
                adjustedServings >= 10 && styles.adjustButtonDisabled,
              ]}
              disabled={adjustedServings >= 10}
              accessibilityLabel="人数を増やす"
            >
              <Text
                style={[
                  styles.adjustButtonText,
                  adjustedServings >= 10 && styles.adjustButtonTextDisabled,
                ]}
              >
                ＋
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {!originalServings && servings ? (
          <Text style={styles.servingsBadge}>{servings}</Text>
        ) : null}
      </View>
      {adjustedIngredients.map((item, index) => (
        <View key={index} style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.amountContainer}>
            {isAdjusted && item.adjustedAmount !== item.amount ? (
              <>
                <Text style={styles.originalAmount}>{item.amount}</Text>
                <Text style={styles.adjustedAmount}>{item.adjustedAmount}</Text>
              </>
            ) : (
              <Text style={styles.amount}>{item.amount}</Text>
            )}
          </View>
        </View>
      ))}
      {ingredients.length === 0 && (
        <Text style={styles.empty}>材料情報がありません</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e8e0',
  },
  title: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  servingsAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0E6',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonDisabled: {
    backgroundColor: '#e0d6cc',
  },
  adjustButtonText: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 22,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  adjustButtonTextDisabled: {
    color: '#bbb',
  },
  servingsText: {
    fontSize: 14,
    color: '#FF6B35',
    marginHorizontal: 10,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  servingsBadge: {
    fontSize: 14,
    color: '#888',
    backgroundColor: '#FFF0E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0e8e0',
  },
  name: {
    fontSize: 15,
    color: '#333',
    minWidth: 80,
    flexShrink: 0,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  amountContainer: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 16,
  },
  amount: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  originalAmount: {
    fontSize: 12,
    color: '#aaa',
    textDecorationLine: 'line-through',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  adjustedAmount: {
    fontSize: 15,
    color: '#FF6B35',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  empty: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: 'BIZUDGothic_400Regular',
  },
});
