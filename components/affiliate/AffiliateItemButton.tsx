'use client'

interface Props {
  itemId: string
  itemName: string
  styleId: string
  bodyType: string
  affiliateUrl: string
}

export function AffiliateItemButton({ itemId, itemName, styleId, bodyType, affiliateUrl }: Props) {
  function handleClick() {
    console.log({
      itemId,
      itemName,
      styleId,
      bodyType,
      clickedAt: new Date().toISOString(),
    })
  }

  return (
    <a
      href={affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97]"
      style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)' }}
    >
      商品を見る →
    </a>
  )
}
