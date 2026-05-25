'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'cosmohype_onboarded'

export function OnboardingRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      router.replace('/onboarding')
    }
  }, [router])
  return null
}
