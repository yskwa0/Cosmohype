'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export function ThemeLogo() {
  const [isLight, setIsLight] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsLight(document.documentElement.classList.contains('theme-cream-white'))
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Link href="/feed">
      <Image
        src={isLight ? '/cosmohypebl.png' : '/cosmohypewh.png'}
        alt="Cosmohype"
        height={44}
        width={150}
        className="object-contain object-left"
      />
    </Link>
  )
}
