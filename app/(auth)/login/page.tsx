import { AuthForm } from '@/components/auth/AuthForm'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <>
      <style>{`html, body { background-color: #0A0A1A !important; }`}</style>
      <AuthForm mode="login" />
    </>
  )
}
