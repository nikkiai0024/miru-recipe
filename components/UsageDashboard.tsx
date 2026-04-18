import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getRecipes, type Recipe } from '../utils/storage';
import { useState, useEffect } from 'react';

/**
 * 推定調理時間を計算 (分)
 * cookTime (「30分」等) があれば優先、なければステップ数 × 5分
 */
function estimateCookMinutes(recipe: Recipe): number {
  const ct = recipe.cookTime?.trim();
  if (ct) {
    // "30分", "1時間", "1時間30分" など
    let total = 0;
    const h = ct.match(/(\d+)\s*時間/);
    const m = ct.match(/(\d+)\s*分/);
    if (h) total += parseInt(h[1], 10) * 60;
    if (m) total += parseInt(m[1], 10);
    if (total > 0) return total;
  }
  return Math.max(15, (recipe.steps?.length ?? 0) * 5);
}

function formatMinutes(totalMin: number): string {
  if (totalMin < 60) return `${totalMin}分`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

function daysSince(isoDate: string): number {
  const start = new Date(isoDate).getTime();
  const days = Math.floor((Date.now() - start) / (24 * 3600 * 1000));
  return Math.max(1, days);
}

interface Props {
  recipes: Recipe[];
  compact?: boolean;
}

export function UsageDashboard({ recipes, compact }: Props) {
  const stats = useMemo(() => {
    const total = recipes.length;
    const favorites = recipes.filter((r) => r.isFavorite).length;
    const totalMin = recipes.reduce((sum, r) => sum + estimateCookMinutes(r), 0);
    const oldest = recipes
      .map((r) => r.createdAt)
      .filter(Boolean)
      .sort()
      .find(Boolean);
    const daysUsed = oldest ? daysSince(oldest) : 0;
    return { total, favorites, totalMin, daysUsed };
  }, [recipes]);

  if (stats.total === 0) return null;

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={styles.headline}>あなたの料理記録</Text>
      <Text style={styles.subheadline}>
        {stats.daysUsed > 0
          ? `ミルレシピと一緒に ${stats.daysUsed}日`
          : `この記録を活かし続けよう`}
      </Text>

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Text style={styles.cellEmoji}>🍳</Text>
          <Text style={styles.cellValue}>{stats.total}</Text>
          <Text style={styles.cellLabel}>保存レシピ</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellEmoji}>⭐</Text>
          <Text style={styles.cellValue}>{stats.favorites}</Text>
          <Text style={styles.cellLabel}>お気に入り</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellEmoji}>⏱</Text>
          <Text style={styles.cellValue}>{formatMinutes(stats.totalMin)}</Text>
          <Text style={styles.cellLabel}>推定調理時間</Text>
        </View>
      </View>

      <Text style={styles.footnote}>
        これまで育ててきたレシピをもっと活用するなら ↓
      </Text>
    </View>
  );
}

/**
 * 単独で使うときのラッパー (自分で recipes を取得)
 */
export function UsageDashboardStandalone({ compact }: { compact?: boolean }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    getRecipes().then(setRecipes).catch(() => {});
  }, []);

  return <UsageDashboard recipes={recipes} compact={compact} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8F0',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#F0E0CF',
  },
  compact: {
    padding: 14,
  },
  headline: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A1810',
    fontFamily: 'BIZUDGothic_700Bold',
    marginBottom: 4,
  },
  subheadline: {
    fontSize: 12,
    color: '#8A7A6D',
    fontWeight: '600',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cell: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0E5D8',
  },
  cellEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  cellValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B35',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  cellLabel: {
    fontSize: 10,
    color: '#8A7A6D',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  footnote: {
    fontSize: 11,
    color: '#6B5B4D',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
