# ミルレシピ 設計評価レポート

Generated: 2026-03-10
Evaluator: Claude Opus

---

## エグゼクティブサマリー

- **完成度**: 65%
- **ブロッカー**:
  1. `utils/captions.ts` がYouTube HTMLスクレイピングを使用 - App Store審査リスク大
  2. IAP未実装 (react-native-iap未インストール)
  3. 広告SDK未実装 (react-native-google-mobile-ads未インストール)
- **総合評価**: Phase 1〜2のコア機能は動作可能な状態。収益化機能が完全に欠落しており、App Store提出には字幕取得方式の見直しが必須。

---

## モジュール評価

### app/_layout.tsx
**Score: 9/10**

| 項目 | 評価 |
|------|------|
| 構造 | 良好 - Stack navigation正しく設定 |
| フォント | M PLUS Rounded 1c正しく読み込み |
| スタイル | 一貫性あり、ブランドカラー使用 |

**Issues**: なし

**Good**:
- Line 16-22: フォント読み込み中のローディング表示が適切
- Line 46-51: 調理モードのダークテーマ設定が仕様通り

---

### app/index.tsx
**Score: 8/10**

| 項目 | 評価 |
|------|------|
| カテゴリフィルター | 正常動作 |
| 空状態 | 良好なUX |
| 月間カウント | 表示されている |

**Issues**:
1. Line 139: `AdBanner`を表示しているが広告SDKが未実装のためプレースホルダーのみ
2. エラーハンドリングなし - `getRecipes()`失敗時のフォールバックがない

**Recommendations**:
- 広告SDK実装前は`AdBanner`を条件付きレンダリングにすべき

---

### app/add.tsx
**Score: 7/10**

| 項目 | 評価 |
|------|------|
| マルチプラットフォーム対応 | 良好 |
| ステータスメッセージ | UX向上に貢献 |
| 編集UI | 機能的 |

**Issues**:
1. Line 186-208: **バリデーション不足** - `title`が空でも保存可能
2. Line 64-74: 月間制限チェックはあるが、`hasUnlimited`が常に`false`（IAP未実装のため）
3. Line 127-133: 字幕取得が`fetchCaptions`を使用 - **App Store審査リスク**（後述）

**Critical Path**:
```typescript
// add.tsx:127 呼び出し
captions = await fetchCaptions(vid);
// → utils/captions.ts がYouTube HTMLをスクレイピング
```

**Recommendations**:
- 保存前にtitleとstepsの最低限のバリデーション追加
- 字幕取得を無効化または代替手段に変更

---

### app/recipe/[id].tsx
**Score: 6/10**

| 項目 | 評価 |
|------|------|
| レイアウト | 基本的なレシピ表示OK |
| アクションボタン | 揃っている |
| 動画埋め込み | **未実装** |

**Issues**:
1. **仕様不足**: CLAUDE.mdでは「サムネイル + 動画タイトル表示」と「各ステップにオプションでタイムスタンプ（タップで動画の該当箇所へ）」とあるが、`YouTubePlayer`コンポーネントが使われていない
2. Line 59-61: `handleToggleFavorite`実行後にUIが更新されない（`recipe`オブジェクトが古いまま）
3. Line 66: サムネイル画像のエラーハンドリングなし（404時に何も表示されない）

**Recommendations**:
```typescript
// 修正案: お気に入り後にrefresh
const handleToggleFavorite = async () => {
  await toggleFavorite(recipe.id);
  // リロードが必要
};
```
- `YouTubePlayer`を追加し、ステップのタイムスタンプからジャンプ機能を実装

---

### app/cooking/[id].tsx
**Score: 7/10**

| 項目 | 評価 |
|------|------|
| スリープ防止 | `useKeepAwake()`正しく使用 |
| 大文字表示 | 実装済み |
| タイマー | 表示・動作OK |
| プログレスバー | 良好 |

**Issues**:
1. **音声操作未実装**: CLAUDE.mdの「調理モードPro: 音声操作」が未実装（expo-speechも未インストール）
2. Line 98-105: ドットナビゲーションがタップ不可（視覚的フィードバックのみ）
3. タイムスタンプからYouTube動画ジャンプ機能なし

**Recommendations**:
- P3として音声操作は後回し可
- ドットをタップ可能にしてステップジャンプを追加

---

### app/shopping.tsx
**Score: 6/10**

| 項目 | 評価 |
|------|------|
| リスト表示 | グループ化OK |
| チェック機能 | 正常動作 |
| 削除 | 確認ダイアログあり |

**Issues**:
1. **仕様違反**: CLAUDE.mdでは買い物リストはPro機能（¥160）だが、**ロックされていない**
2. `LockedOverlay`コンポーネントが存在するが使用されていない
3. Line 17-18: `loading`状態が使われていない（ローディング表示なし）

**Critical**:
```typescript
// 現状: 誰でもアクセス可能
export default function ShoppingScreen() { ... }

// 修正案:
const { hasShoppingList } = usePurchase();
if (!hasShoppingList) return <LockedOverlay />;
```

---

### app/pro.tsx
**Score: 8/10**

| 項目 | 評価 |
|------|------|
| 商品一覧 | 適切に表示 |
| 機能比較表 | 分かりやすい |
| モック購入 | 開発用として適切 |

**Issues**:
1. Line 99: 「開発版のため、購入はモック」と明記されているのは良いが、本番では削除必要
2. Restore Purchases機能なし（App Store審査必須要件）

**Recommendations**:
- `react-native-iap`導入時に`restorePurchases`を追加

---

### hooks/useRecipes.ts
**Score: 7/10**

**Issues**:
1. 全ての非同期操作にtry-catchなし
2. Line 34-40: `addRecipe`で`incrementMonthlyCount`を呼ぶが、保存失敗時もカウントが増える

**Recommendations**:
```typescript
// 修正案
const addRecipe = async (recipe: Recipe) => {
  try {
    await saveRecipe(recipe);
    await incrementMonthlyCount();
    await loadRecipes();
  } catch (e) {
    // エラー処理
  }
};
```

---

### hooks/usePurchase.ts
**Score: 7/10**

**Issues**:
1. モックIAPは開発用として適切だが、本番用のコード分岐なし
2. `restorePurchases`機能なし（App Store必須）
3. Line 76-80: `checkPurchased`がasyncだが使われていない

**Good**:
- Line 83-93: バンドル購入のロジックが正しい

---

### utils/youtube.ts
**Score: 8/10**

**Good**:
- Line 33-37: API Key未設定時のoEmbedフォールバックが適切
- Line 64-87: oEmbedでも最低限の情報取得

**Issues**:
1. エラーの種類を区別していない（ネットワークエラー vs API制限）

---

### utils/parser.ts
**Score: 9/10**

**Excellent**:
- Line 25-58: 日本語の材料パターンが網羅的
- Line 102-108: `parseDescription`がセクション分割を正しく処理
- Line 574-615: `smartParse`の説明文→字幕フォールバックロジックが賢い
- Line 625-640: タイマー検出（X分, X秒）が正確

**Minor Issues**:
1. テストがない（このロジックは単体テスト必須）

---

### utils/storage.ts
**Score: 7/10**

**Issues**:
1. Line 33-35: JSON.parseのtry-catchなし - 破損データでクラッシュの可能性
2. データマイグレーション戦略なし（スキーマ変更時に問題）

**Recommendations**:
```typescript
export async function getRecipes(): Promise<Recipe[]> {
  try {
    const json = await AsyncStorage.getItem(RECIPES_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return []; // 破損時は空配列
  }
}
```

---

### utils/captions.ts
**Score: 3/10** - **CRITICAL**

**BLOCKER**:
Line 17-42: YouTubeページのHTMLを直接フェッチし、`ytInitialPlayerResponse`をパースして字幕URLを取得している。

```typescript
// Line 18-19: HTMLスクレイピング
const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
const response = await fetch(pageUrl, { ... });
```

**問題点**:
1. **YouTube利用規約違反**: YouTubeの非公式APIアクセス
2. **App Store審査リスク**: スクレイピングはAppleの審査で問題視される可能性大
3. **脆弱性**: YouTubeがHTML構造を変更すると即座に壊れる
4. CLAUDE.mdの「なぜ字幕APIを使わないか」セクションで「非公式スクレイピングはApp Store審査リスク」と明記されているのに実装されている

**Recommendations**:
- **この機能を削除または無効化する**
- 代替案: 説明文パースのみに頼り、字幕は「手動入力を促す」UIを強化

---

### utils/recipe-scraper.ts
**Score: 7/10**

**Good**:
- JSON-LDの標準的なSchema.org Recipe抽出

**Issues**:
1. Line 18-22: カスタムUser-Agent "MiruRecipe" - 一部サイトでブロックされる可能性
2. CORSポリシー: iOSアプリからの直接fetchは多くのサイトで失敗する可能性（サーバープロキシが必要かも）

---

### utils/tiktok.ts
**Score: 8/10**

**Good**:
- 公式oEmbed APIを使用（適切なアプローチ）
- 最小限のスコープ

---

### utils/platform.ts
**Score: 9/10**

**Good**:
- 包括的なプラットフォーム検出
- Line 39-48: 日本の主要レシピサイトを網羅

---

### data/categories.ts
**Score: 9/10**

**Good**:
- シンプルで拡張しやすい
- ヘルパー関数が便利

---

### components/ (全体)
**Score: 8/10**

| Component | Score | Notes |
|-----------|-------|-------|
| RecipeCard.tsx | 9/10 | アニメーション良好、PlatformBadge統合 |
| StepView.tsx | 8/10 | タイムスタンプクリック対応 |
| TimerButton.tsx | 9/10 | 振動フィードバック良い |
| IngredientList.tsx | 9/10 | 人数調整機能が優秀 |
| YouTubePlayer.tsx | 6/10 | 実装はあるが使われていない |
| AdBanner.tsx | 5/10 | プレースホルダーのみ |
| LockedOverlay.tsx | 8/10 | 実装済みだが使われていない |
| PlatformBadge.tsx | 9/10 | クリーンな実装 |

---

## 優先度付き実装タスク

### P0 (ブロッカー) - App Store提出を阻む問題

| Task | File | Description |
|------|------|-------------|
| **字幕スクレイピング削除** | utils/captions.ts | YouTube HTMLスクレイピングを完全に削除し、説明文パースのみに依存。smartParseで字幕がない場合のフォールバックUIを強化 |
| **IAP実装** | package.json, hooks/usePurchase.ts | `react-native-iap`をインストールし、実際のApp Store Connect商品と連携 |
| **Restore Purchases** | hooks/usePurchase.ts, app/pro.tsx | 購入復元機能を追加（App Store審査必須） |
| **広告SDK** | package.json, components/AdBanner.tsx | `react-native-google-mobile-ads`実装、または広告なしでリリースする場合はAdBannerを削除 |

### P1 (重要) - コア機能の完成度

| Task | File | Description |
|------|------|-------------|
| 買い物リストのロック | app/shopping.tsx | `LockedOverlay`を使用して未購入ユーザーをブロック |
| レシピ詳細に動画埋め込み | app/recipe/[id].tsx | `YouTubePlayer`を追加、タイムスタンプジャンプを実装 |
| お気に入りUI更新 | app/recipe/[id].tsx | toggleFavorite後にstateをリフレッシュ |
| 保存前バリデーション | app/add.tsx | title必須、steps最低1件など |
| エラーハンドリング追加 | hooks/useRecipes.ts, utils/storage.ts | try-catchと破損データ対策 |

### P2 (改善) - UX/品質向上

| Task | File | Description |
|------|------|-------------|
| 調理モードのドットタップ | app/cooking/[id].tsx | ドットをタップしてステップジャンプ |
| 画像エラー表示 | app/recipe/[id].tsx, RecipeCard.tsx | サムネイル404時のプレースホルダー |
| ローディング状態表示 | app/shopping.tsx | `loading`状態の活用 |
| オフライン対応 | 全体 | ネットワークエラー時のキャッシュ表示 |

### P3 (後回し) - あれば嬉しい

| Task | File | Description |
|------|------|-------------|
| 音声操作 | app/cooking/[id].tsx | expo-speech導入、「次へ」音声コマンド |
| シェア機能 | app/recipe/[id].tsx | expo-sharingを使ったレシピ共有 |
| 検索機能 | app/index.tsx | タイトル・材料での絞り込み |
| レシピのエクスポート/インポート | utils/storage.ts | バックアップ・復元機能 |

---

## 設計上の懸念点

### 1. 字幕取得アーキテクチャ

現在の実装:
```
User → add.tsx → captions.ts → YouTube HTML (scraping) → Parse captions
```

推奨アーキテクチャ:
```
User → add.tsx → parser.ts (description only) → Manual input prompt if sparse
```

### 2. AsyncStorage のスケーラビリティ

現在、全レシピを`JSON.stringify`で1つのキーに保存。レシピが100件を超えると:
- 読み込み遅延
- メモリ圧迫

将来的には`expo-sqlite`への移行を検討。

### 3. 状態管理

現在はローカル状態のみ。購入状態などグローバルに必要な状態は`Context`または`zustand`への移行を推奨。

### 4. User-Agentの扱い

`utils/recipe-scraper.ts`と`utils/captions.ts`でカスタムUser-Agentを使用。これはサイトによってはブロックされる。サーバーサイドプロキシを検討すべき。

---

## App Store リスク評価

| リスク | 深刻度 | 詳細 |
|--------|--------|------|
| **YouTube HTMLスクレイピング** | **Critical** | `utils/captions.ts`がYouTubeの利用規約に違反。Appleの審査で発覚した場合、リジェクトまたは将来的なアプリ削除リスク |
| IAP未実装 | High | 課金機能を謳うならIAP必須 |
| Restore Purchases未実装 | High | App Store審査で必須要件 |
| プライバシーポリシー未設定 | Medium | `app.json`にプライバシーポリシーURLなし |
| アセット未確認 | Low | `./assets/icon.png`等が存在するか未確認 |

### YouTube利用規約との整合性

**OK**:
- YouTube Data API v3 (公式、API Key使用) ✅
- YouTube oEmbed API (公式) ✅
- YouTube iFrame embed (公式) ✅

**NG**:
- `utils/captions.ts`のHTML直接フェッチ ❌
- `ytInitialPlayerResponse`のパース ❌

---

## Developer への推奨事項

### 即座に実行すべきこと

1. **`utils/captions.ts`を無効化**
   ```typescript
   // add.tsx の handleYouTubeFetch 内
   // let captions = null; のみにして fetchCaptions を呼ばない
   ```

2. **空のUI対策**
   字幕取得がなくなることで`smartParse`は説明文のみに依存。説明文にレシピがない動画の場合、ユーザーに手動入力を促すUIを強化。

3. **買い物リストのロック**
   ```typescript
   // app/shopping.tsx の冒頭
   const { hasShoppingList } = usePurchase();
   if (!hasShoppingList) {
     return <LockedOverlay message="買い物リストはPro版の機能です" />;
   }
   ```

### 次のスプリントで実行すべきこと

1. `react-native-iap`のインストールと実装
2. App Store Connect での商品登録
3. 購入復元機能の追加
4. 広告SDKの導入または広告スペースの削除

### テスト推奨

- `utils/parser.ts`の単体テスト（様々な説明文フォーマットで検証）
- IAP購入フローのE2Eテスト
- オフライン状態でのアプリ動作確認

---

## まとめ

ミルレシピのコア機能（レシピ取り込み、表示、調理モード）は動作可能な状態にある。UIの完成度は高く、日本語レシピのパース精度も良好。

しかし、**`utils/captions.ts`のYouTube HTMLスクレイピングはApp Store提出前に必ず削除すべき重大な問題**である。この問題を修正し、IAP/広告を実装すれば、App Store提出に向けた準備が整う。

完成度65%の内訳:
- UI/UX: 80%
- コア機能: 75%
- 収益化: 10% (モックのみ)
- App Store準拠: 40%
