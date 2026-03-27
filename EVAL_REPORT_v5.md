# ミルレシピ 品質評価レポート v5
**評価日**: 2026-03-15
**評価者**: Claude Opus 4.6（第三者視点）
**対象**: recipe-app メインブランチ全ファイル

---

## A. 主要機能

| カテゴリ | 項目 | 判定 | 確認方法 | 問題点 |
|---------|------|------|---------|--------|
| YouTube取り込み | URL入力→動画情報取得 | ✅ | `utils/youtube.ts` L14-87, `app/add.tsx` L132-194 | YouTube/Shorts/embed全形式対応。API未設定時はoEmbedフォールバックあり |
| YouTube取り込み | 説明文→レシピ自動抽出 | ✅ | `utils/parser.ts` L103-619 | 材料・手順・タイマー・タイムスタンプ検出。複数パターン対応 |
| YouTube取り込み | AI字幕解析（Firebase） | ✅ | `utils/firebase.ts`, `utils/transcript.ts` | Firebase Functions経由でGemini解析。説明文不足時のフォールバック |
| クックパッド取り込み | URL→レシピ抽出 | ⚠️ | `utils/recipe-scraper.ts`, `utils/platform.ts` L33-36 | 汎用JSON-LDスクレーパーのみ。Cookpad固有のパース無し。サイレント失敗リスク高 |
| レシピCRUD | 作成 | ✅ | `utils/storage.ts` L52-61 | AsyncStorage upsert方式。正常動作 |
| レシピCRUD | 読み取り | ✅ | `utils/storage.ts` L32-47, `hooks/useRecipes.ts` | 一覧・個別取得。プリセットレシピの初回自動読込あり |
| レシピCRUD | 更新 | ✅ | `app/edit/[id].tsx` L70-89 | 材料・手順・カテゴリ・人数すべて編集可 |
| レシピCRUD | 削除 | ✅ | `app/recipe/[id].tsx` L65-77 | 確認ダイアログ付き |
| カテゴリ | 定義・フィルタリング | ✅ | `data/categories.ts`, `app/index.tsx` L31-36 | 11カテゴリ（絵文字付き）。ホーム画面で切替 |
| お気に入り | トグル・フィルタ | ✅ | `utils/storage.ts` L75-82, `app/index.tsx` L34-35 | 専用カテゴリ「お気に入り」で表示 |
| 調理モード | 大文字ステップ表示 | ✅ | `app/cooking/[id].tsx` L315 | 28pxフォント。ダーク背景(#1a1a1a) |
| 調理モード | ステップ送り/戻り | ✅ | `app/cooking/[id].tsx` L188-220 | ボタン + タッチゾーン（Pro） |
| 調理モード | スリープ防止 | ✅ | `app/cooking/[id].tsx` L19 | expo-keep-awake使用 |
| 調理モード | タイマー自動検出 | ✅ | `app/cooking/[id].tsx` L96-105 | 「○分」「○秒」をパースしTimerButton表示 |
| 調理モード | 音声読み上げ（Pro） | ✅ | `app/cooking/[id].tsx` L29-39 | expo-speech。unmount時クリーンアップあり |
| 買い物リスト | 材料自動抽出 | ✅ | `utils/storage.ts` L190-205 | レシピ材料からチェックリスト生成 |
| 買い物リスト | 複数レシピ統合表示 | ✅ | `app/shopping.tsx` L95-105 | レシピ名別グループ表示 |
| 買い物リスト | チェック/削除/クリア | ✅ | `app/shopping.tsx` L35-92 | 個別・グループ・一括操作。確認ダイアログ付き |
| 人数調整 | 分量スケーリング | ✅ | `components/IngredientList.tsx` L14-49 | 整数/分数/小数/大さじ/適量対応。1-10人分。useMemo最適化 |

---

## B. UI/UX

| カテゴリ | 項目 | 判定 | 確認方法 | 問題点 |
|---------|------|------|---------|--------|
| フォント統一 | 全画面でBIZUDGothic使用 | ⚠️ | `app/_layout.tsx` L4-14, 全画面StyleSheet | 全画面・全コンポーネントでfontFamily指定あり。ただし**重複fontFamily宣言が13箇所以上**（後述TSエラー） |
| 空状態表示 | レシピ一覧（空） | ✅ | `app/index.tsx` L94-116 | 絵文字(🍳🥘🍰) + メッセージ + CTAボタン |
| 空状態表示 | お気に入り（空） | ✅ | `app/index.tsx` L100-102 | ⭐絵文字 + 専用メッセージ |
| 空状態表示 | 買い物リスト（空） | ✅ | `app/shopping.tsx` L119-126 | 🛒絵文字 + ガイドメッセージ |
| 空状態表示 | 手順なし | ✅ | `app/recipe/[id].tsx` L162, `app/cooking/[id].tsx` L83-88 | 適切なフォールバック表示 |
| エラーハンドリング | API取得失敗 | ✅ | `app/add.tsx` L105-129 | try-catch + Alert.alert でユーザー通知 |
| エラーハンドリング | 入力バリデーション | ✅ | `app/add.tsx` L237,241, `app/edit/[id].tsx` L72,76 | タイトル・手順の未入力チェック |
| エラーハンドリング | 音声API失敗 | ⚠️ | `app/cooking/[id].tsx` L34-38,53-57,68-71 | console.warnのみ。**ユーザーへの通知なし** |
| エラーハンドリング | 買い物リスト操作 | ⚠️ | `app/shopping.tsx` L25-41,57-61 | **try-catchなし**。AsyncStorage失敗時にクラッシュリスク |
| ローディング | フォント読込中 | ✅ | `app/_layout.tsx` L16-22 | ActivityIndicator (#FF6B35) |
| ローディング | レシピ一覧読込 | ✅ | `app/index.tsx` L38-43 | ActivityIndicator (large) |
| ローディング | レシピ詳細読込 | ✅ | `app/recipe/[id].tsx` L49-55 | スピナー + Not Found状態 |
| ローディング | URL取得中 | ✅ | `app/add.tsx` L356-361 | "動画情報を取得中..." + スピナー |
| SafeArea | 調理モード | ✅ | `app/cooking/[id].tsx` L10,20,187 | useSafeAreaInsets で bottom padding |
| SafeArea | ホーム画面 | ❌ | `app/index.tsx` | **SafeAreaView未使用。ノッチ端末で切れる可能性** |
| SafeArea | レシピ追加画面 | ❌ | `app/add.tsx` | **SafeAreaView未使用** |
| SafeArea | レシピ詳細画面 | ❌ | `app/recipe/[id].tsx` | **SafeAreaView未使用** |
| SafeArea | 買い物リスト画面 | ❌ | `app/shopping.tsx` | **SafeAreaView未使用** |
| SafeArea | Pro購入画面 | ❌ | `app/pro.tsx` | **SafeAreaView未使用** |
| デザイン統一性 | カラー | ✅ | 全ファイル grep | #FF6B35(メイン), #FFF8F0(背景), #1a1a1a(ダーク) 統一 |
| デザイン統一性 | スペーシング | ✅ | 全ファイル StyleSheet | padding 16/20/24px, margin 8/12/16px で統一 |
| デザイン統一性 | ボーダー半径 | ⚠️ | 全ファイル StyleSheet | 8/12/14/16/20/24px と若干バラつき |

---

## C. 課金（IAP）

| カテゴリ | 項目 | 判定 | 確認方法 | 問題点 |
|---------|------|------|---------|--------|
| 無料制限 | 月5件カウント | ✅ | `utils/storage.ts` L87-104, `hooks/useRecipes.ts` L17 | 年月ベースキーで自動リセット |
| 無料制限 | 制限到達時の通知 | ✅ | `app/add.tsx` L89-99 | Alert + Pro画面への導線 |
| 無料制限 | ホーム画面の残数表示 | ✅ | `app/index.tsx` L150 | "今月 X/5 件" or "∞ 無制限" 表示 |
| 購入フロー | プロダクトID定義 | ✅ | `hooks/usePurchase.ts` L19-44 | 4商品正しく定義 |
| 購入フロー | 購入UI | ✅ | `app/pro.tsx` | 商品カード + 比較表 + 購入ボタン |
| 購入フロー | バンドル処理 | ✅ | `hooks/usePurchase.ts` L114-120 | PRO_BUNDLE購入で3機能同時解放 |
| 購入済み判定 | 永続化 | ✅ | `utils/storage.ts` (AsyncStorage) | `@mirurecipe_purchases_v2` キーで保存 |
| 購入済み判定 | 機能ゲート | ✅ | 各画面 | 買い物リスト(LockedOverlay), 調理Pro, レシピ上限 |
| リストア | ボタン存在 | ✅ | `app/pro.tsx` L80-82 | "購入を復元" ボタン |
| リストア | リストア処理 | ✅ | `hooks/usePurchase.ts` L204-219 | DEV: AsyncStorage復元 / PROD: IAP復元 |
| リストア | エラーハンドリング | ✅ | `hooks/usePurchase.ts` L215-218 | try-catch + ユーザーAlert |
| Expo Go対応 | 条件分岐 | ✅ | `hooks/usePurchase.ts` L6-17 | isExpoGo検出でモック動作 |
| 課金 | 開発用注記の残留 | ⚠️ | `app/pro.tsx` L84-86 | **"開発版のため…モック" テキストが本番でも表示される** |
| 課金 | レシート検証 | ❌ | 未実装 | **サーバーサイドレシート検証なし。不正購入リスク** |

---

## D. セキュリティ

| カテゴリ | 項目 | 判定 | 確認方法 | 問題点 |
|---------|------|------|---------|--------|
| APIキー | YouTube API Key | ⚠️ | `.env` L1 | `.env`に実キー(`AIzaSy...`)あり。.gitignoreに`.env`あり(L42)で**gitには入らない**が、ローカル平文保存 |
| APIキー | app.json内 | ✅ | `app.json` L34 | `youtubeApiKey: ""` 空文字。ハードコードなし |
| APIキー | app.config.js | ✅ | `app.config.js` L41 | `process.env.YOUTUBE_API_KEY` から読込。正しい |
| APP_SECRET | クライアントコード | ❌ | `utils/firebase.ts` L15, `utils/firebaseFunctions.ts` L3 | **`"miru-recipe-secret-2024"` がクライアントコードにハードコード。デコンパイルで露出** |
| APP_SECRET | Firebase Functions | ✅ | `functions/src/index.ts` L9 | `defineSecret("APP_SECRET")` で正しくSecret Manager使用 |
| APP_SECRET | functions/.env.local | ⚠️ | `functions/.env.local` L2 | 実値記載。.gitignoreの`.env*.local`(L34)で除外済み |
| .gitignore | .env除外 | ✅ | `.gitignore` L42-43 | `.env` と `.env.local` を明示的に除外 |
| .gitignore | .firebaserc | ⚠️ | `.gitignore` 確認 | **.firebaserc が.gitignore未記載**。プロジェクトID露出リスク |
| .gitignore | ネイティブキー | ✅ | `.gitignore` L15-19 | .jks/.p8/.p12/.key/.mobileprovision 除外済み |
| Firebase | クレデンシャル管理 | ✅ | `functions/src/index.ts` L9-10 | Secret Manager使用。クライアントにFirebase SDK初期化なし |
| InnerTube | 非公式API使用 | ⚠️ | `utils/transcript.ts` L29-46 | YouTubeのInnerTube内部APIを使用。**規約違反リスク + 突然のAPI変更リスク** |

---

## E. コード品質

| カテゴリ | 項目 | 判定 | 確認方法 | 問題点 |
|---------|------|------|---------|--------|
| TypeScript | tsc --noEmit | ❌ | `npx tsc --noEmit` | **19エラー**: 重複プロパティ17件(TS1117) + 型エラー1件(TS2353) + 不正プロパティ1件 |
| TypeScript | strict mode | ✅ | `tsconfig.json` | `strict: true` 有効 |
| TypeScript | any型乱用 | ✅ | grep確認 | AdBanner/usePurchaseのオプショナルライブラリ読込のみ。正当な使用 |
| 未使用import | 全ファイル | ✅ | grep確認 | 重大な未使用importなし |
| console.log | 本番残留 | ❌ | grep `console\.(log\|warn)` | **17件**: firebase.ts(7件), transcript.ts(4件), cooking/[id].tsx(3件), AdBanner(1件), firebaseFunctions(1件), 計1件のconsole.error |
| console.log | __DEV__ガード | ❌ | grep確認 | **全console.logに`__DEV__`ガードなし** |
| 重複コード | fontFamily二重宣言 | ❌ | tsc出力 | add.tsx(10件), shopping.tsx(3件), pro.tsx(2件), cooking/[id].tsx(1件), recipe/[id].tsx(2件) = **計18件** |
| エラー境界 | React Error Boundary | ❌ | 全ファイル確認 | **Error Boundary未実装**。未捕捉エラーでアプリクラッシュ |
| コード構成 | ディレクトリ構造 | ✅ | ls確認 | CLAUDE.md仕様通りの構成 |
| コード構成 | hooks/utils分離 | ✅ | ファイル確認 | ビジネスロジックの適切な分離 |

---

## 総合スコア

| カテゴリ | スコア | 評価 |
|---------|--------|------|
| A. 主要機能 | **9/10** | ほぼ完璧。Cookpadのみ弱い |
| B. UI/UX | **6/10** | SafeArea未対応が致命的。デザイン統一性は良い |
| C. 課金IAP | **7/10** | 機能は揃うがレシート検証なし・開発テキスト残留 |
| D. セキュリティ | **4/10** | APP_SECRETクライアント露出が致命的 |
| E. コード品質 | **5/10** | TSエラー19件・console.log17件は本番NG |
| **総合** | **6.2/10** | |

---

## 本番ビルド前に対応必須の項目

### 🔴 CRITICAL（リリースブロッカー）

1. **APP_SECRETをクライアントコードから削除**
   - `utils/firebase.ts` L15: `const APP_SECRET = "miru-recipe-secret-2024"` → 削除
   - `utils/firebaseFunctions.ts` L3: 同上 → 削除
   - 代替: Firebase Auth トークンまたはExpo Constants経由で環境変数注入
   - シークレット `miru-recipe-secret-2024` をローテーション（既に露出済みのため）

2. **TypeScriptエラー19件の修正**
   - 重複fontFamilyプロパティ18件を削除（add.tsx, shopping.tsx, pro.tsx, cooking/[id].tsx, recipe/[id].tsx）
   - `_layout.tsx` L27: `height`プロパティの型エラー修正

3. **console.log全件を`__DEV__`ガードで囲む or 削除**
   - `utils/firebase.ts`: 7件のconsole.log
   - `utils/transcript.ts`: 4件のconsole.log
   - 本番ビルドでログ出力はパフォーマンス・セキュリティリスク

### 🟡 HIGH（リリース前に強く推奨）

4. **SafeAreaView対応**（5画面）
   - `app/index.tsx`, `app/add.tsx`, `app/recipe/[id].tsx`, `app/shopping.tsx`, `app/pro.tsx`
   - iPhone X以降のノッチ/Dynamic Island端末で表示崩れ

5. **Pro画面の開発テキスト削除**
   - `app/pro.tsx` L84-86: "開発版のため…モック" → 本番では非表示 or `__DEV__`条件分岐

6. **買い物リスト操作にtry-catch追加**
   - `app/shopping.tsx` L25-41,57-61,70-75: AsyncStorage操作が無防備

7. **.firebaserc を .gitignore に追加**

### 🟢 MEDIUM（品質向上）

8. **React Error Boundary実装** - `app/_layout.tsx`にグローバルエラー境界追加
9. **InnerTube API使用の再検討** - YouTube規約違反リスク。公式APIのみに限定を推奨
10. **サーバーサイドレシート検証** - IAP不正購入防止（App Store審査で指摘される可能性）
11. **Cookpad取り込みの改善 or 機能説明** - 現状の汎用スクレーパーでは信頼性低い

---

*レポート生成: Claude Opus 4.6 / 2026-03-15*
