// Module-level reactive singleton — persists across client-side navigation in the same tab.
// PostCard and PostDetail both read/write here, so they always share the same state.

export type PostInteraction = {
  liked: boolean
  saved: boolean
  likeCount: number
  saveCount: number
}

const store = new Map<string, PostInteraction>()
const listeners = new Map<string, Set<() => void>>()

// Sets only if this postId is not yet in the store.
// Prevents stale server props from overwriting a newer in-session value.
export function initPostInteraction(postId: string, initial: PostInteraction): void {
  if (!store.has(postId)) {
    store.set(postId, initial)
  }
}

export function getPostInteraction(postId: string): PostInteraction | undefined {
  return store.get(postId)
}

export function updatePostInteraction(postId: string, patch: Partial<PostInteraction>): void {
  const cur = store.get(postId)
  if (!cur) return
  store.set(postId, { ...cur, ...patch })
  listeners.get(postId)?.forEach(fn => fn())
}

export function subscribePostInteraction(postId: string, listener: () => void): () => void {
  if (!listeners.has(postId)) listeners.set(postId, new Set())
  listeners.get(postId)!.add(listener)
  return () => {
    const set = listeners.get(postId)
    set?.delete(listener)
    if (set?.size === 0) listeners.delete(postId)
  }
}
