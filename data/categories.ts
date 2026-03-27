export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const categories: Category[] = [
  { id: 'all', label: 'すべて', emoji: '📋' },
  { id: 'favorites', label: 'お気に入り', emoji: '⭐' },
  { id: 'japanese', label: '和食', emoji: '🍱' },
  { id: 'western', label: '洋食', emoji: '🍝' },
  { id: 'chinese', label: '中華', emoji: '🥟' },
  { id: 'korean', label: '韓国料理', emoji: '🌶' },
  { id: 'soup', label: 'スープ・汁物', emoji: '🍲' },
  { id: 'salad', label: '副菜・サラダ', emoji: '🥗' },
  { id: 'sweets', label: 'スイーツ', emoji: '🧁' },
  { id: 'bread', label: 'パン・軽食', emoji: '🥐' },
  { id: 'breakfast', label: '朝食・卵料理', emoji: '🍳' },
];

export function getCategoryLabel(id: string): string {
  return categories.find((c) => c.id === id)?.label ?? '朝食・卵料理';
}

export function getCategoryEmoji(id: string): string {
  return categories.find((c) => c.id === id)?.emoji ?? '🍳';
}
