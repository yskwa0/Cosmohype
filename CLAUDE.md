@AGENTS.md

# Cosmohype — CLAUDE.md

> このファイルはClaude Codeがプロジェクトを編集するたびに必ず読む開発ガイドです。

---

## 1. プロダクト概要

**Cosmohype** はファッション特化のSNSアプリです。

ユーザーはコーデを投稿し、友達や有名人・インフルエンサーをフォローし、スタイルを発見し、ファッションアイテムを保存し、将来的にはAIによる個人化されたコーディネート提案も受け取れます。

単なるショッピングアプリではありません。
スタイルを発見し、人とつながり、コーデを試し、外部ECで商品を購入できる **ファッションSNS** です。

長期ゴール:
- ファッションSNS
- AIスタイリスト
- コーデ投稿・保存
- 友達との交流
- インフルエンサーフォロー
- AIスタイル診断
- AI服レコメンド
- アフィリエイトEC連携
- 2D仮想試着
- サブスク機能

**アプリ世界観: ファッション × 宇宙感 × 自分らしさ**

---

## 2. 技術スタック

特別な理由がない限り、以下のスタックを使う。変更する場合は理由を明示すること。

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router, Turbopack) |
| 言語 | TypeScript |
| スタイル | Tailwind CSS v4 |
| バックエンド/DB | Supabase (Database, Auth, Storage) |
| デプロイ | Vercel |
| 決済 (将来) | Stripe |
| AI (将来) | OpenAI API または画像解析AI |
| EC連携 (将来) | Amazon / 楽天 / 古着EC 各公式API |

**重要: Next.js 16 の変更点**
- `middleware.ts` → `proxy.ts`（関数名も `proxy` にリネーム）
- `params` は非同期 (`await params` が必要)
- `@AGENTS.md` に記載のNext.js固有ルールを必ず確認する

---

## 3. 開発の基本方針

- **フェーズ制で実装する**（下記フェーズ計画参照）
- Phase 1は完了済み。次はPhase 2から。
- 小さなUIの修正はそのまま実装してよい。
- 大きな機能追加・DB変更・認証まわりは、実装前に方針を提示してからすすめる。
- 迷ったら「Codex確認推奨」と書いて止まる。勝手に複雑実装しない。

---

## 4. UI/デザイン方針

**使う**:
- モバイルファーストデザイン
- 余白多め・洗練されたレイアウト
- ビジュアル重視（画像が主役）
- Instagramのような直感的な操作感
- カラーパレット: Primary `#7C3AED`（violet）/ Accent `#EC4899`（pink）/ BG `#FAFAFA`

**避ける**:
- 多すぎる色
- 複雑すぎるレイアウト
- チープなグラデーション
- 不要なアニメーション
- デスクトップファーストUI
- 雑然とした画面

---

## 5. フェーズ計画

### Phase 1 — 土台（完了済み）
- トップページ（宇宙感ダークテーマ）
- ログイン・新規登録
- プロフィール作成（スタイルタグ・アバター）
- コーデ投稿（画像最大5枚・タグ・ブランドタグ）
- フィード一覧
- プロフィールページ（投稿グリッド）
- モバイルUI（BottomNav・TopBar）

### Phase 2 — ソーシャル機能
- フォロー・フォロワー
- いいね（DB永続化）
- コメント
- 保存機能
- フォロー中のフィード

### Phase 3 — 発見・マッチング
- おすすめユーザー
- スタイル類似ユーザー
- ハッシュタグ検索
- DM（安全対策が整ってから）
- 通報・ブロック機能

### Phase 4 — AIスタイル診断
- 参考画像アップロード
- スタイル解析・タグ生成
- プロフィールへの保存

### Phase 5 — AI服レコメンド
- スタイルに基づく商品提案
- 外部EC商品カード
- アフィリエイトリンク処理
- 保存済み商品

### Phase 6 — 2D仮想試着
- ユーザー写真アップロード
- アイテムプレビュー
- シンプル2Dオーバーレイ
- AI生成試着（後期）
- **プライバシーと安全性を最優先に設計すること**

### Phase 7 — サブスク（Stripe）
- Cosmohype Plus
- AIスタイル診断の追加利用
- 試着機能の追加利用
- 広告なし体験
- クリエイター分析（後期）

---

## 6. データベース設計方針

### 命名規則
- テーブル名はスネークケース・複数形: `profiles`, `posts`, `post_images`
- カラム名はスネークケース: `user_id`, `created_at`
- 全テーブルに `id`（UUID）, `created_at` を持つ
- ユーザーに紐づくテーブルは `user_id` を持つ

### 現在のテーブル構成
| テーブル | 説明 |
|---|---|
| `profiles` | ユーザープロフィール（auth.usersとFK） |
| `posts` | コーデ投稿 |
| `post_images` | 投稿画像（1投稿につき最大5枚） |

### 今後追加予定のテーブル
`follows`, `likes`, `comments`, `saved_posts`, `style_preferences`, `product_recommendations`, `saved_products`, `try_on_images`, `subscriptions`, `reports`, `blocks`

### テーブル変更前の確認事項
新しいテーブルを作る・既存テーブルを変更する前に、必ず以下を提示する:
1. テーブル名と目的
2. カラム定義
3. リレーション
4. RLSポリシー案
5. Codex確認が必要かどうか

---

## 7. Supabaseの使い方

- **認証**: `@supabase/ssr` を使う。`createBrowserClient`（クライアント）と `createServerClient`（SSR）を使い分ける
- **クライアント用**: `lib/supabase/client.ts` の `createClient()`
- **サーバー用**: `lib/supabase/server.ts` の `createClient()`（`await` 必要）
- **型定義**: `types/database.ts` の `Database` 型を常に最新に保つ
- **Storage**: `avatars`（プロフィール画像）/ `posts`（投稿画像）の2バケット
- **マイグレーション**: `supabase/migrations/` に番号付きSQLファイルで管理

---

## 8. 認証・画像アップロードの方針

### 認証
- Supabase Auth（メール/パスワード）を使う
- `proxy.ts` でルート保護: `/feed`, `/profile`, `/post` は未認証でログイン画面へリダイレクト
- 新規登録後はプロフィール未設定なら `/profile/setup` にリダイレクト
- JWTやセッション管理の変更は **Codex確認推奨**

### 画像アップロード
- 許可する形式: `image/jpeg`, `image/png`, `image/webp` のみ
- ファイルサイズ上限: アバター 5MB / 投稿画像 10MB
- クライアントサイドでファイル形式・サイズを検証してからアップロード
- Storage RLSで本人のみ書き込み可能にする
- 将来の2D試着機能でユーザー写真を扱う際は **必ずCodex確認**

---

## 9. セキュリティ方針

**フロントエンドに絶対に含めてはいけないもの**:
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- アフィリエイトシークレットキー

機密処理はサーバーサイドで行う。

**RLS（Row Level Security）**:
- 全テーブルにRLSを有効化する
- 公開書き込み可能なポリシーは作らない
- RLSポリシーの設計は複雑な場合 **Codex確認推奨**

**ユーザー画像**:
- 安全に保存する
- 不必要な公開露出を避ける
- 削除ロジックを用意する
- ユーザーが明示的に同意しない限り、AI学習に使用しない

**ソーシャル機能**:
- 通報・ブロック機能をPhase 3で必ず追加する
- DM機能は安全対策が整ってからリリース
- プライバシー設定は段階的に追加

---

## 10. Codexに相談すべき作業

以下の作業は、実装を深く進める前に **Codex向けプロンプトを作成して提示する**。

| 作業 | 理由 |
|---|---|
| 複雑なコードレビュー | バグ・設計の見落としを防ぐ |
| セキュリティレビュー | 認証・権限まわりのリスク |
| DB設計の妥当性チェック | スキーマ変更は後から変えにくい |
| API設計レビュー | 外部連携の契約・仕様確認 |
| 認証フローの変更 | セキュリティリスクが高い |
| Stripe決済ロジック | 金銭処理は慎重に |
| サブスクロジック | 状態管理が複雑 |
| 個人情報の取り扱い | 法的リスク |
| AI画像処理の設計 | プライバシー・コスト |
| 2D試着アーキテクチャ | 複雑な技術スタック |
| パフォーマンス改善 | 副作用が大きい |
| 大規模リファクタリング | 既存機能への影響 |
| テスト設計 | 品質保証の方針 |
| バグ原因の切り分け | 根本原因の特定 |
| 外部EC API連携 | 利用規約・スクレイピング禁止 |

Codex確認が必要な場合、以下を出力すること:
1. 何をレビューしてほしいか
2. なぜCodex確認が推奨されるか
3. コピペで使えるCodexプロンプト
4. 対象ファイル・コードセクション

---

## 11. 実装時の禁止事項

- APIキーをハードコードしない
- フロントエンドにシークレット値を含めない
- 1つのコンポーネントに多くのロジックを詰め込まない
- 不明瞭な変数名を使わない
- ロジックを重複させない
- セキュリティルールを考慮せずにDBを直接操作しない
- タスクと無関係なデザイン変更を行わない
- `SUPABASE_SERVICE_ROLE_KEY` をクライアントサイドで使わない
- RLSを無効化したまま放置しない
- 既存の動作を壊すリファクタリングを無断で行わない
- EC連携でWebスクレイピングを行わない（法的・規約リスク）
- ユーザー同意なしに画像をAI学習に使用しない
- Stripeのwebhook署名検証を省略しない（将来実装時）

---

## 12. コードを書くときのルール

```
使う:
- TypeScript（型を正確に書く）
- 関数コンポーネント（React）
- Tailwind CSS
- 明確なコンポーネント名
- 再利用可能なコンポーネント
- サーバー/クライアントの適切な分離
- 環境変数でシークレットを管理
- エラーハンドリング
- ローディング状態
- 空状態の表示
- モバイルファーストのレスポンシブデザイン

避ける:
- コメントを書きすぎる（WHYが非自明なときだけ）
- マルチパラグラフのdocstring
- 将来の仮定に基づいた抽象化
- 必要のないエラーハンドリング（内部保証が効く箇所）
- 似たような3行程度なら抽象化しない
```

**ファイル構成**:
```
components/
  ui/          ← 汎用UIパーツ（Button, Input, Avatar）
  auth/        ← 認証フォーム
  post/        ← PostCard, PostForm, ImageUpload
  profile/     ← ProfileHeader, ProfileSetupForm
  layout/      ← TopBar, BottomNav

app/
  (auth)/      ← 認証不要のページ
  (main)/      ← 認証必須ページ（BottomNav付きレイアウト）
  api/         ← APIルート

lib/supabase/  ← client.ts / server.ts
types/         ← database.ts
hooks/         ← useAuth.ts 等
supabase/migrations/  ← SQLマイグレーション
```

---

## 13. Gitコミット前の確認事項

- [ ] `npm run build` が成功する
- [ ] TypeScriptエラーがない
- [ ] シークレット値がコミットされていない（`.env.local` は `.gitignore` に含める）
- [ ] 不要なファイルが含まれていない
- [ ] モバイルUIが壊れていない
- [ ] DB変更がある場合は `supabase/migrations/` に記録されている
- [ ] 新しい環境変数がある場合は `.env.local` の変数名一覧を更新している

**コミットメッセージ例**:
```
feat: add outfit post creation
feat: add profile setup flow
fix: improve mobile post card layout
chore: add supabase environment example
refactor: split post components
```

---

## 14. 環境変数

```env
# Supabase（必須）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# アプリURL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI（Phase 4以降）
OPENAI_API_KEY=

# Stripe（Phase 7以降）
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` と `OPENAI_API_KEY` と `STRIPE_SECRET_KEY` は **絶対にフロントエンドに渡してはいけない**。

---

## 15. 補足: 外部EC連携の注意

- Amazon / 楽天 / 各古着ECの公式APIまたはアフィリエイトプログラムを使うこと
- Webスクレイピングは原則禁止（各サービスの利用規約・robots.txtを遵守）
- EC連携の設計・APIアクセス権限まわりは必ず **Codex確認推奨**
