import Image from 'next/image'
import { cn } from '@/lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizeMap: Record<Size, { px: number; className: string }> = {
  xs: { px: 24, className: 'w-6 h-6 text-xs' },
  sm: { px: 32, className: 'w-8 h-8 text-sm' },
  md: { px: 40, className: 'w-10 h-10 text-base' },
  lg: { px: 56, className: 'w-14 h-14 text-lg' },
  xl: { px: 80, className: 'w-20 h-20 text-2xl' },
}

interface AvatarProps {
  src?: string | null
  username?: string | null
  size?: Size
  className?: string
}

export function Avatar({ src, username, size = 'md', className }: AvatarProps) {
  const { px, className: sizeClass } = sizeMap[size]

  if (src) {
    return (
      <div className={cn('rounded-full overflow-hidden flex-shrink-0', sizeClass, className)}>
        <Image
          src={src}
          alt={username ?? 'avatar'}
          width={px}
          height={px}
          className="object-cover w-full h-full"
        />
      </div>
    )
  }

  return (
    <div
      className={cn('rounded-full overflow-hidden flex-shrink-0', sizeClass, className)}
      style={{
        background: 'radial-gradient(circle at 38% 32%, #2D1280 0%, #0D0529 72%)',
        boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.4)',
      }}
    >
      <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden>
        {/* background star dots */}
        <circle cx="9"  cy="9"  r="1"   fill="white" opacity="0.40" />
        <circle cx="33" cy="7"  r="0.7" fill="white" opacity="0.35" />
        <circle cx="35" cy="29" r="0.6" fill="white" opacity="0.28" />
        <circle cx="7"  cy="32" r="0.8" fill="white" opacity="0.38" />
        {/* sparkle ✦ top-right */}
        <line x1="32" y1="9.2" x2="32" y2="13.8" stroke="#FCD34D" strokeWidth="0.9" strokeLinecap="round" opacity="0.65" />
        <line x1="29.7" y1="11.5" x2="34.3" y2="11.5" stroke="#FCD34D" strokeWidth="0.9" strokeLinecap="round" opacity="0.65" />
        <line x1="30.4" y1="9.9" x2="33.6" y2="13.1" stroke="#FCD34D" strokeWidth="0.5" strokeLinecap="round" opacity="0.35" />
        <line x1="33.6" y1="9.9" x2="30.4" y2="13.1" stroke="#FCD34D" strokeWidth="0.5" strokeLinecap="round" opacity="0.35" />
        {/* orbital ring */}
        <ellipse cx="20" cy="20" rx="11" ry="3.6" fill="none" stroke="#8B5CF6" strokeWidth="0.8" opacity="0.5" transform="rotate(-28 20 20)" />
        {/* planet body */}
        <circle cx="20" cy="20" r="6.5" fill="#3B0F8C" />
        <circle cx="20" cy="20" r="6.5" fill="none" stroke="#A78BFA" strokeWidth="0.7" opacity="0.55" />
        {/* subtle planet highlight */}
        <ellipse cx="17.5" cy="17.5" rx="2.5" ry="1.5" fill="white" opacity="0.07" transform="rotate(-30 17.5 17.5)" />
        {/* outer edge ring */}
        <circle cx="20" cy="20" r="19" fill="none" stroke="#7C3AED" strokeWidth="0.4" opacity="0.4" />
      </svg>
    </div>
  )
}
