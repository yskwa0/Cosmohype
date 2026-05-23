'use client'
import { useEffect } from 'react'

export function HtmlBackground({ value }: { value: string }) {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.backgroundColor
    const prevBody = body.style.backgroundColor
    html.style.backgroundColor = value
    body.style.backgroundColor = value
    return () => {
      html.style.backgroundColor = prevHtml
      body.style.backgroundColor = prevBody
    }
  }, [value])
  return null
}
