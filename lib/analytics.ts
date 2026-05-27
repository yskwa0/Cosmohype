import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics, logEvent as firebaseLogEvent, isSupported } from 'firebase/analytics'
import type { Analytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Analytics インスタンスのキャッシュ（ブラウザ側のみ）
let analyticsInstance: Analytics | null = null

async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === 'undefined') return null
  if (analyticsInstance) return analyticsInstance

  const supported = await isSupported()
  if (!supported) return null

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  analyticsInstance = getAnalytics(app)
  return analyticsInstance
}

/** Firebase Analytics にイベントを送信する。SSR / 非対応環境では何もしない。 */
export async function logEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): Promise<void> {
  const analytics = await getAnalyticsInstance()
  if (!analytics) return
  firebaseLogEvent(analytics, eventName, params)
}

// ── アプリ固有イベント ──────────────────────────────────────────

export const track = {
  styleIdStart: () => logEvent('style_id_start'),
  styleIdComplete: (styleId: string) => logEvent('style_id_complete', { style_id: styleId }),

  postCreateOpen: () => logEvent('post_create_open'),
  postCreateComplete: (postId: string) => logEvent('post_create_complete', { post_id: postId }),

  feedOpen: () => logEvent('feed_open'),
  hypeOpen: () => logEvent('hype_open'),
  cosmoOpen: () => logEvent('cosmo_open'),
  columnOpen: () => logEvent('column_open'),
  columnArticleOpen: (articleId: string) => logEvent('column_article_open', { article_id: articleId }),

  shareStyleId: (styleId: string, method: string) =>
    logEvent('share_style_id', { style_id: styleId, method }),
}
