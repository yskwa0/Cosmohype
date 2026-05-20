import type { StyleId } from '@/lib/style-id/types'

export function StyleAlien({ styleId, size = 120 }: { styleId: StyleId; size?: number }) {
  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderAlien(styleId)}
    </svg>
  )
}

function renderAlien(id: StyleId) {
  switch (id) {
    case 'COSMIC_REBEL':  return <CosmicRebel />
    case 'SOFT_DREAMER':  return <SoftDreamer />
    case 'URBAN_EDGE':    return <UrbanEdge />
    case 'CLASSIC_ELITE': return <ClassicElite />
    case 'FREE_SPIRIT':   return <FreeSpirit />
    case 'DARK_POET':     return <DarkPoet />
    case 'RETRO_WAVE':    return <RetroWave />
    case 'MINIMAL_SOUL':  return <MinimalSoul />
    default:              return null
  }
}

/* ─────────────────────── COSMIC REBEL ─────────────────────── */
function CosmicRebel() {
  return (
    <>
      {/* Neck + body */}
      <rect x="44" y="94" width="12" height="14" rx="4" fill="#2A0644"/>
      <ellipse cx="50" cy="112" rx="16" ry="8" fill="#2A0644"/>
      {/* Spikes behind head (hot-pink triangles sticking out left) */}
      <path d="M26,44 L4,14 L30,34 Z"  fill="#EC4899"/>
      <path d="M30,36 L12,8 L34,28 Z"  fill="#F472B6"/>
      <path d="M34,30 L22,2 L38,24 Z"  fill="#DB2777"/>
      {/* Head */}
      <ellipse cx="50" cy="60" rx="30" ry="34" fill="#2A0644"/>
      <ellipse cx="50" cy="60" rx="30" ry="34" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* Right antenna */}
      <line x1="74" y1="36" x2="84" y2="12" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="85" cy="9" r="5" fill="#EC4899"/>
      <circle cx="85" cy="9" r="2.5" fill="#fff" opacity="0.6"/>
      {/* Eyes */}
      <ellipse cx="36" cy="54" rx="9" ry="8" fill="#6D28D9"/>
      <ellipse cx="36" cy="54" rx="5" ry="7" fill="#EC4899"/>
      <circle  cx="36" cy="54" r="3"   fill="#0F0020"/>
      <circle  cx="37.5" cy="51.5" r="1.5" fill="white" opacity="0.9"/>
      <ellipse cx="64" cy="54" rx="9" ry="8" fill="#6D28D9"/>
      <ellipse cx="64" cy="54" rx="5" ry="7" fill="#EC4899"/>
      <circle  cx="64" cy="54" r="3"   fill="#0F0020"/>
      <circle  cx="65.5" cy="51.5" r="1.5" fill="white" opacity="0.9"/>
      {/* Nose */}
      <circle cx="47" cy="65" r="1.8" fill="#7C3AED"/>
      <circle cx="53" cy="65" r="1.8" fill="#7C3AED"/>
      {/* Smirk */}
      <path d="M38,74 Q52,84 64,73" stroke="#EC4899" strokeWidth="2.2" strokeLinecap="round"/>
    </>
  )
}

/* ─────────────────────── SOFT DREAMER ─────────────────────── */
function SoftDreamer() {
  return (
    <>
      {/* Neck + body */}
      <rect x="44" y="93" width="12" height="15" rx="4" fill="#F9A8D4"/>
      <ellipse cx="50" cy="111" rx="16" ry="8" fill="#F9A8D4"/>
      {/* Fluffy hair puffs (behind head) */}
      <ellipse cx="22" cy="24" rx="17" ry="14" fill="#E9D5FF"/>
      <ellipse cx="78" cy="24" rx="17" ry="14" fill="#FBCFE8"/>
      <ellipse cx="50" cy="14" rx="15" ry="12" fill="#F3E8FF"/>
      {/* Head */}
      <ellipse cx="50" cy="60" rx="30" ry="34" fill="#FDD0DF"/>
      <ellipse cx="50" cy="60" rx="30" ry="34" fill="none" stroke="#F9A8D4" strokeWidth="1.5"/>
      {/* Flower on top */}
      <circle cx="50" cy="14" r="4"   fill="#F472B6"/>
      <circle cx="44" cy="11" r="3"   fill="#FBCFE8"/>
      <circle cx="56" cy="11" r="3"   fill="#FBCFE8"/>
      <circle cx="50" cy="14" r="2.5" fill="#FDE68A"/>
      {/* Rosy cheeks */}
      <ellipse cx="27" cy="68" rx="7" ry="4" fill="#FDA4AF" opacity="0.45"/>
      <ellipse cx="73" cy="68" rx="7" ry="4" fill="#FDA4AF" opacity="0.45"/>
      {/* Eyes */}
      <ellipse cx="36" cy="53" rx="9" ry="10" fill="#E9D5FF"/>
      <ellipse cx="36" cy="53" rx="5" ry="8"  fill="#A855F7"/>
      <circle  cx="36" cy="53" r="3.5"        fill="#1A0030"/>
      <circle  cx="37.5" cy="50" r="1.8"      fill="white"/>
      <ellipse cx="64" cy="53" rx="9" ry="10" fill="#E9D5FF"/>
      <ellipse cx="64" cy="53" rx="5" ry="8"  fill="#A855F7"/>
      <circle  cx="64" cy="53" r="3.5"        fill="#1A0030"/>
      <circle  cx="65.5" cy="50" r="1.8"      fill="white"/>
      {/* Eyelashes */}
      <line x1="29" y1="44" x2="27" y2="40" stroke="#DB2777" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="32" y1="42" x2="31" y2="38" stroke="#DB2777" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="35" y1="42" x2="35" y2="38" stroke="#DB2777" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Nose */}
      <path d="M46,65 Q50,68 54,65" stroke="#F9A8D4" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Smile */}
      <path d="M37,73 Q50,83 63,73" stroke="#F472B6" strokeWidth="2.2" strokeLinecap="round"/>
    </>
  )
}

/* ─────────────────────── URBAN EDGE ─────────────────────── */
function UrbanEdge() {
  return (
    <>
      {/* Neck + body */}
      <rect x="44" y="93" width="12" height="14" rx="4" fill="#374151"/>
      <ellipse cx="50" cy="111" rx="16" ry="8" fill="#374151"/>
      {/* Head */}
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="#374151"/>
      {/* Cap crown (on top of head) */}
      <path d="M20,40 Q22,16 50,14 Q78,16 80,40 Z" fill="#1F2937"/>
      {/* Cap brim */}
      <rect x="10" y="38" width="80" height="9" rx="4" fill="#111827"/>
      {/* Cap logo accent */}
      <rect x="46" y="20" width="8" height="5" rx="1.5" fill="#EF4444"/>
      {/* Eyes – cool narrowed */}
      <ellipse cx="36" cy="60" rx="9" ry="5" fill="#F9FAFB"/>
      <ellipse cx="36" cy="60" rx="5" ry="4" fill="#9CA3AF"/>
      <circle  cx="36" cy="60" r="3"  fill="#111827"/>
      <circle  cx="37.5" cy="58.5" r="1.2" fill="white"/>
      <ellipse cx="64" cy="60" rx="9" ry="5" fill="#F9FAFB"/>
      <ellipse cx="64" cy="60" rx="5" ry="4" fill="#9CA3AF"/>
      <circle  cx="64" cy="60" r="3"  fill="#111827"/>
      <circle  cx="65.5" cy="58.5" r="1.2" fill="white"/>
      {/* Eyebrows – angular */}
      <path d="M27,53 L45,55" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/>
      <path d="M55,55 L73,53" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/>
      {/* Nose */}
      <circle cx="47" cy="68" r="1.8" fill="#4B5563"/>
      <circle cx="53" cy="68" r="1.8" fill="#4B5563"/>
      {/* Straight/smirk mouth */}
      <path d="M40,77 Q52,82 62,77" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
      {/* Earring left */}
      <circle cx="20" cy="64" r="2"   fill="#EF4444"/>
      <line x1="20" y1="66" x2="20" y2="72" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="20" cy="73" r="2.5" fill="#EF4444"/>
    </>
  )
}

/* ─────────────────────── CLASSIC ELITE ─────────────────────── */
function ClassicElite() {
  return (
    <>
      {/* Neck + body */}
      <rect x="44" y="93" width="12" height="14" rx="4" fill="#1A2855"/>
      <ellipse cx="50" cy="111" rx="16" ry="8" fill="#1A2855"/>
      {/* Sleek updo/hair bun (behind head) */}
      <ellipse cx="50" cy="23" rx="14" ry="10" fill="#2D4480"/>
      <path d="M36,28 Q32,26 30,30 Q28,34 36,34" fill="#2D4480"/>
      <path d="M64,28 Q68,26 70,30 Q72,34 64,34" fill="#2D4480"/>
      {/* Head */}
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="#1A2855"/>
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="none" stroke="#C4A882" strokeWidth="1.2"/>
      {/* Crown */}
      <rect x="38" y="10" width="24" height="6" rx="1" fill="#C4A882"/>
      <polygon points="38,10 42,2 46,10"   fill="#C4A882"/>
      <polygon points="48,10 50,3 52,10"   fill="#F5E6C8"/>
      <polygon points="54,10 58,2 62,10"   fill="#C4A882"/>
      {/* Crown gems */}
      <circle cx="42" cy="8"  r="2" fill="#A855F7"/>
      <circle cx="50" cy="5"  r="2" fill="#FBCFE8"/>
      <circle cx="58" cy="8"  r="2" fill="#A855F7"/>
      {/* Eyes – almond shaped */}
      <path d="M27,58 Q36,50 45,58 Q36,64 27,58 Z" fill="#C4A882"/>
      <ellipse cx="36" cy="58" rx="4" ry="5" fill="#1A2855"/>
      <circle  cx="37" cy="56" r="1.5" fill="white"/>
      <path d="M55,58 Q64,50 73,58 Q64,64 55,58 Z" fill="#C4A882"/>
      <ellipse cx="64" cy="58" rx="4" ry="5" fill="#1A2855"/>
      <circle  cx="65" cy="56" r="1.5" fill="white"/>
      {/* Nose */}
      <path d="M47,68 Q50,72 53,68" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Composed smile */}
      <path d="M40,76 Q50,82 60,76" stroke="#C4A882" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Pearl necklace hint */}
      <circle cx="44" cy="96" r="2" fill="#F5F5F5"/>
      <circle cx="50" cy="96" r="2" fill="#F5F5F5"/>
      <circle cx="56" cy="96" r="2" fill="#F5F5F5"/>
    </>
  )
}

/* ─────────────────────── FREE SPIRIT ─────────────────────── */
function FreeSpirit() {
  return (
    <>
      {/* Neck + body */}
      <rect x="44" y="93" width="12" height="14" rx="4" fill="#B45309"/>
      <ellipse cx="50" cy="111" rx="16" ry="8" fill="#B45309"/>
      {/* Wavy flowing hair (behind head) */}
      <path d="M20,60 Q10,48 14,28 Q18,10 34,16 Q30,30 26,44 Q22,56 20,60 Z" fill="#D97706"/>
      <path d="M80,60 Q90,48 86,28 Q82,10 66,16 Q70,30 74,44 Q78,56 80,60 Z" fill="#B45309"/>
      <path d="M34,18 Q50,8 66,18 Q58,12 50,14 Q42,12 34,18 Z" fill="#FBBF24"/>
      {/* Head */}
      <ellipse cx="50" cy="60" rx="30" ry="34" fill="#C27A0E"/>
      <ellipse cx="50" cy="60" rx="30" ry="34" fill="none" stroke="#D97706" strokeWidth="1.2"/>
      {/* Flower crown */}
      <circle cx="34" cy="27" r="5" fill="#34D399"/>
      <circle cx="34" cy="27" r="3" fill="#FDE68A"/>
      <circle cx="50" cy="20" r="6" fill="#F472B6"/>
      <circle cx="50" cy="20" r="3.5" fill="#FEF08A"/>
      <circle cx="66" cy="27" r="5" fill="#60A5FA"/>
      <circle cx="66" cy="27" r="3" fill="#FDE68A"/>
      {/* Eyes – warm, round */}
      <ellipse cx="36" cy="56" rx="9" ry="9" fill="#FEF3C7"/>
      <ellipse cx="36" cy="56" rx="6" ry="7" fill="#92400E"/>
      <circle  cx="36" cy="56" r="3.5"      fill="#1A0800"/>
      <circle  cx="37.5" cy="53.5" r="2"    fill="white"/>
      <ellipse cx="64" cy="56" rx="9" ry="9" fill="#FEF3C7"/>
      <ellipse cx="64" cy="56" rx="6" ry="7" fill="#92400E"/>
      <circle  cx="64" cy="56" r="3.5"      fill="#1A0800"/>
      <circle  cx="65.5" cy="53.5" r="2"    fill="white"/>
      {/* Freckles */}
      <circle cx="30" cy="64" r="1.2" fill="#D97706" opacity="0.6"/>
      <circle cx="34" cy="66" r="1.2" fill="#D97706" opacity="0.6"/>
      <circle cx="70" cy="64" r="1.2" fill="#D97706" opacity="0.6"/>
      <circle cx="66" cy="66" r="1.2" fill="#D97706" opacity="0.6"/>
      {/* Nose */}
      <circle cx="47" cy="66" r="2"   fill="#92400E"/>
      <circle cx="53" cy="66" r="2"   fill="#92400E"/>
      {/* Big happy smile */}
      <path d="M34,74 Q50,88 66,74" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M34,74 Q50,82 66,74" fill="#fff" opacity="0.4"/>
    </>
  )
}

/* ─────────────────────── DARK POET ─────────────────────── */
function DarkPoet() {
  return (
    <>
      {/* Neck + body */}
      <rect x="44" y="93" width="12" height="14" rx="4" fill="#0D0D1A"/>
      <ellipse cx="50" cy="111" rx="16" ry="8" fill="#0D0D1A"/>
      {/* Long flowing dark hair (behind head) */}
      <path d="M20,94 Q10,70 12,40 Q14,18 24,18 Q20,40 22,66 Q22,80 20,94 Z" fill="#1A0A2E"/>
      <path d="M80,94 Q90,70 88,40 Q86,18 76,18 Q80,40 78,66 Q78,80 80,94 Z" fill="#0D0D1A"/>
      {/* Hair top cover */}
      <path d="M24,20 Q50,6 76,20 Q64,12 50,14 Q36,12 24,20 Z" fill="#1A0A2E"/>
      {/* Head */}
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="#111827"/>
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="none" stroke="#4C1D95" strokeWidth="1.2"/>
      {/* Crescent moon top-right */}
      <path d="M72,16 A10,10 0 1 1 82,26 A7,7 0 0 0 72,16 Z" fill="#4C1D95"/>
      <circle cx="80" cy="14" r="1.5" fill="#A855F7"/>
      <circle cx="84" cy="20" r="1"   fill="#A855F7"/>
      {/* Hair covering top half of head */}
      <path d="M20,52 Q22,30 50,26 Q78,30 80,52 Q70,36 50,34 Q30,36 20,52 Z" fill="#1A0A2E"/>
      {/* Eyes – half-lidded, sharp */}
      <ellipse cx="36" cy="58" rx="9" ry="7" fill="#2D1B4E"/>
      {/* Upper lid covers top half */}
      <path d="M27,55 Q36,50 45,55 L45,58 Q36,54 27,58 Z" fill="#1A0A2E"/>
      <ellipse cx="36" cy="59" rx="5" ry="4.5" fill="#7C3AED"/>
      <circle  cx="36" cy="59" r="2.5"         fill="#0A001A"/>
      <circle  cx="37" cy="57" r="1.2"          fill="white" opacity="0.7"/>
      <ellipse cx="64" cy="58" rx="9" ry="7" fill="#2D1B4E"/>
      <path d="M55,55 Q64,50 73,55 L73,58 Q64,54 55,58 Z" fill="#1A0A2E"/>
      <ellipse cx="64" cy="59" rx="5" ry="4.5" fill="#7C3AED"/>
      <circle  cx="64" cy="59" r="2.5"         fill="#0A001A"/>
      <circle  cx="65" cy="57" r="1.2"          fill="white" opacity="0.7"/>
      {/* Nose */}
      <path d="M47,68 Q50,72 53,68" stroke="#4C1D95" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Melancholic mouth */}
      <path d="M40,78 Q50,75 60,78" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Small cross accessory */}
      <line x1="82" y1="60" x2="82" y2="72" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
      <line x1="78" y1="64" x2="86" y2="64" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
    </>
  )
}

/* ─────────────────────── RETRO WAVE ─────────────────────── */
function RetroWave() {
  return (
    <>
      {/* Neck + body */}
      <rect x="44" y="93" width="12" height="14" rx="4" fill="#F472B6"/>
      <ellipse cx="50" cy="111" rx="16" ry="8" fill="#F472B6"/>
      {/* Pigtail left (behind head) */}
      <ellipse cx="16" cy="32" rx="12" ry="14" fill="#FB923C"/>
      <rect x="18" y="36" width="10" height="16" rx="5"  fill="#FBBF24"/>
      {/* Pigtail right (behind head) */}
      <ellipse cx="84" cy="32" rx="12" ry="14" fill="#A78BFA"/>
      <rect x="72" y="36" width="10" height="16" rx="5"  fill="#34D399"/>
      {/* Head */}
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="#F9A8D4"/>
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="none" stroke="#F472B6" strokeWidth="1.5"/>
      {/* Hair line on top */}
      <ellipse cx="50" cy="30" rx="28" ry="10" fill="#F472B6"/>
      {/* Stars floating */}
      <path d="M14,50 L15.2,54 L19,54 L16,56.5 L17.2,60 L14,57.5 L10.8,60 L12,56.5 L9,54 L12.8,54 Z" fill="#FBBF24" transform="scale(0.8) translate(2,2)"/>
      <path d="M80,16 L81,19.2 L84,19.2 L81.8,21.2 L82.8,24 L80,22.2 L77.2,24 L78.2,21.2 L76,19.2 L79,19.2 Z" fill="#34D399" transform="scale(0.7)"/>
      <circle cx="14" cy="22" r="3" fill="#A78BFA"/>
      <circle cx="86" cy="50" r="2.5" fill="#FB923C"/>
      {/* Eyes – big, bright */}
      <ellipse cx="36" cy="56" rx="10" ry="10" fill="#FDE68A"/>
      <ellipse cx="36" cy="56" rx="7"  ry="8"  fill="#FB923C"/>
      <circle  cx="36" cy="56" r="4"           fill="#431407"/>
      <circle  cx="38" cy="53" r="2"           fill="white"/>
      <ellipse cx="64" cy="56" rx="10" ry="10" fill="#FDE68A"/>
      <ellipse cx="64" cy="56" rx="7"  ry="8"  fill="#A78BFA"/>
      <circle  cx="64" cy="56" r="4"           fill="#2E1065"/>
      <circle  cx="66" cy="53" r="2"           fill="white"/>
      {/* Star eyelashes */}
      <circle cx="27" cy="47" r="1.5" fill="#F472B6"/>
      <circle cx="73" cy="47" r="1.5" fill="#A78BFA"/>
      {/* Nose */}
      <path d="M46,67 Q50,71 54,67" stroke="#F472B6" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Wide smile */}
      <path d="M34,75 Q50,90 66,75" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M38,78 Q50,86 62,78" fill="#fff" opacity="0.5"/>
      {/* Sparkle on cheek */}
      <text x="20" y="73" fontSize="8" fill="#FBBF24">✦</text>
      <text x="74" y="73" fontSize="8" fill="#A78BFA">✦</text>
    </>
  )
}

/* ─────────────────────── MINIMAL SOUL ─────────────────────── */
function MinimalSoul() {
  return (
    <>
      {/* Neck + body */}
      <rect x="44" y="93" width="12" height="14" rx="4" fill="#D1D5DB"/>
      <ellipse cx="50" cy="111" rx="16" ry="8" fill="#D1D5DB"/>
      {/* Clean minimal hair (subtle arc on top) */}
      <path d="M24,30 Q50,18 76,30 Q64,22 50,22 Q36,22 24,30 Z" fill="#E5E7EB"/>
      {/* Head */}
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="#F3F4F6"/>
      <ellipse cx="50" cy="62" rx="30" ry="34" fill="none" stroke="#E5E7EB" strokeWidth="1.5"/>
      {/* Eyes – simple, calm */}
      <ellipse cx="36" cy="56" rx="7" ry="7" fill="#E5E7EB"/>
      <ellipse cx="36" cy="56" rx="4" ry="5" fill="#9CA3AF"/>
      <circle  cx="36" cy="56" r="2.5"      fill="#374151"/>
      <circle  cx="37" cy="54" r="1.2"      fill="white"/>
      <ellipse cx="64" cy="56" rx="7" ry="7" fill="#E5E7EB"/>
      <ellipse cx="64" cy="56" rx="4" ry="5" fill="#9CA3AF"/>
      <circle  cx="64" cy="56" r="2.5"      fill="#374151"/>
      <circle  cx="65" cy="54" r="1.2"      fill="white"/>
      {/* Minimal eyebrows */}
      <line x1="30" y1="47" x2="42" y2="48" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="58" y1="48" x2="70" y2="47" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Nose – single dot */}
      <circle cx="50" cy="66" r="2" fill="#D1D5DB"/>
      {/* Serene mouth */}
      <path d="M42,74 Q50,79 58,74" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"/>
      {/* Minimal ear detail */}
      <circle cx="20" cy="64" r="5" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="1"/>
      <circle cx="80" cy="64" r="5" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="1"/>
    </>
  )
}
