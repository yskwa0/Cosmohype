import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { AiFittingForm } from '@/components/ai-fitting/AiFittingForm'
import { AiFittingInfoModal } from '@/components/search/AiFittingInfoModal'
import type { TryonRow } from '@/components/ai-fitting/AiFittingForm'

export const dynamic = 'force-dynamic'

export default async function AiFittingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, tryonsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('ai_fitting_body_image_url')
      .eq('id', user.id)
      .single(),
    supabase
      .from('virtual_tryons')
      .select('id, status, result_image_url, garment_image_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const bodyPath = profileResult.data?.ai_fitting_body_image_url ?? null

  // 全身写真の signed URL を生成（1時間有効）
  let bodySignedUrl: string | null = null
  if (bodyPath) {
    const { data } = await supabase.storage.from('ai-tryons').createSignedUrl(bodyPath, 3600)
    bodySignedUrl = data?.signedUrl ?? null
  }

  // 試着履歴の表示用 signed URL をバッチ生成（1時間有効）
  type RawTryon = { id: string; status: string; result_image_url: string | null; garment_image_url: string; created_at: string }
  const rawTryons = (tryonsResult.data ?? []) as RawTryon[]

  let initialTryons: TryonRow[] = rawTryons.map(t => ({ ...t, display_url: null }))

  if (rawTryons.length > 0) {
    // 結果があれば result_image_url、なければ garment_image_url を表示する
    const displayPaths = rawTryons.map(t => t.result_image_url ?? t.garment_image_url)
    const { data: signedData } = await supabase.storage
      .from('ai-tryons')
      .createSignedUrls(displayPaths, 3600)

    initialTryons = rawTryons.map((t, i) => ({
      ...t,
      display_url: signedData?.[i]?.signedUrl ?? null,
    }))
  }

  return (
    <div className="feed-animate-in">
      <TopBar
        title="AI Fitting"
        left={<BackButton variant="purple" />}
      />

      {/* ヒーローセクション */}
      <div className="relative mx-4 mt-4 mb-5">
        <div
          className="rounded-2xl px-5 py-5 flex items-center gap-4"
          style={{
            background: 'linear-gradient(140deg, #1A0533 0%, #0D0A1F 60%, #0A0714 100%)',
            border: '1px solid rgba(124,58,237,0.28)',
            boxShadow: '0 0 30px rgba(124,58,237,0.1)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#A855F7" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.86l.58-3.57a2 2 0 00-1.34-2.23z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h2 className="text-sm font-bold mb-0.5" style={{ color: '#EDE9FE' }}>
              バーチャル試着
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,253,0.7)' }}>
              全身写真と気になる服の画像をアップロードすると、AIが着用イメージを生成します
            </p>
          </div>
        </div>
        <div className="absolute top-2 right-2 z-10">
          <AiFittingInfoModal />
        </div>
      </div>

      <AiFittingForm
        userId={user.id}
        initialBodyImagePath={bodyPath}
        initialBodySignedUrl={bodySignedUrl}
        initialTryons={initialTryons}
      />
    </div>
  )
}
