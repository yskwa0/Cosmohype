'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Post } from '@/types/database'

export function ArchiveGrid({ posts }: { posts: Post[] }) {
  const router = useRouter()

  function handleTap(postId: string) {
    sessionStorage.setItem('post_slide_from_feed', '1')
    router.push(`/archive/post/${postId}`, { scroll: false })
  }

  return (
    <div className="grid grid-cols-3 gap-[1px]" style={{ background: 'var(--bg)' }}>
      {posts.map(post => {
        const thumb = post.post_images?.[0]?.url
        return (
          <button
            key={post.id}
            className="relative block w-full"
            style={{ aspectRatio: '4/5', background: 'var(--bg-elevated)' }}
            onClick={() => handleTap(post.id)}
          >
            {thumb && (
              <Image
                src={thumb}
                alt={post.caption ?? 'コーデ'}
                fill
                className="object-cover"
                sizes="33vw"
              />
            )}
            {(post.post_images?.length ?? 0) > 1 && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-black/40 rounded-sm flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="currentColor">
                  <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                </svg>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
