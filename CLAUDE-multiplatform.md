# マルチプラットフォーム対応 追加実装

## 概要
現在YouTube専用のレシピ取得を、YouTube Shorts / TikTok / Cookpad / その他レシピサイトに拡張する。

## 対応プラットフォーム

### 1. YouTube（既存）
- URL: `youtube.com/watch?v=XXX`, `youtu.be/XXX`
- 取得: YouTube Data API v3（description + snippet）
- 追加: **自動字幕取得**（youtube-captions-scraper方式）

### 2. YouTube Shorts（新規）
- URL: `youtube.com/shorts/XXX`
- 取得: 同じYouTube Data API（shortsも通常動画と同じvideoId）
- URLからvideoIdを抽出するパターンを追加するだけ

### 3. TikTok（新規）
- URL: `tiktok.com/@user/video/XXX`
- 取得: oEmbed API `https://www.tiktok.com/oembed?url=URL`
- 返却: `{ title, author_name, thumbnail_url }`
- 注意: 動画キャプション（テキスト）は取得不可 → 手動入力がメイン
- 動画再生: WebView で TikTok embed

### 4. Cookpad（新規）
- URL: `cookpad.com/recipe/XXXX`
- 取得: HTMLフェッチ → Schema.org Recipe JSON-LD抽出
- JSON-LDから直接: name, ingredients, instructions, cookTime, prepTime, image
- 最も構造化されたデータが取れるプラットフォーム

### 5. その他レシピサイト（新規）
- クラシル、DELISH KITCHEN、macaroni 等
- 取得: HTMLフェッチ → JSON-LD `@type: "Recipe"` を検出
- フォールバック: OGP tags（title, description, image）
- JSON-LDがなければ手動入力

## 実装タスク

### 1. URL判定ユーティリティ: `utils/platform.ts`（新規）
```typescript
type Platform = 'youtube' | 'youtube_shorts' | 'tiktok' | 'cookpad' | 'recipe_site' | 'unknown';

function detectPlatform(url: string): Platform;
function extractVideoId(url: string): string | null; // YouTube/Shorts用
```

### 2. TikTok連携: `utils/tiktok.ts`（新規）
```typescript
interface TikTokMeta { title: string; author: string; thumbnail: string; }
async function fetchTikTokMeta(url: string): Promise<TikTokMeta>;
```

### 3. レシピサイトスクレイパー: `utils/recipe-scraper.ts`（新規）
```typescript
interface ScrapedRecipe {
  title: string;
  image?: string;
  ingredients: { name: string; amount: string }[];
  steps: { text: string; duration?: number }[];
  cookTime?: string;
  servings?: string;
  source: string;
}
async function scrapeRecipeSite(url: string): Promise<ScrapedRecipe | null>;
// HTMLフェッチ → JSON-LD抽出 → パース
```

### 4. YouTube字幕取得: `utils/captions.ts`（新規）
```typescript
interface Caption { start: number; dur: number; text: string; }
async function fetchCaptions(videoId: string, lang?: string): Promise<Caption[]>;
// YouTube Innertube API経由で自動生成字幕を取得
// 失敗時はnull返却（フォールバック用）
```

### 5. 統合パーサー更新: `utils/parser.ts`（更新）
- 字幕テキストからレシピを抽出するロジック追加
- Schema.org JSON-LDのRecipeオブジェクトをパースするロジック追加

### 6. レシピ追加画面更新: `app/add.tsx`（更新）
- URL入力時にプラットフォーム自動判定 → アイコン表示
- プラットフォーム別の取得フロー呼び分け
- Cookpad等は自動抽出結果をそのまま表示
- TikTokは「手動入力してください」のガイド表示

### 7. プラットフォームバッジ: `components/PlatformBadge.tsx`（新規）
- YouTube（赤）/ Shorts（赤+縦長アイコン）/ TikTok（黒）/ Cookpad（オレンジ）/ Other（グレー）
- レシピカードとレシピ詳細画面に表示

### 8. レシピデータモデル更新
```typescript
interface Recipe {
  id: string;
  title: string;
  platform: Platform;
  sourceUrl: string;
  videoId?: string;         // YouTube/Shorts用
  thumbnail?: string;
  ingredients: Ingredient[];
  steps: Step[];
  category: string;
  createdAt: number;
  // 新規フィールド
  captionsAvailable?: boolean;
  servings?: string;
  cookTime?: string;
  prepTime?: string;
}
```

## インストールするパッケージ
- なし（fetch APIとWebViewで実装可能。字幕取得も自前実装）

## 注意事項
- Cookpad HTMLフェッチ: CORSの問題はReact Native（非ブラウザ）なので発生しない
- TikTok oEmbed: レート制限なし（公式API）
- YouTube字幕: 非公式ルートなので graceful degradation 必須
- Schema.org JSON-LD: パース失敗時は手動入力にフォールバック
