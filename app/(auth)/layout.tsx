import { EdgeSwipeBack } from '@/components/ui/EdgeSwipeBack'

// (auth) pages share a <main> element so EdgeSwipeBack can find and animate it
// on left-edge swipe-back gestures (same mechanism as (main)/layout.tsx).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EdgeSwipeBack />
      <main>{children}</main>
    </>
  )
}
