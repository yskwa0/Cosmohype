const KEY_TOP = 'feed_scroll_top'
const KEY_PANEL = 'feed_scroll_panel'
const KEY_ARM = 'feed_scroll_restore'

export function saveFeedScroll(scrollTop: number, panelIdx: number) {
  sessionStorage.setItem(KEY_TOP, String(scrollTop))
  sessionStorage.setItem(KEY_PANEL, String(panelIdx))
}

// Called by the back button — marks that the next feed mount should restore
export function armFeedScrollRestore() {
  sessionStorage.setItem(KEY_ARM, '1')
}

// Returns scroll state only when armed (i.e. coming from back button)
export function readFeedScroll(): { scrollTop: number; panelIdx: number } | null {
  if (sessionStorage.getItem(KEY_ARM) !== '1') return null
  const top = sessionStorage.getItem(KEY_TOP)
  if (top === null) return null
  return {
    scrollTop: Number(top),
    panelIdx: Number(sessionStorage.getItem(KEY_PANEL) ?? '0'),
  }
}

export function disarmFeedScroll() {
  sessionStorage.removeItem(KEY_ARM)
}

export function clearFeedScroll() {
  sessionStorage.removeItem(KEY_ARM)
  sessionStorage.removeItem(KEY_TOP)
  sessionStorage.removeItem(KEY_PANEL)
}
