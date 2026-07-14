import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// STYLE ID inline mapping
//
// 独立性の理由:
//   本ページは他の in-progress な style-id リファクタと歩調を合わせず、
//   単体で本番反映することを最優先する。そのため:
//     - `@/lib/style-id/styleTypes` (現在 working tree で description 差分あり) を import しない
//     - `@/lib/style-id/character-image` (origin/main に未追加) を import しない
//   代わりに、8 種の表示名 + キャラクター画像パスをここで inline 定義する。
//
//   Cosmohype 共通の STYLE ID 定義に変更が発生しても本ページの表示は自己完結。
//   将来 lib 側が origin/main に整うタイミングで、本 mapping を廃止して import に戻す。
//
//   name は既存 `lib/style-id/styleTypes.ts` の name フィールドと完全一致。
//   画像は `public/style-id-chars/y{style}.jpg` の Y 系ヒーロー画像を参照。
// ---------------------------------------------------------------------------

type StyleId =
  | 'URBAN_EDGE'
  | 'COSMIC_REBEL'
  | 'SOFT_DREAMER'
  | 'CLASSIC_ELITE'
  | 'FREE_SPIRIT'
  | 'DARK_POET'
  | 'RETRO_WAVE'
  | 'MINIMAL_SOUL'

const STYLE_NAME: Record<StyleId, string> = {
  URBAN_EDGE:    'Urban Edge',
  COSMIC_REBEL:  'Cosmic Rebel',
  SOFT_DREAMER:  'Soft Dreamer',
  CLASSIC_ELITE: 'Classic Elite',
  FREE_SPIRIT:   'Free Spirit',
  DARK_POET:     'Dark Poet',
  RETRO_WAVE:    'Retro Wave',
  MINIMAL_SOUL:  'Minimal Soul',
}

const STYLE_HERO_IMAGE: Record<StyleId, string> = {
  URBAN_EDGE:    '/style-id-chars/yurban.jpg',
  COSMIC_REBEL:  '/style-id-chars/ycosmic.jpg',
  SOFT_DREAMER:  '/style-id-chars/ysoft.jpg',
  CLASSIC_ELITE: '/style-id-chars/yclassic.jpg',
  FREE_SPIRIT:   '/style-id-chars/yfree.jpg',
  DARK_POET:     '/style-id-chars/ydark.jpg',
  RETRO_WAVE:    '/style-id-chars/yretro.jpg',
  MINIMAL_SOUL:  '/style-id-chars/yminimal.jpg',
}

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// OGP: LINE / Twitter でシェアされた際の見た目。
// invite ページと同系統だが文言だけ style-guess 用に差し替える。
// og image は当面 invite と共通の /invite-appicon-v1.png を流用する。
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  metadataBase: new URL('https://www.cosmohype.jp'),
  title: '友達があなたのSTYLE IDを予想しました🪐',
  description:
    'Cosmohype をダウンロードして、あなたの本当の STYLE ID を診断してみよう。',
  openGraph: {
    type: 'website',
    title: '友達があなたのSTYLE IDを予想しました🪐',
    description:
      'Cosmohype をダウンロードして、あなたの本当の STYLE ID を診断してみよう。',
    images: [
      {
        url: '/invite-appicon-v1.png',
        width: 1024,
        height: 1024,
        alt: 'Cosmohype',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '友達があなたのSTYLE IDを予想しました🪐',
    description:
      'Cosmohype をダウンロードして、あなたの本当の STYLE ID を診断してみよう。',
    images: ['/invite-appicon-v1.png'],
  },
}

// ---------------------------------------------------------------------------
// 定数 / バリデーション
// ---------------------------------------------------------------------------

// iOS 側 StyleIdGuessURLParser.tokenPattern と同一。
// 32〜64 chars の url-safe base64 のみ許可。
const TOKEN_REGEX = /^[A-Za-z0-9_-]{32,64}$/

// 088 の CHECK 制約と同一。iOS StyleIdType.all と同一。
const VALID_STYLES: readonly StyleId[] = [
  'URBAN_EDGE',
  'COSMIC_REBEL',
  'SOFT_DREAMER',
  'CLASSIC_ELITE',
  'FREE_SPIRIT',
  'DARK_POET',
  'RETRO_WAVE',
  'MINIMAL_SOUL',
] as const

// 環境変数：未設定なら「Cosmohype をはじめる」CTA を非表示にする。
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? null

// ---------------------------------------------------------------------------
// Supabase RPC 呼び出し
//
// 【原則】Web 側では get_style_id_guess_by_token だけ呼ぶ。
// claim / finalize は iOS ログイン済みでのみ発火するので、Web からは絶対に呼ばない。
//
// SECURITY DEFINER RPC のため anon でも呼び出し可能 (088 で GRANT TO anon)。
// ---------------------------------------------------------------------------

interface GuessRow {
  guessed_style_id: string
  sender_display_name: string
  opened: boolean
  claimed: boolean
  expired: boolean
  created_at: string
}

type FetchResult =
  | { kind: 'ok'; data: GuessRow }
  | { kind: 'invalid_token' }
  | { kind: 'not_found' }
  | { kind: 'expired' }
  | { kind: 'error'; message: string }

async function fetchGuess(token: string): Promise<FetchResult> {
  if (!TOKEN_REGEX.test(token)) {
    return { kind: 'invalid_token' }
  }
  try {
    const supabase = await createClient()
    // Database 型 (types/database.ts) がまだ再生成されておらず、
    // 088 で追加された `get_style_id_guess_by_token` は型定義に含まれない。
    // Remote には既に存在 (適用済) しているため実行時は成功する。
    // 型再生成 (supabase gen types typescript --linked > types/database.ts)
    // を将来行った時点でこの ts-expect-error は自動的に不要になり fail する。
    // @ts-expect-error RPC exists on remote but Database types not regenerated yet.
    const { data, error } = await supabase.rpc('get_style_id_guess_by_token', {
      p_share_token: token,
    })
    if (error) {
      return { kind: 'error', message: error.message }
    }
    // Supabase の Table-Returning RPC は配列で返る。0 行 = 該当 token なし。
    // ts-expect-error 起因で data は fallback 型 (別 RPC の shape) になっているため、
    // unknown を経由してから GuessRow[] に narrow する。
    const rows = data as unknown as GuessRow[] | null
    if (!rows || rows.length === 0) {
      return { kind: 'not_found' }
    }
    const row = rows[0]
    if (row.expired) {
      return { kind: 'expired' }
    }
    return { kind: 'ok', data: row }
  } catch (e) {
    return {
      kind: 'error',
      message: e instanceof Error ? e.message : String(e),
    }
  }
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function StyleGuessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await fetchGuess(token)

  return (
    <>
      {/* invite ページと同様、body 背景を明示的に白に固定する。 */}
      <style>{`html, body { background-color: #FFFFFF !important; }`}</style>
      <PageShell>
        {result.kind === 'invalid_token' && (
          <ErrorView
            title="このリンクは無効です"
            description="共有リンクの形式が正しくありません。"
            showRetry={false}
            token={token}
          />
        )}
        {result.kind === 'not_found' && (
          <ErrorView
            title="このリンクは無効です"
            description="共有リンクが見つからないか、削除された可能性があります。"
            showRetry={false}
            token={token}
          />
        )}
        {result.kind === 'expired' && (
          <ErrorView
            title="このリンクの有効期限が切れています"
            description="送信者に新しいリンクを発行してもらってください。"
            showRetry={false}
            token={token}
          />
        )}
        {result.kind === 'error' && (
          <ErrorView
            title="結果を読み込めませんでした"
            description="通信環境を確認して、もう一度お試しください。"
            showRetry
            token={token}
          />
        )}
        {result.kind === 'ok' &&
          (VALID_STYLES.includes(result.data.guessed_style_id as StyleId) ? (
            <SuccessView row={result.data} token={token} />
          ) : (
            // DB 側 CHECK で 8 種に限定されているため、通常はここに来ない。
            // 万一 8 種外の値が返っても 404 に飛ばさず invalid 扱いにする。
            <ErrorView
              title="このリンクは無効です"
              description="共有リンクのデータが正しくありません。"
              showRetry={false}
              token={token}
            />
          ))}
      </PageShell>
    </>
  )
}

// ---------------------------------------------------------------------------
// Layout / Views
// ---------------------------------------------------------------------------

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: '#FFFFFF',
        color: '#17131F',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 20px 48px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {children}
      </div>
    </main>
  )
}

function SuccessView({ row, token }: { row: GuessRow; token: string }) {
  const styleId = row.guessed_style_id as StyleId
  const styleName = STYLE_NAME[styleId]
  const characterImage = STYLE_HERO_IMAGE[styleId]
  const senderName = (row.sender_display_name ?? '').trim()

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* ロゴ / ブランド行 (シンプル、詰め込みすぎない) */}
      <div
        style={{
          fontSize: 13,
          letterSpacing: 2,
          color: '#9B97B2',
          fontWeight: 600,
          marginBottom: 24,
        }}
      >
        COSMOHYPE · STYLE ID
      </div>

      {/* メインメッセージ (上段) */}
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: '#17131F',
          textAlign: 'center',
          margin: '0 0 20px',
        }}
      >
        あなたのファッションスタイルは
      </p>

      {/* キャラクター画像 (中央、大きめ) */}
      <div
        style={{
          width: 260,
          maxWidth: '80vw',
          aspectRatio: '1 / 1',
          borderRadius: 28,
          background: 'rgba(23,19,31,0.03)',
          overflow: 'hidden',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src={characterImage}
          alt={styleName}
          width={520}
          height={520}
          priority
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* STYLE ID 名 (太字強調) */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: 0.5,
          textAlign: 'center',
          color: '#17131F',
          marginBottom: 8,
        }}
      >
        {styleName}
      </div>

      {/* 下段メッセージ */}
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.5,
          color: '#17131F',
          textAlign: 'center',
          margin: '0 0 12px',
        }}
      >
        と予想されました
      </p>

      {/* 送信者名 (あれば表示) */}
      {senderName && (
        <p
          style={{
            fontSize: 13,
            color: '#6B6475',
            textAlign: 'center',
            margin: '0 0 24px',
          }}
        >
          {senderName}さんからの予想です
        </p>
      )}

      {/* CTA セクション */}
      <CtaSection token={token} />

      {/* 補足: アプリインストール後の案内 */}
      <p
        style={{
          fontSize: 12,
          color: '#9B97B2',
          textAlign: 'center',
          lineHeight: 1.6,
          margin: '20px 0 0',
          padding: '0 4px',
        }}
      >
        アプリをインストールした後は、LINE や Instagram の元のリンクを
        <br />
        もう一度タップしてください。
      </p>
    </div>
  )
}

function CtaSection({ token }: { token: string }) {
  const universalLink = `https://www.cosmohype.jp/style-guess/${token}`
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 4,
      }}
    >
      {/* Primary: アプリで開く (Universal Link、iOS でアプリ起動 or Web 再訪) */}
      <a
        href={universalLink}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 52,
          borderRadius: 14,
          backgroundColor: '#FF6A2A',
          color: '#FFFFFF',
          fontSize: 15,
          fontWeight: 700,
          textDecoration: 'none',
          boxShadow: '0 8px 24px rgba(255,106,42,0.28)',
        }}
      >
        アプリで開く
      </a>

      {/* Secondary: Cosmohype で診断する / App Store 導線 */}
      {APP_STORE_URL ? (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            borderRadius: 14,
            backgroundColor: '#FFFFFF',
            color: '#FF6A2A',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            border: '1.5px solid #FF6A2A',
          }}
        >
          Cosmohype をはじめる (App Store)
        </a>
      ) : (
        <a
          href="/style-id"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            borderRadius: 14,
            backgroundColor: '#FFFFFF',
            color: '#FF6A2A',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            border: '1.5px solid #FF6A2A',
          }}
        >
          Cosmohype で診断する
        </a>
      )}
    </div>
  )
}

function ErrorView({
  title,
  description,
  showRetry,
  token,
}: {
  title: string
  description: string
  showRetry: boolean
  token: string
}) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 24,
      }}
    >
      {/* シンプルなエラーアイコン (絵文字、依存追加不要) */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: 'rgba(23,19,31,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          marginBottom: 20,
        }}
      >
        ⚠️
      </div>

      <h1
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#17131F',
          textAlign: 'center',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: '#6B6475',
          textAlign: 'center',
          margin: '0 0 28px',
          padding: '0 4px',
        }}
      >
        {description}
      </p>

      {showRetry && (
        // 再読み込み用リンク。Server Component から fetch を再実行するために
        // 同じ URL に navigate する (Next.js が再度サーバー処理を走らせる)。
        <a
          href={`/style-guess/${encodeURIComponent(token)}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: 48,
            borderRadius: 14,
            backgroundColor: '#FF6A2A',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            marginBottom: 12,
            boxShadow: '0 6px 18px rgba(255,106,42,0.22)',
          }}
        >
          もう一度試す
        </a>
      )}

      {APP_STORE_URL && (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: 48,
            borderRadius: 14,
            backgroundColor: '#FFFFFF',
            color: '#FF6A2A',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            border: '1.5px solid #FF6A2A',
          }}
        >
          Cosmohype をはじめる (App Store)
        </a>
      )}

      <Link
        href="/"
        style={{
          marginTop: 16,
          fontSize: 13,
          color: '#9B97B2',
          textDecoration: 'underline',
        }}
      >
        トップページへ戻る
      </Link>
    </div>
  )
}
