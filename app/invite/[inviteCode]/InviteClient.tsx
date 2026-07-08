'use client'
import Image from 'next/image'

/**
 * 招待経由 landing page の Component (Phase 4 デザイン刷新版)。
 *
 * ブランド刷新:
 *   * 旧: 紫グラデーション + 黒背景 + 旧文字ロゴ
 *   * 新: オレンジ×白ベース + 新 Cosmohype wordmark (public/image.png)
 *
 * 位置付け (Phase 4 から不変):
 *   Web 上で invite intent の作成 / signup / 認証は行わない。
 *   このページの唯一の役割は「App Store 誘導」。
 *
 * 挙動 (Phase 4 から不変):
 *   1. 招待コードが正規形式なら「友達から Cosmohype に招待されています」バナー + App Store CTA を表示
 *   2. 招待コードが正規形式でなければ「無効」表示 + それでも App Store 誘導だけは残す
 *   3. インストール後、ユーザーが LINE / DM / メッセージ側の元招待リンクを **もう一度タップ**すると、
 *      Universal Link で Cosmohype アプリが起動し Swift 側 (Phase 2) が inviteCode を pending 保存 →
 *      新規登録完了時 (Phase 3) に referral が成立する。
 *   4. 同一 Landing 内での「アプリで開く」ボタンは意図的に置かない
 *      (iOS 同一ドメイン Universal Link の Safari 継続問題を回避)。
 *
 * デザイン tokens (このファイル内で完結):
 *   * brand orange:  #FF7A2E, gradient partner #F97316
 *   * brand pink:    #EC4899 (wordmark の右側と一致)
 *   * text primary:  #1F1F23 (near-black)
 *   * text muted:    #6B7280 / #9CA3AF
 *   * card border:   rgba(255,122,46,0.25) (soft orange)
 *   * card tint bg:  #FFF7ED (very light warm)
 *   * base bg:       #FFFFFF + top radial warmth
 */
export function InviteClient({
  inviteCode,
  validFormat
}: {
  inviteCode: string
  validFormat: boolean
}) {
  // NEXT_PUBLIC_APP_STORE_URL は既存の /invite/success/page.tsx / style-id/result/page.tsx と同じ変数を流用。
  // 変数と分岐ロジックは Phase 4 実装のまま保持 (今回はデザインのみ変更、リンク先ロジック不変)。
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL ?? '#'
  const appStoreConfigured = appStoreUrl !== '#'

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '56px',
        paddingRight: '24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)',
        paddingLeft: '24px',
        background: '#FFFFFF',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* 背景装飾: ごく薄いオレンジの radial + 淡い軌道円 (CSS のみ、画像 asset は使わない) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(1200px circle at 50% -10%, rgba(255,122,46,0.10), rgba(255,255,255,0) 55%), ' +
            'radial-gradient(800px circle at 100% 100%, rgba(236,72,153,0.06), rgba(255,255,255,0) 60%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      {/* 微かな軌道円 (右上、ブランドの「宇宙感、派手すぎない」) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-80px',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          border: '1px dashed rgba(255,122,46,0.14)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      {/* 微かな軌道円 (左下、対角バランス) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-70px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          border: '1px dashed rgba(236,72,153,0.10)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      {/* 小さな star sparkle (Unicode、ごく薄く) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '18%',
          left: '12%',
          fontSize: '10px',
          color: 'rgba(255,122,46,0.30)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        ✦
      </span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '10%',
          right: '18%',
          fontSize: '8px',
          color: 'rgba(236,72,153,0.30)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        ✦
      </span>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '22%',
          right: '10%',
          fontSize: '9px',
          color: 'rgba(255,122,46,0.30)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        ✦
      </span>

      {/* Content column */}
      <div
        style={{
          width: '100%',
          maxWidth: '384px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Logo — 新 Cosmohype wordmark (public/image.png、iOS Assets からコピーした brand asset) */}
        {/* unoptimized: Vercel Image Optimization は本 project で 402
            (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED、月次クォータ超過) を返すため、
            /_next/image を経由せず raw /image.png を配信する。asset 単体で 480 KB 程度で、
            optimizer 無しでも実用範囲。将来クォータが余ったら prop を外す。 */}
        <Image
          src="/image.png"
          alt="Cosmohype"
          width={220}
          height={51}
          unoptimized
          style={{
            objectFit: 'contain',
            margin: '0 auto 36px',
            display: 'block'
          }}
          priority
        />

        {validFormat ? (
          <>
            {/* Invite banner (valid code) — 白カード + 薄いオレンジ border + 柔らかい shadow */}
            <div
              style={{
                marginBottom: '28px',
                padding: '22px 22px',
                borderRadius: '20px',
                background: '#FFFFFF',
                border: '1px solid rgba(255,122,46,0.25)',
                boxShadow: '0 8px 24px rgba(255,122,46,0.08), 0 2px 6px rgba(0,0,0,0.04)',
                position: 'relative'
              }}
            >
              {/* カード内右上の小さな装飾 sparkle */}
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '14px',
                  fontSize: '11px',
                  color: 'rgba(255,122,46,0.40)'
                }}
              >
                ✦
              </span>

              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  margin: 0,
                  letterSpacing: '0.08em',
                  // wordmark と揃えたブランドグラデーション文字色
                  background: 'linear-gradient(90deg, #FF7A2E 0%, #EC4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: '#FF7A2E' // fallback
                }}
              >
                🎁 招待キャンペーン
              </p>
              <p
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#1F1F23',
                  marginTop: '10px',
                  marginBottom: 0,
                  lineHeight: 1.55
                }}
              >
                友達から Cosmohype に
                <br />
                招待されています
              </p>
            </div>
          </>
        ) : (
          // Invalid code — 招待バナーは出さず、無効メッセージのみ。同じオレンジ×白のトーンに統一。
          <div
            style={{
              marginBottom: '28px',
              padding: '18px 20px',
              borderRadius: '16px',
              background: '#FFFFFF',
              border: '1px solid rgba(251,113,133,0.30)',
              boxShadow: '0 4px 14px rgba(251,113,133,0.06), 0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <p
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#DB2777',
                margin: 0,
                lineHeight: 1.55
              }}
            >
              この招待リンクは無効です
            </p>
            <p
              style={{
                fontSize: '12px',
                color: '#6B7280',
                margin: '8px 0 0 0',
                lineHeight: 1.6
              }}
            >
              アプリをダウンロードして通常の新規登録から始められます。
            </p>
          </div>
        )}

        {/* App Store CTA (single main CTA) — オレンジ solid gradient */}
        {appStoreConfigured ? (
          <a
            href={appStoreUrl}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '17px 20px',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#FFFFFF',
              background: 'linear-gradient(135deg, #FF7A2E 0%, #F97316 100%)',
              textAlign: 'center',
              textDecoration: 'none',
              touchAction: 'manipulation',
              boxShadow: '0 10px 28px rgba(249,115,22,0.35), 0 4px 8px rgba(249,115,22,0.20)',
              letterSpacing: '0.02em'
            }}
          >
            <span>App Storeからダウンロード</span>
            <span aria-hidden style={{ fontSize: '17px', lineHeight: 1, marginLeft: '2px' }}>→</span>
          </a>
        ) : (
          <div
            style={{
              display: 'block',
              width: '100%',
              padding: '17px 20px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#9CA3AF',
              background: '#FFF7ED',
              textAlign: 'center',
              border: '1px solid rgba(255,122,46,0.15)'
            }}
          >
            App Store リンク準備中
          </div>
        )}

        {/* Post-install 案内 (valid code + App Store URL 設定済のときのみ) */}
        {validFormat && appStoreConfigured && (
          <p
            style={{
              marginTop: '22px',
              fontSize: '13px',
              color: '#6B7280',
              lineHeight: 1.8
            }}
          >
            インストールしたら、この招待リンクを
            <br />
            <strong style={{ color: '#F97316', fontWeight: 700 }}>もう一度タップ</strong>
            してください。
            <br />
            アプリで招待が自動で適用されます。
          </p>
        )}

        {/* サービス紹介 (小さめ) — 上に細いオレンジ divider */}
        <div
          style={{
            marginTop: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'center'
          }}
        >
          <span
            aria-hidden
            style={{
              width: '32px',
              height: '1px',
              background:
                'linear-gradient(90deg, rgba(255,122,46,0) 0%, rgba(255,122,46,0.4) 100%)'
            }}
          />
          <span aria-hidden style={{ color: '#FF7A2E', fontSize: '10px' }}>✦</span>
          <span
            aria-hidden
            style={{
              width: '32px',
              height: '1px',
              background:
                'linear-gradient(90deg, rgba(255,122,46,0.4) 0%, rgba(255,122,46,0) 100%)'
            }}
          />
        </div>
        <p
          style={{
            marginTop: '14px',
            fontSize: '12px',
            color: '#9CA3AF',
            lineHeight: 1.7
          }}
        >
          STYLE ID 診断や、いろんなファッションの人とつながろう
        </p>
      </div>
    </div>
  )
}
