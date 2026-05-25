import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { HtmlBackground } from '@/components/ui/HtmlBackground'
import { OnboardingRedirect } from '@/components/onboarding/OnboardingRedirect'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/feed')

  return (
    <>
      {/*
        メインページと同じ方式：html/body の background-color をページ背景に合わせるだけ。
        globals.css の html { background: var(--bg) } と同じ考え方。
        overflow は一切触らない。バウンス・スクロールの動きはそのまま残す。
      */}
      <OnboardingRedirect />
      <style>{`
        html, body { background-color: #0A0A1A !important; }
        .top-spring-btn {
          transition: transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1);
          display: block;
        }
        .top-spring-btn:active {
          transform: scale(0.93);
          transition: transform 70ms ease-in;
        }
      `}</style>
      <HtmlBackground value="#0A0A1A" />

      <div
        className="min-h-screen flex flex-col items-center justify-between px-6 py-16 overflow-hidden relative"
        style={{ background: 'linear-gradient(to bottom, #0A0A1A 0%, #1A0533 20%, #2D0A5F 50%, #1A0533 80%, #0A0A1A 100%)' }}
      >
        {/* 背景の星 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#7C3AED]/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[#EC4899]/20 blur-3xl" />
        </div>

        <div />

        <div className="text-center relative z-10">
          <Image
            src="/cosmohypelogo.png"
            alt="Cosmohype"
            width={260}
            height={80}
            className="mx-auto mb-3"
            style={{ objectFit: 'contain' }}
            priority
          />
          <p className="text-[#C4B5FD] text-base mb-2">コーデでつながる、ファッションの銀河</p>
          <p className="text-[#8B5CF6]/70 text-sm">毎日のコーデをシェアしよう</p>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3 relative z-10">
          <Link href="/register" className="top-spring-btn w-full">
            <Button
              fullWidth
              className="h-14 text-base bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:opacity-90 border-0"
            >
              新規登録
            </Button>
          </Link>
          <Link href="/login" className="top-spring-btn w-full">
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
    </>
  )
}
