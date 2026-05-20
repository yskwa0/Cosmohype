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
  const initial = username?.[0]?.toUpperCase() ?? '?'

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center flex-shrink-0',
        sizeClass,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={username ?? 'avatar'}
          width={px}
          height={px}
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="font-semibold text-white">{initial}</span>
      )}
    </div>
  )
}
