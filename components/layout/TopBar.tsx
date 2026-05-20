import type { ReactNode } from 'react'
import { ThemeLogo } from './ThemeLogo'

interface TopBarProps {
  title?: string
  showLogo?: boolean
  left?: ReactNode
  right?: ReactNode
}

export function TopBar({ title, showLogo = false, left, right }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'var(--nav-bg)' }}>
      <div className="max-w-md mx-auto flex items-center justify-between px-5 h-14">
        <div className="flex items-center gap-2">
          {left}
          {showLogo ? (
            <ThemeLogo />
          ) : (
            <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{title}</h1>
          )}
        </div>
        {right && <div className="flex items-center gap-3">{right}</div>}
      </div>
      <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--border), transparent)' }} />
    </header>
  )
}
