import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { ScanPlaceholder } from '@/components/profile/ScanPlaceholder'

export default function CosmoCodeScanPage() {
  return (
    <>
      <TopBar title="COSMO CODEをスキャン" left={<BackButton href="/profile/cosmo-code" />} />
      <div className="flex flex-col items-center px-6 py-10 gap-8">
        {/* 説明 */}
        <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--text-sub)' }}>
          友達のCOSMO CODEを読み取って<br />プロフィールを開けます
        </p>

        {/* カメラビューエリア（仮） */}
        <div
          className="relative w-full max-w-xs aspect-square rounded-3xl overflow-hidden flex flex-col items-center justify-center gap-3"
          style={{
            background: 'linear-gradient(160deg, #1a0050 0%, #0D0529 60%, #150040 100%)',
            border: '1px solid rgba(124,58,237,0.35)',
          }}
        >
          {/* スキャン枠 */}
          <div className="relative w-48 h-48">
            <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: '#7C3AED' }} />
            <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: '#7C3AED' }} />
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: '#7C3AED' }} />
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: '#7C3AED' }} />
          </div>
          <p className="text-xs" style={{ color: 'rgba(167,139,250,0.6)' }}>
            ここにカメラが表示されます
          </p>
        </div>

        {/* カメラ起動ボタン（仮） */}
        <ScanPlaceholder />
      </div>
    </>
  )
}
