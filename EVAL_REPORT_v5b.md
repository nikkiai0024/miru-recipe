# ミルレシピ 品質再評価レポート v5b
**評価日**: 2026-03-15
**評価者**: Claude Opus 4.6（第三者視点）
**対象**: EVAL_REPORT_v5.md で指摘された修正対象項目の再評価

---

## 再評価マトリックス

| # | 項目 | 前回 | 今回 | 確認方法 | コメント |
|---|------|------|------|----------|---------|
| 1 | APP_SECRET ハードコード削除 | ❌ | ✅ | `utils/firebase.ts` L17, `utils/firebaseFunctions.ts` L5 | `Constants.expoConfig?.extra?.appSecret ?? ""` に変更済み。ハードコード文字列なし |
| 2 | TypeScript エラー数 | ❌ (19件) | ✅ (0件) | `npx tsc --noEmit` → exit 0 | 全エラー解消。重複プロパティ・型エラーすべて修正済み |
| 3 | console.log `__DEV__`ガード | ❌ (17件ガードなし) | ⚠️ | grep `console\.(log\|warn\|error)` | **firebase.ts**: 全8件 `__DEV__`ガード済み ✅ / **transcript.ts**: 全4件 `__DEV__`ガード済み ✅ / **cooking/[id].tsx**: 全3件 `__DEV__`ガード済み ✅ / **firebaseFunctions.ts** L25: `console.error` ガードなし ❌ / **AdBanner.tsx** L34: `console.warn` ガードなし ❌（計2件残存） |
| 4 | 重複fontFamily | ❌ (18件) | ✅ | grep + tsc確認 | add.tsx, shopping.tsx, pro.tsx, cooking/[id].tsx, recipe/[id].tsx すべてで重複解消済み |
| 5 | SafeAreaView追加 | ❌ (5画面未対応) | ✅ | 各ファイル確認 | **index.tsx**: `SafeAreaView` import+使用 ✅ / **recipe/[id].tsx**: `SafeAreaView` import+使用 ✅ / **shopping.tsx**: `SafeAreaView` import+使用 ✅ / **pro.tsx**: `SafeAreaView` import+使用 ✅（add.txはKeyboardAvoidingViewで元々問題なし） |
| 6 | 買い物リスト try-catch | ❌ | ✅ | `app/shopping.tsx` L41-45, L56-60, L69-73, L87-91, L105-109 | 全AsyncStorage操作（toggleItem, clearChecked, removeItem, removeRecipeGroup, clearAll）に `try-catch` + `Alert.alert('エラー', '保存に失敗しました')` 追加済み。ただし `loadList`（L25-30）はガードなし（⚠️軽微） |
| 7 | Pro画面 開発テキスト `__DEV__`分岐 | ⚠️ | ❌ | `app/pro.tsx` L86-88 | **未修正**。`"※ 開発版のため、購入はモック（AsyncStorage保存）です"` が無条件表示のまま。本番ビルドでもユーザーに見える |
| 8 | .gitignore `.firebaserc` | ⚠️ | ✅ | `.gitignore` L44 | `.firebaserc` 追加済み |
| 9 | セキュリティ: .env / app.config.js | ⚠️ | ⚠️ | `.env` L1-2, `app.config.js` L41-42 | `.env`に実キー（`AIzaSy...`）と`APP_SECRET`が平文記載。`.gitignore`で除外済みだがローカル平文保存。`app.config.js`は`process.env`経由で正しい。**APP_SECRETのローテーション推奨**（以前ハードコードされていたため露出済み） |

---

## 改善サマリー

| カテゴリ | v5 | v5b | 変化 |
|---------|-----|-----|------|
| APP_SECRET ハードコード | ❌ CRITICAL | ✅ 解消 | +++ |
| TypeScript エラー | ❌ 19件 | ✅ 0件 | +++ |
| console.log ガード | ❌ 全件ガードなし | ⚠️ 2件残存 | ++ |
| 重複fontFamily | ❌ 18件 | ✅ 0件 | +++ |
| SafeAreaView | ❌ 5画面 | ✅ 全対応 | +++ |
| 買い物リスト try-catch | ❌ | ✅ ほぼ完了 | ++ |
| Pro画面開発テキスト | ⚠️ | ❌ 未修正 | - |
| .gitignore .firebaserc | ⚠️ | ✅ 追加済み | + |

---

## 残存課題

### 🔴 リリースブロッカー（1件）
1. **Pro画面の開発テキスト** (`app/pro.tsx` L86-88)
   - `"※ 開発版のため、購入はモック（AsyncStorage保存）です"` が本番でも表示される
   - 修正案: `{__DEV__ && <Text ...>...</Text>}` で囲む

### 🟡 推奨修正（2件）
2. **console残存2件**
   - `utils/firebaseFunctions.ts` L25: `console.error` → `if (__DEV__) console.error(...)`
   - `components/AdBanner.tsx` L34: `console.warn` → `if (__DEV__) console.warn(...)`
3. **APP_SECRETのローテーション**
   - 以前クライアントコードにハードコードされていた `"miru-recipe-secret-2024"` は露出済み
   - Firebase Secret Manager側で新しいシークレットに更新推奨

### 🟢 軽微（1件）
4. **loadList の try-catch** (`app/shopping.tsx` L25-30)
   - 初回ロード時のAsyncStorage読み取りにガードなし（クラッシュリスクは低いが念のため）

---

## 更新スコア

| カテゴリ | v5 | v5b | 備考 |
|---------|-----|-----|------|
| A. 主要機能 | 9/10 | 9/10 | 変更なし |
| B. UI/UX | 6/10 | **8/10** | SafeArea全対応、fontFamily重複解消 |
| C. 課金IAP | 7/10 | **7/10** | Pro画面テキスト未修正のため据え置き |
| D. セキュリティ | 4/10 | **7/10** | APP_SECRET環境変数化。ローテーション未実施で-1 |
| E. コード品質 | 5/10 | **8/10** | TSエラー0、console.logほぼガード済み |
| **総合** | **6.2/10** | **7.8/10** | **+1.6pt改善** |

---

## 本番ビルド GO / NO-GO 判定

### 🟡 **条件付きGO**

**ブロッカー1件を修正すればリリース可能。**

Pro画面（`app/pro.tsx` L86-88）の開発テキストを `__DEV__` で囲むだけで解消できる1行修正。
これを行えば、本番ビルドに進めるレベルの品質に到達している。

残りの🟡推奨事項（console残存2件・シークレットローテーション）はリリース後パッチでも対応可。

---

*レポート生成: Claude Opus 4.6 / 2026-03-15*
