// Module-level singleton: survives client-side navigation within the same browser tab.
// PostDetail writes here after a successful like/save; FeedPosts drains and applies
// on mount and on popstate (returning from another page).

type Override = { liked?: boolean; saved?: boolean }
const cache = new Map<string, Override>()

export function setFeedInteraction(postId: string, update: Override) {
  const cur = cache.get(postId) ?? {}
  cache.set(postId, { ...cur, ...update })
}

export function drainFeedInteractions(): Map<string, Override> {
  const snap = new Map(cache)
  cache.clear()
  return snap
}
