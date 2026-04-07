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
import { useRouter, Stack } from 'expo-router';
import { fetchVideoInfo } from '../utils/youtube';
import { smartParse } from '../utils/parser';
import { useRecipes } from '../hooks/useRecipes';
import { usePurchase } from '../hooks/usePurchase';
import { categories } from '../data/categories';
import { detectPlatform, extractVideoId, getPlatformLabel } from '../utils/platform';
import type { Platform as RecipePlatform } from '../utils/platform';
import { fetchTikTokMeta } from '../utils/tiktok';
import { fetchStepsFromTranscript } from '../utils/firebase';
import { fetchVideoComments, fetchYouTubeTranscript } from '../utils/transcript';
import { scrapeRecipeSite } from '../utils/recipe-scraper';
import YoutubePlayer from 'react-native-youtube-iframe';
import { PlatformBadge } from '../components/PlatformBadge';
import type { Recipe } from '../utils/storage';
import type { Ingredient, RecipeStep } from '../utils/parser';

function guessCategory(title: string): string {
  const rules: [string, string[]][] = [
    ['japanese', ['丼', '煮物', '味噌', '醤油', 'だし', '和風', '天ぷら', '寿司', '刺身', '焼き魚', 'うどん', 'そば', 'おにぎり', '肉じゃが', '親子丼', '唐揚げ', '筑前煮', 'ひじき', '炊き込み']],
    ['western', ['パスタ', 'ピザ', 'カレー', 'ハンバーグ', 'グラタン', 'オムレツ', 'ステーキ', 'シチュー', 'スパゲッティ', 'ドリア', 'ソテー', 'ポトフ']],
    ['chinese', ['チャーハン', '餃子', '麻婆', '中華', 'ラーメン', '炒め', '春巻き', 'エビチリ', '八宝菜', '担々麺']],
    ['korean', ['キムチ', 'チヂミ', 'ビビンバ', 'サムゲタン', 'プルコギ', 'トッポギ', '韓国', 'スンドゥブ']],
    ['sweets', ['ケーキ', 'クッキー', 'プリン', 'チョコ', 'スイーツ', 'デザート', 'タルト', 'マフィン', 'パンケーキ', 'ガトー']],
    ['bread', ['パン', 'トースト', 'ベーグル', 'クロワッサン', 'フォカッチャ', 'ブレッド']],
    ['salad', ['サラダ', 'ドレッシング']],
    ['soup', ['スープ', 'みそ汁', 'ポタージュ', 'ポトフ', '豚汁', 'お吸い物', 'コンソメ']],
  ];

  for (const [categoryId, keywords] of rules) {
    if (keywords.some((kw) => title.includes(kw))) {
      return categoryId;
    }
  }
  return 'breakfast';
}

export default function AddScreen() {
  const router = useRouter();
  const { addRecipe, canAddRecipe } = useRecipes();
  const { hasUnlimited, loading: purchaseLoading } = usePurchase();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'url' | 'edit'>('url');
  const [detectedPlatform, setDetectedPlatform] = useState<RecipePlatform>('unknown');
  const [statusMessage, setStatusMessage] = useState('');

  // 編集用状態
  const [title, setTitle] = useState('');
  const [videoId, setVideoId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [channelTitle, setChannelTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [servings, setServings] = useState('2人分');
  const [category, setCategory] = useState('breakfast');
  const [cookTime, setCookTime] = useState('');
  const [parseSource, setParseSource] = useState<string>('');
  const [servingsModalVisible, setServingsModalVisible] = useState(false);
  const servingsOptions = ['1人分', '2人分', '3人分', '4人分', '5人分', '6人分以上'];

  // URL変更時にプラットフォーム自動判定
  useEffect(() => {
    if (url.trim().length > 10) {
      setDetectedPlatform(detectPlatform(url.trim()));
    } else {
      setDetectedPlatform('unknown');
    }
  }, [url]);

  const handleFetch = async () => {
    if (!canAddRecipe && !hasUnlimited && !purchaseLoading) {
      Alert.alert(
        '月間制限',
        '無料版は月5件までです。Pro版にアップグレードすると無制限に追加できます。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'Pro版を見る', onPress: () => router.push('/pro') },
        ]
      );
      return;
    }

    const platform = detectPlatform(url.trim());
    setLoading(true);
    setStatusMessage('');

    try {
      switch (platform) {
        case 'youtube':
        case 'youtube_shorts':
          await handleYouTubeFetch(platform);
          break;
        case 'tiktok':
          await handleTikTokFetch();
          break;
        case 'cookpad':
        case 'recipe_site':
          await handleRecipeSiteFetch(platform);
          break;
        default:
          // unknownでもJSON-LDを試みる
          await handleRecipeSiteFetch('unknown');
          break;
      }
      setStep('edit');
    } catch (e: any) {
      Alert.alert('エラー', e.message || 'レシピの取得に失敗しました');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleYouTubeFetch = async (platform: RecipePlatform) => {
    const vid = extractVideoId(url);
    if (!vid) {
      throw new Error('有効なYouTube URLを入力してください');
    }

    setStatusMessage('動画情報を取得中...');
    const info = await fetchVideoInfo(vid);

    setVideoId(info.videoId);
    setTitle(info.title);
    setThumbnailUrl(info.thumbnailUrl);
    setChannelTitle(info.channelTitle);
    setDescription(info.description);
    setDetectedPlatform(platform);
    setCategory(guessCategory(info.title));

    setStatusMessage('レシピを抽出中...');
    const result = smartParse(info.description, null);

    setIngredients(result.ingredients);
    setSteps(result.steps);
    setServings(result.servings);

    // 手順が取れなかった or 材料の分量がすべて空のとき、AI字幕+コメント解析を試みる
    const hasNoAmounts = result.ingredients.every(ing => !ing.amount);
    if ((result.steps.length === 0 || hasNoAmounts) && vid) {
      setStatusMessage('AI字幕解析中...');
      try {
        const [transcriptText, commentText] = await Promise.all([
          fetchYouTubeTranscript(vid).catch(() => ""),
          fetchVideoComments(vid).catch(() => ""),
        ]);
        const aiResult = await fetchStepsFromTranscript(vid, transcriptText || undefined, commentText || undefined);
        if (aiResult.steps.length > 0 && result.steps.length === 0) {
          setSteps(aiResult.steps.map(s => ({
            number: s.number,
            text: s.text,
            timerSeconds: null,
            timestamp: null,
          })));
        }
        if (aiResult.ingredients.length > 0) {
          setIngredients(aiResult.ingredients.map(ing => ({
            name: ing.name,
            amount: ing.amount,
          })));
        }
        if (aiResult.ingredients.length > 0 || aiResult.steps.length > 0) {
          setParseSource('動画の字幕・コメントからAIがレシピを生成しました');
          return;
        }
      } catch {
        // AI取得失敗しても続行
      }
    }

    if (result.ingredients.length > 0 || result.steps.length > 0) {
      setParseSource('動画の説明欄からレシピを取得しました');
    } else {
      setParseSource('説明欄にレシピ情報が見つかりませんでした。手動で入力してください。');
    }
  };

  const handleTikTokFetch = async () => {
    setStatusMessage('TikTok動画情報を取得中...');
    try {
      const meta = await fetchTikTokMeta(url.trim());
      setTitle(meta.title);
      setChannelTitle(meta.author);
      setThumbnailUrl(meta.thumbnail);
      setDetectedPlatform('tiktok');
      setCategory(guessCategory(meta.title));
    } catch {
      setTitle('TikTokレシピ');
      setDetectedPlatform('tiktok');
    }
    // TikTokはレシピ自動抽出不可、手動入力へ
  };

  const handleRecipeSiteFetch = async (platform: RecipePlatform) => {
    setStatusMessage('レシピを取得中...');
    const scraped = await scrapeRecipeSite(url.trim());

    if (scraped) {
      setTitle(scraped.title);
      setThumbnailUrl(scraped.image || '');
      setIngredients(scraped.ingredients);
      setSteps(scraped.steps);
      setServings(scraped.servings || '');
      setCookTime(scraped.cookTime || '');
      setDetectedPlatform(platform);
      setCategory(guessCategory(scraped.title));
    } else {
      // JSON-LD取得失敗 → 手動入力
      setDetectedPlatform(platform === 'unknown' ? 'unknown' : platform);
      Alert.alert(
        'レシピ自動取得できませんでした',
        'レシピ情報を手動で入力してください。'
      );
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('入力エラー', 'タイトルを入力してください');
      return;
    }
    if (steps.length === 0) {
      Alert.alert('入力エラー', '手順を1つ以上追加してください');
      return;
    }

    const recipe: Recipe = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      videoId,
      title,
      description,
      thumbnailUrl,
      channelTitle,
      ingredients,
      steps,
      servings,
      category,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      platform: detectedPlatform,
      sourceUrl: url.trim(),
      cookTime: cookTime || undefined,
      captionsAvailable: undefined,
    };

    try {
      await addRecipe(recipe);
      router.back();
    } catch (e: any) {
      Alert.alert('保存エラー', e.message || 'レシピの保存に失敗しました');
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

  const getPlaceholderText = () => {
    switch (detectedPlatform) {
      case 'youtube':
      case 'youtube_shorts':
        return 'https://youtube.com/watch?v=...';
      case 'tiktok':
        return 'https://tiktok.com/@user/video/...';
      case 'cookpad':
        return 'https://cookpad.com/recipe/...';
      default:
        return 'URLをペーストしてください';
    }
  };

  if (step === 'url') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.urlContainer}>
          <Text style={styles.heading}>レシピURLを入力</Text>
          <Text style={styles.subtitle}>
            YouTube・Cookpad・レシピサイト対応{'\n'}TikTokはタイトルのみ自動取得
          </Text>

          <TextInput
            style={styles.urlInput}
            placeholder={getPlaceholderText()}
            placeholderTextColor="#ccc"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {/* プラットフォーム判定バッジ */}
          {url.trim().length > 10 && (
            <View style={styles.platformRow}>
              <PlatformBadge platform={detectedPlatform} size="normal" />
              <Text style={styles.platformHint}>
                {detectedPlatform === 'tiktok'
                  ? '動画情報を取得します。レシピは手動入力になります。'
                  : detectedPlatform === 'cookpad' || detectedPlatform === 'recipe_site'
                  ? 'レシピを自動取得します。'
                  : detectedPlatform === 'youtube' || detectedPlatform === 'youtube_shorts'
                  ? '動画説明文からレシピを抽出します。'
                  : 'JSON-LDレシピの自動取得を試みます。'}
              </Text>
            </View>
          )}

          {statusMessage ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.fetchButton, !url && styles.fetchButtonDisabled]}
            onPress={handleFetch}
            disabled={!url || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.fetchButtonText}>レシピを取得</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 17, color: '#fff' }}>✕</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* YouTube小窓プレイヤー */}
      {videoId ? (
        <View style={styles.youtubeContainer}>
          <YoutubePlayer height={200} videoId={videoId} />
          <Text style={styles.youtubeHint}>動画を見ながらステップを入力できます</Text>
        </View>
      ) : null}

      <ScrollView style={styles.editContainer} contentContainerStyle={styles.editContent}>
        {/* プラットフォームバッジ */}
        <View style={styles.editPlatformRow}>
          <PlatformBadge platform={detectedPlatform} size="normal" />
          {cookTime ? <Text style={styles.cookTimeText}>調理時間: {cookTime}</Text> : null}
        </View>

        {/* レシピ抽出元メッセージ */}
        {parseSource ? (
          <View style={styles.guidanceBox}>
            <Text style={styles.guidanceText}>{parseSource}</Text>
          </View>
        ) : null}

        {/* TikTok手動入力ガイダンス */}
        {detectedPlatform === 'tiktok' && ingredients.length === 0 && steps.length === 0 && (
          <View style={styles.guidanceBox}>
            <Text style={styles.guidanceText}>
              TikTokはタイトルのみ自動取得できます。{'\n'}
              動画を見ながら材料と手順を手動で入力してください。
            </Text>
          </View>
        )}

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
          <View key={i} style={styles.stepRow}>
            <Text style={styles.stepNumber}>{s.number}</Text>
            <TextInput
              style={[styles.input, styles.stepInput]}
              value={s.text}
              onChangeText={(v) => updateStep(i, v)}
              placeholder="手順を入力"
              placeholderTextColor="#ccc"
              multiline
            />
            <TouchableOpacity onPress={() => removeStep(i)}>
              <Text style={styles.removeButton}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addStepButton} onPress={addStep}>
          <Text style={styles.addStepButtonText}>+ ステップを追加</Text>
        </TouchableOpacity>

        {/* 保存ボタン */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>レシピを保存</Text>
        </TouchableOpacity>

        {/* 注記 */}
        <Text style={styles.noteText}>
          ⚠️ ソースの内容によっては材料・手順が正しく取得できない場合があります。動画の説明欄が未整理の場合や、音声で手順を説明していない動画では自動取得の精度が下がることがあります。取得後は内容をご確認ください。
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },

  urlContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'BIZUDGothic_700Bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 32,
  },
  urlInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
    marginBottom: 16,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  platformHint: {
    flex: 1,
    fontSize: 12,
    color: '#888',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    color: '#FF6B35',
  },
  fetchButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  fetchButtonDisabled: {
    opacity: 0.5,
  },
  fetchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
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
  },
  guidanceBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  guidanceText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  noteText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  categoryLabelActive: {
    color: '#fff',
    fontWeight: '600',
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
    color: '#FF6B35',
    marginTop: 14,
    width: 20,
    textAlign: 'center',
  },
  stepInput: {
    flex: 1,
  },
  removeButton: {
    fontSize: 18,
    color: '#ccc',
    padding: 12,
  },
  addItemButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addItemText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
  },
  youtubeContainer: {
    backgroundColor: '#000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0d8d0',
  },
  youtubeHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: '#FFF8F0',
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
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#999',
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
  },
  modalOptionTextActive: {
    color: '#FF6B35',
    fontWeight: '700',
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
  },
});
