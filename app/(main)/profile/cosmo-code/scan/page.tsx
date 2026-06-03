import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'

export default function CosmoCodeScanPage() {
  return (
    <>
      <TopBar title="COSMO CODEをスキャン" left={<BackButton href="/profile/cosmo-code" />} />
      <div className="flex flex-col items-center justify-center px-6 py-20 gap-3 text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          COSMO CODEページからスキャンできます
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          「友達のコードをスキャン」ボタンを<br />タップしてください
        </p>
      </div>
    </>
  )
}
