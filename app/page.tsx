import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/feed')

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A0533] via-[#2D0A5F] to-[#0A0A1A] flex flex-col items-center justify-between px-6 py-16 overflow-hidden relative">
      {/* 背景の星 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#7C3AED]/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[#EC4899]/20 blur-3xl" />
      </div>

      <div />

      <div className="text-center relative z-10">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-[#C084FC] via-[#F0ABFC] to-[#F9A8D4] bg-clip-text text-transparent mb-3 tracking-tight">
          Cosmohype
        </h1>
        <p className="text-[#C4B5FD] text-base mb-2">ファッション × 宇宙感 × 自分らしさ</p>
        <p className="text-[#8B5CF6]/70 text-sm">毎日のコーデをシェアしよう</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3 relative z-10">
        <Link href="/register" className="w-full">
          <Button
            fullWidth
            className="h-14 text-base bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:opacity-90 border-0"
          >
            無料ではじめる
          </Button>
        </Link>
        <Link href="/login" className="w-full">
          <Button
            fullWidth
            variant="ghost"
            className="h-14 text-base text-white/80 hover:bg-white/10"
          >
            ログイン
          </Button>
        </Link>
      </div>
    </div>
  )
}
