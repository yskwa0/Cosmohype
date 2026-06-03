import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/TopBar'
import { BackButton } from '@/components/ui/BackButton'
import { AccountManageSection } from '@/components/settings/AccountManageSection'
import { ThemeForm } from '@/components/settings/ThemeForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('theme')
    .eq('id', user.id)
    .single()

  return (
    <>
      <TopBar title="設定" left={<BackButton variant="purple" />} />
      <div className="px-4 pt-6 pb-8 flex flex-col gap-6">

        {/* テーマ */}
        <section>
          <p className="text-xs font-semibold px-1 mb-2" style={{ color: 'var(--text-muted)' }}>テーマ</p>
          <ThemeForm userId={user.id} initialTheme={profile?.theme ?? 'cosmic-black'} />
        </section>

        {/* アカウント設定 */}
        <section>
          <p className="text-xs font-semibold px-1 mb-2" style={{ color: 'var(--text-muted)' }}>アカウント設定</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <Link
              href="/profile/privacy"
              className="flex items-center gap-4 w-full px-5 py-4 text-sm font-medium transition-all duration-75 active:scale-[0.98] active:opacity-70"
              style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
              <span className="flex-1">アカウントのプライバシー</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
            <Link
              href="/profile/notifications"
              className="flex items-center gap-4 w-full px-5 py-4 text-sm font-medium transition-all duration-75 active:scale-[0.98] active:opacity-70"
              style={{ color: 'var(--text)' }}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </span>
              <span className="flex-1">通知設定</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
        </section>

        {/* 法的情報 */}
        <section>
          <p className="text-xs font-semibold px-1 mb-2" style={{ color: 'var(--text-muted)' }}>法的情報</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <Link
              href="/terms"
              className="flex items-center gap-4 w-full px-5 py-4 text-sm font-medium transition-all duration-75 active:scale-[0.98] active:opacity-70"
              style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </span>
              <span className="flex-1">利用規約</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
            <Link
              href="/privacy"
              className="flex items-center gap-4 w-full px-5 py-4 text-sm font-medium transition-all duration-75 active:scale-[0.98] active:opacity-70"
              style={{ color: 'var(--text)' }}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </span>
              <span className="flex-1">プライバシーポリシー</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
        </section>

        {/* サポート */}
        <section>
          <p className="text-xs font-semibold px-1 mb-2" style={{ color: 'var(--text-muted)' }}>サポート</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <a
              href="mailto:support@cosmohype.jp"
              className="flex items-center gap-4 w-full px-5 py-4 text-sm font-medium transition-all duration-75 active:scale-[0.98] active:opacity-70"
              style={{ color: 'var(--text)' }}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </span>
              <span className="flex-1">お問い合わせ</span>
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </a>
          </div>
        </section>

        {/* アカウント管理 */}
        <AccountManageSection />

      </div>
    </>
  )
}
