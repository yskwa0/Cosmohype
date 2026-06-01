// Module-level singleton: survives client-side navigation within the same browser tab.
// PostDetail writes here after a successful like/save; FeedPosts reads on mount and
// on popstate (returning from another page) to immediately reflect the correct state.

export type InteractionOverride = { liked?: boolean; saved?: boolean; likeCount?: number; saveCount?: number }
const cache = new Map<string, InteractionOverride>()

export function setFeedInteraction(postId: string, update: InteractionOverride) {
  const cur = cache.get(postId) ?? {}
  cache.set(postId, { ...cur, ...update })
}

// Read without clearing — safe to call multiple times (e.g. in useState initializers).
export function peekFeedInteractions(): ReadonlyMap<string, InteractionOverride> {
  return cache
}

// Read and clear — call once per "apply" cycle (useEffect on mount, popstate handler).
export function drainFeedInteractions(): Map<string, InteractionOverride> {
  const snap = new Map(cache)
  cache.clear()
  return snap
}
