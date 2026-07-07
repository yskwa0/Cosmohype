'use client'
import Image from 'next/image'

/**
 * 招待経由 landing page の Component (Phase 4)。
 *
 * 位置付け:
 *   Web 上で invite intent の作成 / signup / 認証は行わない。
 *   このページの唯一の役割は「App Store 誘導」。
 *
 * 挙動:
 *   1. 招待コードが正規形式なら「友達から招待されています」バナー + App Store CTA を表示
 *   2. 招待コードが正規形式でなければ「無効」表示 + それでも App Store 誘導だけは残す
 *      (ユーザーは既にアプリに関心を持って辿り着いているため、通常インストール導線は自然に維持)
 *   3. インストール後、ユーザーが LINE / DM / メッセージ側の元招待リンクを **もう一度タップ**すると、
 *      Universal Link で Cosmohype アプリが起動し Swift 側 (Phase 2) が inviteCode を pending 保存 →
 *      新規登録完了時 (Phase 3) に referral が成立する。
 *   4. 同一 Landing 内での「アプリで開く」ボタンは意図的に置かない。
 *      理由: iOS は同一ドメイン (www.cosmohype.jp) を閲覧中の Safari から
 *      同一ドメインの Universal Link をタップしても Safari 継続を優先し、
 *      アプリが確実に開かない可能性があるため。
 *      ユーザーには元 message 側の招待リンクへ戻ってタップし直してもらう。
 *
 * 旧 Web signup 経路 (startInviteSignup / Apple / Google / Email CTA / /register 遷移) は全て削除。
 * バックエンド側の dead code (actions.ts, /api/invite/finalize, lib/invite/*, invite_signup_intents 等) は
 * Universal Link 版の実機確認完了後の cleanup で別途削除予定。
 */
export function InviteClient({
  inviteCode,
  validFormat
}: {
  inviteCode: string
  validFormat: boolean
}) {
  // NEXT_PUBLIC_APP_STORE_URL は既存の /invite/success/page.tsx / style-id/result/page.tsx と同じ変数を流用。
  // App Store 上場前は未設定のため、fallback で「準備中」表示 (既存の /invite/success/page.tsx と同一 pattern)。
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '#'
  const appStoreConfigured = appStoreUrl !== '#'

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '64px',
        paddingRight: '24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
        paddingLeft: '24px',
        background: 'linear-gradient(to bottom, #090714 0%, #1A0533 20%, #2D0A5F 50%, #1A0533 80%, #090714 100%)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ width: '100%', maxWidth: '384px', textAlign: 'center' }}>
        <Image
          src="/cosmohypelogo.png"
          alt="Cosmohype"
          width={220}
          height={68}
          style={{ objectFit: 'contain', margin: '0 auto 32px' }}
          priority
        />

        {validFormat ? (
          <>
            {/* Invite banner (valid code) */}
            <div
              style={{
                marginBottom: '28px',
                padding: '20px 20px',
                borderRadius: '16px',
                background: 'rgba(124,58,237,0.10)',
                border: '1px solid rgba(124,58,237,0.30)'
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#C4B5FD',
                  margin: 0,
                  letterSpacing: '0.05em'
                }}
              >
                🎁 招待キャンペーン
              </p>
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  marginTop: '10px',
                  marginBottom: 0,
                  lineHeight: 1.5
                }}
              >
                友達から Cosmohype に
                <br />
                招待されています
              </p>
            </div>
          </>
        ) : (
          // Invalid code — 招待バナーは出さず、無効メッセージのみ。App Store 導線は残す。
          <div
            style={{
              marginBottom: '28px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: 'rgba(239,68,68,0.10)',
              border: '1px solid rgba(239,68,68,0.25)'
            }}
          >
            <p
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#FCA5A5',
                margin: 0,
                lineHeight: 1.6
              }}
            >
              この招待リンクは無効です
            </p>
            <p
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.55)',
                margin: '6px 0 0 0',
                lineHeight: 1.6
              }}
            >
              アプリをダウンロードして通常の新規登録から始められます。
            </p>
          </div>
        )}

        {/* App Store CTA (single main CTA) */}
        {appStoreConfigured ? (
          <a
            href={appStoreUrl}
            style={{
              display: 'block',
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
              textAlign: 'center',
              textDecoration: 'none',
              touchAction: 'manipulation',
              boxShadow: '0 8px 24px rgba(124,58,237,0.35)'
            }}
          >
            App Storeからダウンロード
          </a>
        ) : (
          <div
            style={{
              display: 'block',
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              background: 'rgba(255,255,255,0.06)',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.10)'
            }}
          >
            App Store リンク準備中
          </div>
        )}

        {/* Post-install 案内 (valid code のときだけ、App Store URL 設定済のときだけ意味あり) */}
        {validFormat && appStoreConfigured && (
          <p
            style={{
              marginTop: '20px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.8
            }}
          >
            インストールしたら、この招待リンクを
            <br />
            <strong style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>もう一度タップ</strong>
            してください。
            <br />
            アプリで招待が自動で適用されます。
          </p>
        )}

        {/* サービス紹介 (小さめ) */}
        <p
          style={{
            marginTop: '32px',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.42)',
            lineHeight: 1.7
          }}
        >
          STYLE ID 診断や、いろんなファッションの人とつながろう
        </p>
      </div>
    </div>
  )
}
