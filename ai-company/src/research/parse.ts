// AI HQ Phase 2B: 最小 RSS/Atom parser。
//
// XML パーサ dep を追加せず、正規表現で <item>/<entry> の主要要素を抽出。
// 崩れた feed は skip、fetcher に失敗を通知させる。
// html entity のごく基本的な decode のみ (&amp; &lt; &gt; &quot; &apos; &#N;)。
// 本文全文は保存しない (summary は 500 chars で truncate)。

export interface ParsedItem {
  externalId: string       // guid or link
  title: string
  summary: string           // <=500 chars
  url: string
  publishedAt: string | null // ISO 8601 or null
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#8217;': '’',
  '&#8216;': '‘',
  '&#8220;': '“',
  '&#8221;': '”',
  '&nbsp;': ' ',
}
function decodeEntities(s: string): string {
  let out = s
  for (const [k, v] of Object.entries(HTML_ENTITIES)) out = out.split(k).join(v)
  // decimal numeric entities
  out = out.replace(/&#(\d+);/g, (_, n) => {
    const code = Number.parseInt(n, 10)
    return code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : ''
  })
  return out
}
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
function normalize(s: string, maxLen: number): string {
  return decodeEntities(stripTags(s)).slice(0, maxLen).trim()
}

function extract(tag: string, xml: string): string | null {
  // CDATA aware: <tag>...</tag> or <tag><![CDATA[...]]></tag>
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i')
  const m = re.exec(xml)
  if (!m) return null
  return (m[1] ?? m[2] ?? '').trim()
}
function extractAttr(tag: string, attr: string, xml: string): string | null {
  // For self-closing like <link href="..." rel="alternate"/>
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"[^>]*\\/?>`, 'i')
  const m = re.exec(xml)
  return m ? m[1] : null
}

function tryDate(s: string | null | undefined): string | null {
  if (!s) return null
  const t = Date.parse(s)
  if (Number.isFinite(t)) return new Date(t).toISOString()
  return null
}

/// RSS 2.0 <item> and Atom <entry> を横断的に処理する。
export function parseFeed(xml: string): ParsedItem[] {
  const items: ParsedItem[] = []
  // <item>...</item> (RSS) OR <entry>...</entry> (Atom)
  const blocks = xml.match(/<(item|entry)[^>]*>[\s\S]*?<\/(item|entry)>/gi) ?? []
  for (const block of blocks) {
    const isAtom = /<entry[\s>]/i.test(block)
    let url = ''
    if (isAtom) {
      // Atom: <link href="..." rel="alternate"/>  or  <link>...</link>
      url = extractAttr('link', 'href', block) ?? extract('link', block) ?? ''
    } else {
      url = extract('link', block) ?? ''
    }
    const title = normalize(extract('title', block) ?? '', 300)
    const summary = normalize(
      extract('description', block) ?? extract('summary', block) ?? extract('content', block) ?? '',
      500,
    )
    const dateRaw = extract('pubDate', block) ?? extract('published', block) ?? extract('updated', block) ?? extract('dc:date', block)
    const publishedAt = tryDate(dateRaw)
    const externalId = extract('guid', block) ?? extract('id', block) ?? url
    if (!title || !url || !externalId) continue
    items.push({ externalId, title, summary, url, publishedAt })
  }
  return items
}
