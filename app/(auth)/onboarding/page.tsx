'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const STORAGE_KEY = 'cosmohype_onboarded'

type Slide = { id: string; title: string; subtitle: string; body?: string }

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    title: 'Cosmohypeへようこそ',
    subtitle: 'コーデでつながる、ファッションの銀河',
    body: 'Cosmohypeは、あなたのスタイルが見つかるファッションSNS。',
  },
  {
    id: 'share',
    title: 'コーデをシェアしよう',
    subtitle: '毎日のコーデを投稿して\nフォロワーと感性をつなごう',
    body: '診断で自分の系統を知り、同じ感性の人と繋がり、コーデを投稿したり、着こなしのヒントが見つかる場所。',
  },
  {
    id: 'cosmo',
    title: 'COSMO',
    subtitle: '同じ感性の仲間が集まる、宇宙の広場',
    body: 'STYLE IDが近いユーザーと出会い、新しいスタイルのインスピレーションを見つけよう。',
  },
  {
    id: 'hype',
    title: 'HYPE',
    subtitle: '今日のテーマで、コーデを競え',
    body: '毎日更新されるデイリーチャレンジ。テーマに合わせたコーデを投稿して、あなたのセンスを発揮しよう。',
  },
  {
    id: 'styleid',
    title: 'STYLE ID',
    subtitle: 'あなたのファッション系統を解き明かせ',
    body: 'いくつかの質問に答えるだけで、自分だけのスタイルタイプが分かる診断。まずは自分を知ることから。',
  },
  {
    id: 'ai',
    title: 'AIコーデ診断',
    subtitle: 'AIがあなたのコーデを読み解く',
    body: '投稿コーデをAIが分析し、スタイルアップのアドバイスをくれる。センスの磨き方をAIと一緒に探そう。',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.backgroundColor
    const prevBody = body.style.backgroundColor
    html.style.backgroundColor = '#0A0A1A'
    body.style.backgroundColor = '#0A0A1A'
    return () => {
      html.style.backgroundColor = prevHtml
      body.style.backgroundColor = prevBody
    }
  }, [])

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) {
      router.replace('/')
    } else {
      setReady(true)
    }
  }, [router])

  function done(dest: '/register' | '/') {
    localStorage.setItem(STORAGE_KEY, '1')
    router.push(dest)
  }

  function handleTap() {
    if (idx < SLIDES.length - 1) setIdx(i => i + 1)
  }

  const slide = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  if (!ready) {
    return <div className="min-h-screen" style={{ background: '#0A0A1A' }} />
  }

  return (
    <>
      <style>{`
        html, body { background-color: #0A0A1A !important; }

        @keyframes ob-rise-illus {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ob-rise-text {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ob-illus {
          animation: ob-rise-illus 1.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .ob-text {
          animation: ob-rise-text 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.38s both;
        }
      `}</style>

      {/* Full-screen tap zone */}
      <div
        style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', background: 'linear-gradient(to bottom, #0A0A1A 0%, #1A0533 20%, #2D0A5F 50%, #1A0533 80%, #0A0A1A 100%)' }}
        onClick={handleTap}
      >
        {/* Glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-[#7C3AED]/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-64 h-64 rounded-full bg-[#EC4899]/15 blur-3xl" />
        </div>

        {/* Star dots */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {[
            [14,10],[82,7],[58,17],[29,20],[91,28],[7,38],
            [68,44],[43,53],[19,62],[87,58],[4,78],[74,82],
            [52,88],[35,76],[96,72],
          ].map(([x,y],i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{ left:`${x}%`, top:`${y}%`, width: i%3===0?2:1.5, height: i%3===0?2:1.5, opacity: 0.45+(i%3)*0.15 }} />
          ))}
        </div>

        {/* Skip — stopPropagation so tap doesn't also advance */}
        <div className="flex justify-end px-6 pb-2 relative z-10 min-h-[72px]"
          style={{ paddingTop: 'max(56px, calc(env(safe-area-inset-top) + 16px))' }}>
          {!isLast && (
            <button
              onClick={e => { e.stopPropagation(); done('/') }}
              className="text-sm px-4 py-2 rounded-full transition-opacity active:opacity-50"
              style={{ color: '#8B7AAF' }}
            >
              スキップ
            </button>
          )}
        </div>

        {/* Slide content — key=idx remounts on every change to replay animations */}
        <div key={idx} className="flex-1 flex flex-col items-center justify-center px-8 pb-4 relative z-10">

          {/* Illustration */}
          <div className="ob-illus mb-9 flex items-center justify-center">
            {slide.id === 'welcome'  && <WelcomeIllustration />}
            {slide.id === 'share'    && <ShareIllustration />}
            {slide.id === 'cosmo'    && <CosmoIllustration />}
            {slide.id === 'hype'     && <HypeIllustration />}
            {slide.id === 'styleid'  && <StyleIdIllustration />}
            {slide.id === 'ai'       && <AiIllustration />}
          </div>

          {/* Text */}
          <div className="ob-text flex flex-col items-center gap-0">
            <h1 className="text-[22px] font-bold text-center mb-3 leading-snug" style={{ color: '#F5F3FF' }}>
              {slide.title}
            </h1>
            <p className="text-xs text-center leading-relaxed max-w-xs" style={{ color: '#8B7AAF', whiteSpace: 'pre-line' }}>
              {slide.subtitle}
            </p>
            {slide.body && (
              <p className="text-sm text-center leading-loose mt-4 max-w-[264px]" style={{ color: '#C4BAE0' }}>
                {slide.body}
              </p>
            )}
          </div>
        </div>

        {/* Bottom area */}
        <div className="px-6 relative z-10 flex flex-col items-center gap-3"
          style={{ minHeight: 120, paddingBottom: 'max(56px, calc(env(safe-area-inset-bottom) + 32px))' }}>
          {isLast && (
            <>
              <button
                onClick={e => { e.stopPropagation(); done('/register') }}
                className="w-full h-14 rounded-2xl text-base font-semibold transition-opacity active:opacity-80"
                style={{ background: 'linear-gradient(to right, #7C3AED, #EC4899)', color: '#fff' }}
              >
                はじめる
              </button>
              <button
                onClick={e => { e.stopPropagation(); done('/') }}
                className="w-full h-10 text-sm transition-opacity active:opacity-60"
                style={{ color: '#8B7AAF' }}
              >
                すでにアカウントをお持ちの方
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Illustrations ─────────────────────────────────────── */

function WelcomeIllustration() {
  return (
    <div className="flex flex-col items-center gap-6">
      <Image src="/cosmohypelogo.png" alt="Cosmohype" width={200} height={62} style={{ objectFit: 'contain' }} priority />
      <div className="relative" style={{ width: 96, height: 96 }}>
        <svg viewBox="0 0 96 96" width={96} height={96} fill="none">
          <defs>
            <radialGradient id="ob-gem-grad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="100%" stopColor="#7C3AED" />
            </radialGradient>
          </defs>
          <path d="M48 8 L80 36 L48 88 L16 36Z" fill="url(#ob-gem-grad)" opacity="0.85" />
          <path d="M48 8 L80 36 L48 52 L16 36Z" fill="white" opacity="0.18" />
          <path d="M48 52 L80 36 L48 88Z" fill="#4C1D95" opacity="0.3" />
          <circle cx="48" cy="38" r="7" fill="white" opacity="0.55" />
          <g opacity="0.9">
            <path d="M12 20 L13.5 16 L15 20 L19 21.5 L15 23 L13.5 27 L12 23 L8 21.5Z" fill="#E9D5FF" />
            <path d="M78 12 L79 9 L80 12 L83 13 L80 14 L79 17 L78 14 L75 13Z" fill="#FBCFE8" />
            <path d="M82 72 L83 70 L84 72 L86 73 L84 74 L83 76 L82 74 L80 73Z" fill="#C084FC" />
          </g>
        </svg>
      </div>
    </div>
  )
}

function ShareIllustration() {
  return (
    <div className="relative" style={{ width: 160, height: 160 }}>
      <svg viewBox="0 0 160 160" width={160} height={160} fill="none">
        <defs>
          <linearGradient id="ob-share-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="ob-share-card" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D1B69" />
            <stop offset="100%" stopColor="#1A0533" />
          </linearGradient>
        </defs>
        <rect x="38" y="12" width="84" height="136" rx="16" fill="url(#ob-share-bg)" stroke="rgba(168,85,247,0.35)" strokeWidth="1.5" />
        <rect x="48" y="34" width="64" height="72" rx="8" fill="url(#ob-share-card)" />
        <rect x="52" y="38" width="56" height="44" rx="5" fill="rgba(124,58,237,0.3)" />
        <path d="M72 46 Q80 42 88 46 L90 56 L70 56Z" fill="#A855F7" opacity="0.7" />
        <rect x="74" y="56" width="12" height="18" rx="3" fill="#7C3AED" opacity="0.6" />
        <rect x="52" y="88" width="36" height="4" rx="2" fill="rgba(168,85,247,0.4)" />
        <rect x="52" y="96" width="24" height="3" rx="1.5" fill="rgba(168,85,247,0.25)" />
        <path d="M52 108 C52 106 53.5 105 55 106 C56.5 105 58 106 58 108 C58 110.5 55 112 55 112 C55 112 52 110.5 52 108Z" fill="#EC4899" opacity="0.8" />
        <rect x="62" y="107" width="12" height="2.5" rx="1.25" fill="rgba(168,85,247,0.4)" />
        <rect x="68" y="154" width="24" height="4" rx="2" fill="rgba(168,85,247,0.3)" />
        <circle cx="120" cy="52" r="16" fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.4)" strokeWidth="1.5" />
        <path d="M120 60 L120 44M114 50 L120 44 L126 50" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function CosmoIllustration() {
  return (
    <div className="relative" style={{ width: 160, height: 160 }}>
      <svg viewBox="0 0 160 160" width={160} height={160} fill="none">
        <defs>
          <radialGradient id="ob-cosmo-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="80" cy="80" rx="62" ry="24" stroke="rgba(168,85,247,0.2)" strokeWidth="1" fill="none" />
        <ellipse cx="80" cy="80" rx="62" ry="24" stroke="rgba(168,85,247,0.12)" strokeWidth="1" fill="none" transform="rotate(60 80 80)" />
        <ellipse cx="80" cy="80" rx="62" ry="24" stroke="rgba(236,72,153,0.12)" strokeWidth="1" fill="none" transform="rotate(-60 80 80)" />
        <circle cx="80" cy="80" r="22" fill="url(#ob-cosmo-glow)" />
        <circle cx="80" cy="80" r="16" fill="rgba(124,58,237,0.4)" stroke="rgba(168,85,247,0.6)" strokeWidth="1.5" />
        <path d="M68 90 L80 62 L92 90Z" fill="#C084FC" opacity="0.5" />
        <path d="M68 90 L80 78 L92 90Z" fill="white" opacity="0.7" />
        <circle cx="80" cy="76" r="5" fill="#EC4899" />
        {[
          { cx: 18,  cy: 80,  c: '#7C3AED' },
          { cx: 142, cy: 80,  c: '#EC4899' },
          { cx: 80,  cy: 22,  c: '#A855F7' },
          { cx: 130, cy: 122, c: '#7C3AED' },
          { cx: 30,  cy: 122, c: '#EC4899' },
        ].map((u, i) => (
          <g key={i}>
            <circle cx={u.cx} cy={u.cy} r="12" fill={`${u.c}20`} stroke={`${u.c}50`} strokeWidth="1" />
            <circle cx={u.cx} cy={u.cy - 3} r="4" fill={u.c} opacity="0.85" />
            <path d={`M${u.cx-6} ${u.cy+8} C${u.cx-6} ${u.cy+3} ${u.cx+6} ${u.cy+3} ${u.cx+6} ${u.cy+8}`} fill={u.c} opacity="0.6" />
          </g>
        ))}
      </svg>
    </div>
  )
}

function HypeIllustration() {
  return (
    <div className="relative" style={{ width: 148, height: 148 }}>
      <svg viewBox="0 0 148 148" width={148} height={148} fill="none">
        <defs>
          <radialGradient id="ob-hype-core" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#F9A8D4" />
            <stop offset="50%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#7C3AED" />
          </radialGradient>
          <radialGradient id="ob-hype-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="74" cy="74" r="62" fill="url(#ob-hype-glow)" />
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180
          const x1 = 74 + Math.cos(rad) * 36
          const y1 = 74 + Math.sin(rad) * 36
          const x2 = 74 + Math.cos(rad) * (i%2===0 ? 62 : 52)
          const y2 = 74 + Math.sin(rad) * (i%2===0 ? 62 : 52)
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={i%2===0 ? 'rgba(236,72,153,0.55)' : 'rgba(168,85,247,0.4)'}
            strokeWidth={i%2===0 ? 2 : 1.5} strokeLinecap="round" />
        })}
        <path d="M74 26 L104 54 L74 122 L44 54Z" fill="url(#ob-hype-core)" opacity="0.9" />
        <path d="M74 26 L104 54 L74 74 L44 54Z" fill="white" opacity="0.22" />
        <path d="M74 74 L104 54 L74 122Z" fill="#4C1D95" opacity="0.25" />
        <circle cx="74" cy="56" r="9" fill="white" opacity="0.5" />
        <rect x="52" y="50" width="44" height="14" rx="7" fill="rgba(236,72,153,0.85)" />
        <text x="74" y="61" textAnchor="middle" fontSize="8" fontWeight="800" letterSpacing="2" fill="white" fontFamily="system-ui">HYPE</text>
        <path d="M20 32 L21.5 28 L23 32 L27 33.5 L23 35 L21.5 39 L20 35 L16 33.5Z" fill="#FBCFE8" opacity="0.9" />
        <path d="M122 20 L123 17.5 L124 20 L126.5 21 L124 22 L123 24.5 L122 22 L119.5 21Z" fill="#E9D5FF" opacity="0.9" />
        <path d="M128 112 L129 110 L130 112 L132 113 L130 114 L129 116 L128 114 L126 113Z" fill="#FBCFE8" opacity="0.8" />
      </svg>
    </div>
  )
}

function StyleIdIllustration() {
  return (
    <div className="relative" style={{ width: 160, height: 148 }}>
      <svg viewBox="0 0 160 148" width={160} height={148} fill="none">
        <defs>
          <linearGradient id="ob-sid-card" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D1B69" />
            <stop offset="100%" stopColor="#1A0A3D" />
          </linearGradient>
        </defs>
        <rect x="20" y="24" width="120" height="100" rx="14" fill="url(#ob-sid-card)" stroke="rgba(168,85,247,0.4)" strokeWidth="1.5" />
        <rect x="20" y="24" width="120" height="28" rx="14" fill="rgba(124,58,237,0.4)" />
        <rect x="20" y="38" width="120" height="14" fill="rgba(124,58,237,0.4)" />
        <text x="80" y="43" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing="2.5" fill="white" fontFamily="system-ui" opacity="0.9">STYLE ID</text>
        <ellipse cx="80" cy="72" rx="16" ry="13" fill="rgba(168,85,247,0.7)" />
        <ellipse cx="74" cy="70" rx="4" ry="5" fill="#0A0A1A" />
        <ellipse cx="86" cy="70" rx="4" ry="5" fill="#0A0A1A" />
        <circle cx="75" cy="69" r="1.5" fill="#C084FC" />
        <circle cx="87" cy="69" r="1.5" fill="#C084FC" />
        <line x1="74" y1="59" x2="70" y2="50" stroke="rgba(168,85,247,0.7)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="70" cy="49" r="3" fill="#EC4899" />
        <line x1="86" y1="59" x2="90" y2="50" stroke="rgba(168,85,247,0.7)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="90" cy="49" r="3" fill="#A855F7" />
        <path d="M66 82 Q80 88 94 82 L90 104 L70 104Z" fill="rgba(124,58,237,0.5)" />
        <rect x="64" y="106" width="32" height="10" rx="5" fill="rgba(168,85,247,0.3)" stroke="rgba(168,85,247,0.5)" strokeWidth="1" />
        <text x="80" y="114" textAnchor="middle" fontSize="6" fill="#C084FC" fontFamily="system-ui" fontWeight="700">YOUR TYPE</text>
        <path d="M30 68 L31 65 L32 68 L35 69 L32 70 L31 73 L30 70 L27 69Z" fill="#E9D5FF" opacity="0.7" />
        <path d="M126 82 L127 80 L128 82 L130 83 L128 84 L127 86 L126 84 L124 83Z" fill="#FBCFE8" opacity="0.7" />
      </svg>
    </div>
  )
}

function AiIllustration() {
  return (
    <div className="relative" style={{ width: 160, height: 148 }}>
      <svg viewBox="0 0 160 148" width={160} height={148} fill="none">
        <defs>
          <linearGradient id="ob-ai-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="ob-ai-scan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0" />
            <stop offset="50%" stopColor="#A855F7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x="44" y="18" width="72" height="112" rx="8" fill="url(#ob-ai-grad)" stroke="rgba(168,85,247,0.3)" strokeWidth="1" />
        <path d="M64 34 Q80 28 96 34 L100 54 L80 50 L60 54Z" fill="rgba(168,85,247,0.4)" />
        <rect x="66" y="54" width="28" height="60" rx="6" fill="rgba(124,58,237,0.3)" />
        <rect x="44" y="62" width="72" height="2" fill="url(#ob-ai-scan)" opacity="0.9" />
        <rect x="44" y="74" width="72" height="1.5" fill="url(#ob-ai-scan)" opacity="0.6" />
        <rect x="44" y="86" width="72" height="1" fill="url(#ob-ai-scan)" opacity="0.4" />
        <path d="M44 28 L44 18 L54 18" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M116 28 L116 18 L106 18" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M44 120 L44 130 L54 130" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M116 120 L116 130 L106 130" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
        {[
          { cx:20, cy:40, label:'AI' }, { cx:140, cy:50, label:'✦' },
          { cx:16, cy:100, label:'✦' }, { cx:144, cy:100, label:'AI' },
        ].map((n,i) => (
          <g key={i}>
            <circle cx={n.cx} cy={n.cy} r="12" fill="rgba(124,58,237,0.2)" stroke="rgba(168,85,247,0.45)" strokeWidth="1" />
            <text x={n.cx} y={n.cy+4} textAnchor="middle" fontSize={n.label==='AI'?8:10} fontWeight="800" fill="#C084FC" fontFamily="system-ui">{n.label}</text>
          </g>
        ))}
        <line x1="32" y1="40" x2="44" y2="50" stroke="rgba(168,85,247,0.3)" strokeWidth="1" strokeDasharray="3 2" />
        <line x1="128" y1="50" x2="116" y2="55" stroke="rgba(168,85,247,0.3)" strokeWidth="1" strokeDasharray="3 2" />
        <line x1="28" y1="100" x2="44" y2="95" stroke="rgba(168,85,247,0.25)" strokeWidth="1" strokeDasharray="3 2" />
        <line x1="132" y1="100" x2="116" y2="95" stroke="rgba(168,85,247,0.25)" strokeWidth="1" strokeDasharray="3 2" />
        <circle cx="104" cy="34" r="12" fill="rgba(236,72,153,0.85)" />
        <path d="M98 34 L102 38 L110 30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
