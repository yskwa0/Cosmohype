import Image from 'next/image'
import Link from 'next/link'

export function ThemeLogo() {
  return (
    <Link href="/feed">
      <Image
        src="/cosmohypelogo.png"
        alt="Cosmohype"
        height={44}
        width={150}
        className="object-contain object-left"
      />
    </Link>
  )
}
