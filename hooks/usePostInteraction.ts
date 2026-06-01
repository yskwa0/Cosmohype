'use client'
import { useSyncExternalStore, useCallback, useRef } from 'react'
import {
  initPostInteraction,
  getPostInteraction,
  updatePostInteraction,
  subscribePostInteraction,
  type PostInteraction,
} from '@/lib/postInteractionStore'

// useSyncExternalStore reads from the store synchronously on every render,
// including when a component is restored from Next.js router cache.
// This means PostCard and PostDetail always show the same state with zero delay.
export function usePostInteraction(postId: string, initial: PostInteraction) {
  const initialRef = useRef(initial)

  initPostInteraction(postId, initialRef.current)

  const subscribe = useCallback(
    (cb: () => void) => subscribePostInteraction(postId, cb),
    [postId],
  )
  const getSnapshot = useCallback(
    () => getPostInteraction(postId) ?? initialRef.current,
    [postId],
  )
  const getServerSnapshot = useCallback(() => initialRef.current, [])

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const update = useCallback(
    (patch: Partial<PostInteraction>) => updatePostInteraction(postId, patch),
    [postId],
  )

  return [state, update] as const
}
