import Link from 'next/link'
import { StyleAlien } from './StyleAlien'
import { STYLE_TYPES } from '@/lib/style-id/styleTypes'
import type { StyleId } from '@/lib/style-id/types'

interface Props {
  styleId: string
  variant?: 'default' | 'overlay'
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export function StyleIdBadge({ styleId, variant = 'default', onClick }: Props) {
  const style = STYLE_TYPES[styleId as StyleId]
  if (!style) return null

  if (variant === 'overlay') {
    return (
      <Link
        href={`/cosmo/${styleId}`}
        onClick={onClick}
        className="inline-flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-full backdrop-blur-sm transition-opacity active:opacity-70"
        style={{ background: 'rgba(88,28,220,0.45)', border: '1px solid rgba(168,85,247,0.45)' }}
      >
        <StyleAlien styleId={styleId as StyleId} size={14} />
        <span className="text-[10px] font-bold text-white/90 leading-none">
          {style.name}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={`/cosmo/${styleId}`}
      onClick={onClick}
      className="inline-flex items-center gap-1 flex-shrink-0 px-2 py-0.5 rounded-full transition-opacity active:opacity-70"
      style={{ background: 'var(--purple-dim)', border: '1px solid var(--border)' }}
    >
      <StyleAlien styleId={styleId as StyleId} size={18} />
      <span className="text-[11px] font-semibold leading-none" style={{ color: 'var(--purple)' }}>
        {style.name}
      </span>
    </Link>
  )
}
