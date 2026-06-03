import { ConfirmedClient } from '@/components/auth/ConfirmedClient'

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>
}) {
  const { setup } = await searchParams
  return (
    <>
      <style>{`html, body { background-color: #090714 !important; }`}</style>
      <ConfirmedClient needsSetup={setup === '1'} />
    </>
  )
}
