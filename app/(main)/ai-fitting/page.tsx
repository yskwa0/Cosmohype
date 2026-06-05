import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { AiFittingForm } from '@/components/ai-fitting/AiFittingForm'

export const dynamic = 'force-dynamic'

export default async function AiFittingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="feed-animate-in">
      <TopBar
        title="AI Fitting"
        left={<BackButton variant="purple" />}
      />

      {/* ヒーローセクション */}
      <div
        className="mx-4 mt-4 mb-5 rounded-2xl px-5 py-5 flex items-center gap-4"
        style={{
          background: 'linear-gradient(140deg, #1A0533 0%, #0D0A1F 60%, #0A0714 100%)',
          border: '1px solid rgba(124,58,237,0.28)',
          boxShadow: '0 0 30px rgba(124,58,237,0.1)',
        }}
      >
        {/* アイコン */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="#A855F7" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.86H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.86l.58-3.57a2 2 0 00-1.34-2.23z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold mb-0.5" style={{ color: '#EDE9FE' }}>
            バーチャル試着
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,253,0.7)' }}>
            全身写真と気になる服の画像をアップロードすると、AIが着用イメージを生成します
          </p>
        </div>
      </div>

      <AiFittingForm userId={user.id} />
    </div>
  )
}
