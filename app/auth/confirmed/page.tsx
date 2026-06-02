import { ConfirmedClient } from '@/components/auth/ConfirmedClient'

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>
}) {
  const { setup } = await searchParams
  return <ConfirmedClient needsSetup={setup === '1'} />
}
