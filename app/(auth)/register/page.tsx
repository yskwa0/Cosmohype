import { AuthForm } from '@/components/auth/AuthForm'

export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return (
    <>
      <style>{`html, body { background-color: #090714 !important; }`}</style>
      <AuthForm mode="register" />
    </>
  )
}
