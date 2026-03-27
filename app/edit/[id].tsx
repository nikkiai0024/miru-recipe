import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRecipe, useRecipes } from '../../hooks/useRecipes';
import { categories } from '../../data/categories';
import YoutubePlayer from 'react-native-youtube-iframe';
import { PlatformBadge } from '../../components/PlatformBadge';
import type { Ingredient, RecipeStep } from '../../utils/parser';

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recipe, loading: recipeLoading } = useRecipe(id);
  const { updateRecipe } = useRecipes();

  const [title, setTitle] = useState('');
  const [videoId, setVideoId] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [servings, setServings] = useState('2人分');
  const [category, setCategory] = useState('breakfast');
  const [cookTime, setCookTime] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [servingsModalVisible, setServingsModalVisible] = useState(false);
  const [expandedTimerIndex, setExpandedTimerIndex] = useState<number | null>(null);
  const servingsOptions = ['1人分', '2人分', '3人分', '4人分', '5人分', '6人分以上'];

  useEffect(() => {
    if (recipe && !initialized) {
      setTitle(recipe.title);
      setVideoId(recipe.videoId || '');
      setIngredients(recipe.ingredients || []);
      setSteps(recipe.steps || []);
      setServings(recipe.servings || '2人分');
      setCategory(recipe.category || 'breakfast');
      setCookTime(recipe.cookTime || '');
      setInitialized(true);
    }
  }, [recipe, initialized]);

  if (recipeLoading || !initialized) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>レシピが見つかりません</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('入力エラー', 'タイトルを入力してください');
      return;
    }
    if (steps.length === 0) {
      Alert.alert('入力エラー', '手順を1つ以上追加してください');
      return;
    }

    try {
      await updateRecipe({
        ...recipe,
        title,
        ingredients,
        steps,
        servings,
        category,
        cookTime: cookTime || undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('保存エラー', e.message || 'レシピの更新に失敗しました');
    }
  };

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '' }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, text: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], text };
    setSteps(updated);
  };

  const updateStepTimer = (index: number, minutes: number, seconds: number) => {
    const updated = [...steps];
    const total = minutes * 60 + seconds;
    updated[index] = { ...updated[index], timerSeconds: total > 0 ? total : null };
    setSteps(updated);
  };

  const getTimerDisplay = (timerSeconds: number | null | undefined) => {
    if (timerSeconds == null || timerSeconds === 0) return null;
    const m = Math.floor(timerSeconds / 60);
    const s = timerSeconds % 60;
    return `${m}分${s}秒`;
  };

  const addStep = () => {
    setSteps([
      ...steps,
      { number: steps.length + 1, text: '', timerSeconds: null, timestamp: null },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps(
      steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, number: i + 1 }))
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {videoId ? (
        <View style={styles.youtubeContainer}>
          <YoutubePlayer height={200} videoId={videoId} />
        </View>
      ) : null}

      <ScrollView style={styles.editContainer} contentContainerStyle={styles.editContent}>
        {recipe.platform ? (
          <View style={styles.editPlatformRow}>
            <PlatformBadge platform={recipe.platform} size="normal" />
            {cookTime ? <Text style={styles.cookTimeText}>調理時間: {cookTime}</Text> : null}
          </View>
        ) : null}

        {/* タイトル */}
        <Text style={styles.sectionTitle}>タイトル</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          multiline
        />

        {/* カテゴリ */}
        <Text style={styles.sectionTitle}>カテゴリ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories
            .filter((c) => c.id !== 'all' && c.id !== 'favorites')
            .map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  category === cat.id && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    category === cat.id && styles.categoryLabelActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>

        {/* 人数 */}
        <Text style={styles.sectionTitle}>人数</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setServingsModalVisible(true)}
        >
          <Text style={styles.dropdownButtonText}>{servings || '選択してください'}</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={servingsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setServingsModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setServingsModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>人数を選択</Text>
              <FlatList
                data={servingsOptions}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      servings === item && styles.modalOptionActive,
                    ]}
                    onPress={() => {
                      setServings(item);
                      setServingsModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        servings === item && styles.modalOptionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 材料 */}
        <Text style={styles.sectionTitle}>材料</Text>
        {ingredients.map((ing, i) => (
          <View key={i} style={styles.ingredientRow}>
            <TextInput
              style={[styles.input, styles.ingredientName]}
              value={ing.name}
              onChangeText={(v) => updateIngredient(i, 'name', v)}
              placeholder="材料名"
              placeholderTextColor="#ccc"
            />
            <TextInput
              style={[styles.input, styles.ingredientAmount]}
              value={ing.amount}
              onChangeText={(v) => updateIngredient(i, 'amount', v)}
              placeholder="分量"
              placeholderTextColor="#ccc"
            />
            <TouchableOpacity onPress={() => removeIngredient(i)}>
              <Text style={styles.removeButton}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addItemButton} onPress={addIngredient}>
          <Text style={styles.addItemText}>+ 材料を追加</Text>
        </TouchableOpacity>

        {/* 手順 */}
        <Text style={styles.sectionTitle}>手順</Text>
        {steps.map((s, i) => (
          <View key={i}>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>{s.number}</Text>
              <TextInput
                style={[styles.input, styles.stepInput]}
                value={s.text}
                onChangeText={(v) => updateStep(i, v)}
                placeholder="手順を入力"
                placeholderTextColor="#ccc"
                multiline
              />
              <TouchableOpacity
                onPress={() => setExpandedTimerIndex(expandedTimerIndex === i ? null : i)}
                style={styles.timerToggle}
              >
                <Text style={[
                  styles.timerToggleText,
                  s.timerSeconds != null && s.timerSeconds > 0 && styles.timerToggleActive,
                ]}>
                  {s.timerSeconds != null && s.timerSeconds > 0
                    ? `⏱${getTimerDisplay(s.timerSeconds)}`
                    : '⏱'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeStep(i)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            {expandedTimerIndex === i && (
              <View style={styles.timerInputRow}>
                <TextInput
                  style={styles.timerInput}
                  value={s.timerSeconds != null ? String(Math.floor(s.timerSeconds / 60)) : ''}
                  onChangeText={(v) => {
                    const m = parseInt(v, 10) || 0;
                    const sec = s.timerSeconds != null ? s.timerSeconds % 60 : 0;
                    updateStepTimer(i, m, sec);
                  }}
                  placeholder="0"
                  placeholderTextColor="#ccc"
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.timerLabel}>分</Text>
                <TextInput
                  style={styles.timerInput}
                  value={s.timerSeconds != null ? String(s.timerSeconds % 60) : ''}
                  onChangeText={(v) => {
                    const sec = parseInt(v, 10) || 0;
                    const m = s.timerSeconds != null ? Math.floor(s.timerSeconds / 60) : 0;
                    updateStepTimer(i, m, sec);
                  }}
                  placeholder="0"
                  placeholderTextColor="#ccc"
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={styles.timerLabel}>秒</Text>
                {s.timerSeconds != null && s.timerSeconds > 0 && (
                  <TouchableOpacity onPress={() => updateStepTimer(i, 0, 0)}>
                    <Text style={styles.timerClear}>クリア</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.addStepButton} onPress={addStep}>
          <Text style={styles.addStepButtonText}>+ ステップを追加</Text>
        </TouchableOpacity>

        {/* 保存ボタン */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>変更を保存</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  errorText: {
    fontSize: 16,
    color: '#888',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  youtubeContainer: {
    backgroundColor: '#000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0d8d0',
  },
  editContainer: {
    flex: 1,
  },
  editContent: {
    padding: 16,
    paddingBottom: 40,
  },
  editPlatformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  cookTimeText: {
    fontSize: 13,
    color: '#888',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'BIZUDGothic_700Bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    marginBottom: 8,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  categoryLabelActive: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#333',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '75%',
    maxHeight: 360,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'BIZUDGothic_700Bold',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    marginBottom: 4,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalOptionActive: {
    backgroundColor: '#FFF3E0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  modalOptionTextActive: {
    color: '#FF6B35',
    fontWeight: '700',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientName: {
    flex: 2,
  },
  ingredientAmount: {
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'BIZUDGothic_700Bold',
    color: '#FF6B35',
    marginTop: 14,
    width: 20,
    textAlign: 'center',
  },
  stepInput: {
    flex: 1,
  },
  timerToggle: {
    padding: 10,
    justifyContent: 'center',
  },
  timerToggleText: {
    fontSize: 16,
    color: '#bbb',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  timerToggleActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  timerInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 28,
    marginBottom: 8,
    gap: 6,
  },
  timerInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    width: 56,
    textAlign: 'center',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'BIZUDGothic_400Regular',
  },
  timerClear: {
    fontSize: 13,
    color: '#FF6B35',
    marginLeft: 8,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  removeButton: {
    fontSize: 18,
    color: '#ccc',
    padding: 12,
    fontFamily: 'BIZUDGothic_400Regular',
  },
  addItemButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addItemText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  addStepButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addStepButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'BIZUDGothic_700Bold',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'BIZUDGothic_700Bold',
  },
});
