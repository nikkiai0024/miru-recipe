# DEV_LOG.md - Developer実装ログ

## P0-1: utils/captions.ts スクレイピング無効化

**変更ファイル:** `utils/captions.ts`, `app/add.tsx`

- `fetchCaptions` 関数からYouTube HTMLスクレイピングコードを完全削除。常に `null` を返すスタブ関数に置換
- `app/add.tsx` で `fetchCaptions` の呼び出しを削除。`smartParse` に `null` を渡して説明文パースのみに依存
- 字幕関連のimport (`fetchCaptions`, `parseCaptions`) と `captionsAvailable` stateを削除
- UIメッセージ更新: 「動画の説明欄からレシピを取得しました」/ 「説明欄にレシピ情報が見つかりませんでした。手動で入力してください。」
- 未使用import `ytExtractVideoId` も整理

## P0-2: IAP実装 (expo-iap)

**変更ファイル:** `hooks/usePurchase.ts`, `app/pro.tsx`, `package.json`

- `expo-iap` をインストール (`npx expo install expo-iap`)
- `hooks/usePurchase.ts` を完全書き換え: TypeLinkパターンに基づく本番IAP実装
  - `useIAP` hook使用（`onPurchaseSuccess`, `onPurchaseError` コールバック）
  - `PurchaseState` を `Record<ProductId, boolean>` で管理
  - `__DEV__` 時はモック購入（StoreKit不要）、本番ではリアルStoreKit
  - `restorePurchases` 関数を実装（App Store審査必須）
  - `availablePurchases` 変更時に自動同期
  - バンドル購入時は全プロダクトをアンロック
- `app/pro.tsx` に「購入を復元」ボタンを追加
- `pro.tsx` の購入状態チェックを新 `PurchaseState` 型に対応

## P1-1: 買い物リストのロック実装

**変更ファイル:** `app/shopping.tsx`

- `usePurchase` の `hasShoppingList` で購入状態を確認
- 未購入時は `<LockedOverlay>` を表示（メッセージ: 「買い物リスト機能はPro版で利用できます」）

## P1-2: レシピ詳細にYouTubePlayer追加

**変更ファイル:** `app/recipe/[id].tsx`, `components/YouTubePlayer.tsx`

- `YouTubePlayer` コンポーネントを `forwardRef` に対応
- `recipe.videoId` がある場合、サムネイル画像の代わりにYouTubeプレイヤーを表示
- `StepView` の `onTimestampPress` を接続し、タイムスタンプタップで `seekTo` を呼び出し

## P1-3: お気に入りUI更新バグ修正

**変更ファイル:** `app/recipe/[id].tsx`

- `isFavorite` のローカルstateを追加
- `handleToggleFavorite` 実行後に `setIsFavorite` で即座にUIを更新
- ハートアイコンが `currentIsFavorite` を参照するよう変更

## P1-4: 保存前バリデーション

**変更ファイル:** `app/add.tsx`

- `handleSave` にバリデーション追加:
  - `title` が空 → 「タイトルを入力してください」
  - `steps` が0件 → 「手順を1つ以上追加してください」
- `Alert.alert` でエラーメッセージ表示

## P1-5: エラーハンドリング強化

**変更ファイル:** `utils/storage.ts`, `hooks/useRecipes.ts`

- `getRecipes`, `getPurchases`, `getShoppingList` に `try-catch` 追加（`JSON.parse` 失敗時は空配列を返す）
- `useRecipes.ts` の `addRecipe`: `saveRecipe` を `try-catch` で囲み、失敗時はエラーをスローして `incrementMonthlyCount` を実行しない

## TypeScript (Round 1-2)

- `npx tsc --noEmit` パス確認済み（エラーなし）

---

## Round 3

### R3-1: AdBanner削除（広告なしでリリース）

**変更ファイル:** `components/AdBanner.tsx`(削除), `app/index.tsx`

- `components/AdBanner.tsx` をファイルごと削除
- `app/index.tsx` から `AdBanner` のimportとJSX使用箇所を削除
- `package.json` に `react-native-google-mobile-ads` は元々なし → 変更不要

### R3-2: 調理モードPro付加価値実装

**変更ファイル:** `app/cooking/[id].tsx`, `hooks/usePurchase.ts`, `package.json`

- `expo-speech` をインストール
- ステップ変更時に `Speech.speak(step.text, { language: "ja-JP" })` で自動読み上げ
- 読み上げON/OFFトグルボタンをヘッダーに追加（🔊/🔇）
- `hasCookingPro` で購入状態を確認（Pro購入者のみ音声・タッチゾーン利用可能）
- コンポーネントunmount時に `Speech.stop()` でクリーンアップ
- タッチゾーンナビゲーション: 画面左1/3→前、右1/3→次、中央1/3はUI用
- `pointerEvents="box-none"` で中央エリアのタイマーボタンへのタップを透過
- PRODUCT_INFO の調理モードPro説明を更新

### R3-3: 編集画面にYouTube小窓表示

**変更ファイル:** `app/add.tsx`

- `react-native-youtube-iframe` の `YoutubePlayer` を編集画面上部に表示（height=200）
- `videoId` がある場合のみ表示（YouTube動画取得後）
- 「動画を見ながらステップを入力できます」ヒントテキスト追加
- 「+ ステップを追加」ボタンを目立つオレンジ塗りつぶしスタイルに変更

### R3-4: プリセットレシピ5品

**変更ファイル:** `data/preset-recipes.ts`(新規), `hooks/useRecipes.ts`, `utils/storage.ts`

- 肉じゃが、唐揚げ、カレーライス、親子丼、チャーハンの5品を定義
- 各レシピに実用的な材料・手順・タイマー秒数を設定
- `utils/storage.ts` に `isInitialized` / `setInitialized` ヘルパー追加
- `useRecipes.ts` の `loadRecipes` に初回起動チェック追加: 保存レシピ0件時にプリセットを自動保存
- `@initialized` フラグで2回目以降はスキップ

### TypeScript (Round 3)

- `npx tsc --noEmit` パス確認済み（エラーなし）

## AdBanner 復元（Round 3 修正）

**変更ファイル:** `components/AdBanner.tsx`(新規), `app/index.tsx`, `app.json`, `package.json`

- `react-native-google-mobile-ads` をインストール
- `app.json` の plugins にテスト用App ID設定を追加（androidAppId, iosAppId）
- `components/AdBanner.tsx` を再作成:
  - `BannerAd` + `BannerAdSize.ANCHORED_ADAPTIVE_BANNER` 使用
  - `__DEV__` 時は `TestIds.ADAPTIVE_BANNER`、本番は要差し替えプレースホルダー
  - `onAdFailedToLoad` でエラーをサイレント処理
- `app/index.tsx` にAdBannerを復元（FlatListとフッターの間に配置）
