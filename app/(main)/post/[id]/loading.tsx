import { PostDetailLoadingShell } from '@/components/post/PostDetailLoadingShell'
import { ShellLoading } from '@/components/ui/ShellLoading'

export default function Loading() {
  return (
    <PostDetailLoadingShell>
      <ShellLoading />
    </PostDetailLoadingShell>
  )
}
