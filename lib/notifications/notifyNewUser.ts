const WEBHOOK_URL = process.env.DISCORD_NEW_USER_WEBHOOK_URL

export async function notifyNewUser({
  username,
  displayName,
  styleId,
  createdAt,
}: {
  username: string
  displayName: string | null
  styleId: string | null
  createdAt: string
}) {
  if (!WEBHOOK_URL) return

  const jst = new Date(createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  const lines = [
    '🎉 **新規ユーザー登録**',
    `ユーザー名: \`${username}\``,
  ]
  if (displayName && displayName !== username) lines.push(`表示名: ${displayName}`)
  if (styleId) lines.push(`STYLE ID: ${styleId}`)
  lines.push(`登録日時: ${jst} (JST)`)
  lines.push(`プロフィール: /profile/${username}`)

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: lines.join('\n') }),
    })
    if (!res.ok) {
      console.error('[notifyNewUser] Discord webhook failed:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[notifyNewUser] Discord webhook error:', err)
  }
}
