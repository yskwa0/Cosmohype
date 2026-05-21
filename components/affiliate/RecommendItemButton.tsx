'use client'

interface Props {
  itemName: string
  styleId: string
  bodyType: string
  rakutenUrl?: string
  amazonUrl?: string
  usedUrl?: string
}

export function RecommendItemButton({ itemName, styleId, bodyType, rakutenUrl, amazonUrl, usedUrl }: Props) {
  if (!rakutenUrl && !amazonUrl && !usedUrl) return null

  function handleClick(linkType: 'rakuten' | 'amazon' | 'used', url: string) {
    console.log({
      itemName,
      styleId,
      bodyType,
      linkType,
      url,
      clickedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {rakutenUrl && (
        <a
          href={rakutenUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleClick('rakuten', rakutenUrl)}
          className="flex-1 flex items-center justify-center h-9 rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: '#BF0000' }}
        >
          楽天で見る
        </a>
      )}
      {amazonUrl && (
        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleClick('amazon', amazonUrl)}
          className="flex-1 flex items-center justify-center h-9 rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: '#E47911' }}
        >
          Amazonで見る
        </a>
      )}
      {usedUrl && (
        <a
          href={usedUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleClick('used', usedUrl)}
          className="flex-1 flex items-center justify-center h-9 rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: '#2D7D46' }}
        >
          古着で探す
        </a>
      )}
    </div>
  )
}
