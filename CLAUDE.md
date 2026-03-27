# CLAUDE.md - ミルレシピ (MiruRecipe)

## アプリ概要
**ミルレシピ** - YouTube料理動画をテキストレシピに変換するアプリ

「料理動画を見ながら料理すると、自分のペースと動画が合わなくて何度も巻き戻す」問題を解決。
動画URLを入れるだけで、読みやすいテキストレシピに変換。自分のペースで料理できる。

## 競合との差別化

**CookGo**（既存競合 4.6★）: URL→AIレシピ保存。汎用的なブックマーク型。
**ミルレシピの独自性**:
1. YouTube料理動画に特化（汎用じゃなく専門）
2. タイムスタンプ付きステップ（動画の該当部分にジャンプ可能）
3. 調理モード: 手が汚れていても大きな文字 + 音声で「次」と言えば次のステップへ
4. タイマー内蔵: レシピ内の「3分煮る」を自動検出してタイマーボタン設置
5. 買い物リスト: 材料を自動抽出 → チェックリスト化

## 技術アプローチ（App Store安全）

### レシピ取得の3段階
1. **YouTube Data API v3**: 動画タイトル + 説明文を取得（多くの料理チャンネルは説明欄にレシピ記載）
2. **説明文パース**: 材料・手順をAI/パターンマッチで構造化
3. **手動補完**: 説明文にレシピがない場合、ユーザーが手入力 or 音声入力で追加

### YouTube APIの使い方
- API Key方式（OAuth不要、読み取り専用）
- 無料枠: 10,000ユニット/日（個人アプリには十分）
- 取得するデータ: snippet（タイトル、説明文、サムネイル）のみ
- 動画再生: YouTube iFrame embed（公式、規約準拠）

### なぜ字幕APIを使わないか
- captions.downloadはOAuth + 動画所有者権限が必要
- 非公式スクレイピングはApp Store審査リスク
- 代わりに: 説明文パース + 手動入力で十分なUXを実現

## 主要機能

### 1. レシピ取り込み
- YouTube URLをペースト or シェアシートから受信
- 動画情報を取得 → 説明文からレシピ自動抽出
- 抽出結果をユーザーが編集可能

### 2. レシピ表示
- 材料リスト（分量つき）
- 手順（番号付きステップ）
- 各ステップにオプションでタイムスタンプ（タップで動画の該当箇所へ）
- サムネイル + 動画タイトル表示

### 3. 調理モード（★独自機能）
- 画面スリープ防止
- 大きな文字表示（手が汚れていても見やすい）
- 現在のステップをハイライト
- 「次へ」「前へ」の大きなボタン
- タイマーボタン（「3分煮る」→ タップで3分タイマー起動）

### 4. 買い物リスト
- レシピから材料を自動抽出
- チェックリスト形式
- 複数レシピの材料をまとめて表示可能

### 5. レシピ管理
- お気に入り保存
- カテゴリ分け（和食/洋食/中華/お菓子 etc）
- 検索

## 収益化: ティアード買い切り

### 無料（広告あり）
- レシピ取り込み（月5件まで）
- 基本レシピ表示
- 調理モード（ベーシック）

### 有料アンロック
| 機能 | 価格 | プロダクトID |
|------|------|-------------|
| 無制限レシピ取り込み | ¥320 | `com.mirurecipe.unlimited` |
| 調理モードPro（音声操作+タイマー） | ¥160 | `com.mirurecipe.cooking_mode` |
| 買い物リスト機能 | ¥160 | `com.mirurecipe.shopping_list` |
| **全部入りバンドル** | **¥480** | `com.mirurecipe.pro_bundle` |

## 技術スタック

- **React Native + Expo** (TypeScript)
- **expo-router** - ナビゲーション
- **react-native-iap** - In-App Purchase
- **react-native-google-mobile-ads** - 広告
- **expo-av** or **react-native-youtube-iframe** - YouTube動画埋め込み
- **expo-sharing** - レシピシェア
- **expo-keep-awake** - 調理モード中のスリープ防止
- **expo-speech** - 音声操作（調理モードPro）
- **@react-native-async-storage/async-storage** - ローカルデータ保存

## 画面一覧

1. **ホーム画面** - 保存済みレシピ一覧 + 「レシピ追加」ボタン
2. **レシピ追加画面** - URL入力 → 自動取得 → 編集
3. **レシピ詳細画面** - 材料 + 手順 + 動画プレビュー
4. **調理モード画面** - 大きなステップ表示 + タイマー
5. **買い物リスト画面** - 材料チェックリスト
6. **Pro画面** - 購入オプション

## デザイン方針

- **カラー**: メイン `#FF6B35`（オレンジ）+ 背景 `#FFF8F0`（暖色系クリーム）
- **トーン**: 温かみ + 実用的。キッチンにいる感じ
- **調理モード**: ダークモード（油はね対策 + 見やすさ）
- **フォント**: システムフォント、調理モードでは特大サイズ

## ディレクトリ構成
```
recipe-app/
├── app/
│   ├── index.tsx          # ホーム（レシピ一覧）
│   ├── add.tsx            # レシピ追加
│   ├── recipe/[id].tsx    # レシピ詳細
│   ├── cooking/[id].tsx   # 調理モード
│   ├── shopping.tsx       # 買い物リスト
│   └── pro.tsx            # 購入画面
├── data/
│   └── categories.ts     # カテゴリ定義
├── components/
│   ├── RecipeCard.tsx     # レシピカード
│   ├── StepView.tsx       # ステップ表示
│   ├── TimerButton.tsx    # タイマーボタン
│   ├── IngredientList.tsx # 材料リスト
│   ├── YouTubePlayer.tsx  # YouTube埋め込み
│   ├── AdBanner.tsx       # 広告
│   └── LockedOverlay.tsx  # ロック表示
├── hooks/
│   ├── usePurchase.ts     # IAP管理
│   └── useRecipes.ts      # レシピCRUD
├── utils/
│   ├── youtube.ts         # YouTube API連携
│   ├── parser.ts          # 説明文→レシピ変換
│   └── storage.ts         # AsyncStorage管理
└── CLAUDE.md
```

## 実装タスク

### Phase 1: コア機能
1. expo-router セットアップ + 全画面作成
2. YouTube API連携（`utils/youtube.ts`）: URLからvideoId抽出 → API呼び出し → snippet取得
3. 説明文パーサー（`utils/parser.ts`）: テキストから材料・手順を自動抽出
4. レシピ追加画面: URL入力 → 取得 → 編集 → 保存
5. レシピ一覧 + 詳細画面
6. AsyncStorageでのレシピ保存

### Phase 2: 調理モード
7. 調理モード画面: 大文字ステップ表示
8. スリープ防止（expo-keep-awake）
9. タイマー機能（ステップ内の時間を検出）
10. YouTube動画埋め込み（タイムスタンプジャンプ）

### Phase 3: 収益化
11. react-native-iap セットアップ
12. 購入画面
13. 無料制限（月5件）のカウント
14. 広告統合

### Phase 4: 追加機能
15. 買い物リスト
16. カテゴリ・検索
17. 調理モードPro（音声操作）

## 注意事項

- YouTube API Key はアプリにハードコードせず、expo-constants の extra で管理
- YouTube利用規約: 動画の再生は公式iframe embed のみ使用、ダウンロード・スクレイピングしない
- 月5件制限: AsyncStorageで月ごとのカウント管理
- オフライン対応: 保存済みレシピはオフラインで閲覧可能（動画以外）

## YouTube API Key
- Google Cloud Console で YouTube Data API v3 を有効化
- API Keyを発行してapp.jsonのextra.youtubeApiKeyに設定
- 開発中はダミーデータでテスト可能にする（API Key未設定時のフォールバック）
