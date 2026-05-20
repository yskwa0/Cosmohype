'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center justify-center h-9 rounded-xl text-sm font-medium transition-colors"
      style={{ color: 'var(--text-muted)' }}
    >
      ログアウト
    </button>
  )
}
