import { TopBar } from '@/components/layout/TopBar'
import { StyleIdInfoModal } from '@/components/search/StyleIdInfoModal'
import { StyleCheckInfoModal } from '@/components/search/StyleCheckInfoModal'
import { CosmoInfoModal } from '@/components/search/CosmoInfoModal'
import { HypeInfoModal } from '@/components/search/HypeInfoModal'
import { SpringCard } from '@/components/ui/SpringCard'

const DOTS_A: [number, number][] = [[18, 14], [75, 42], [130, 10], [48, 72], [105, 82], [158, 48], [90, 20]]
const DOTS_B: [number, number][] = [[25, 18], [88, 52], [145, 12], [55, 78], [112, 88], [168, 52], [70, 28]]

export default function ContentsPage() {
  return (
    <>
      <TopBar title="コンテンツ" />
      <div className="px-4 pt-4 pb-24 flex flex-col gap-3">

        <div className="grid grid-cols-2 gap-4">

          {/* STYLE ID診断 */}
          <SpringCard
            href="/style-id"
            gradient="linear-gradient(145deg, #1A0844 0%, #5B21B6 50%, #A855F7 100%)"
            dots={DOTS_A}
            label="STYLE ID"
            description="あなたらしいスタイルタイプを診断"
            infoButton={<StyleIdInfoModal />}
          >
            <svg viewBox="0 0 60 60" width={48} height={48} aria-hidden>
              <ellipse cx={30} cy={26} rx={13} ry={14} fill="#E9D5FF" />
              <ellipse cx={30} cy={42} rx={9} ry={5} fill="#C4B5FD" opacity={0.6} />
              <line x1={22} y1={14} x2={18} y2={8} stroke="#C4B5FD" strokeWidth={1.5} strokeLinecap="round" />
              <circle cx={18} cy={7} r={2} fill="#A855F7" />
              <line x1={38} y1={14} x2={42} y2={8} stroke="#C4B5FD" strokeWidth={1.5} strokeLinecap="round" />
              <circle cx={42} cy={7} r={2} fill="#A855F7" />
              <ellipse cx={24} cy={27} rx={3} ry={3.5} fill="#7C3AED" />
              <ellipse cx={36} cy={27} rx={3} ry={3.5} fill="#7C3AED" />
              <ellipse cx={24} cy={27} rx={1.5} ry={2} fill="white" opacity={0.9} />
              <ellipse cx={36} cy={27} rx={1.5} ry={2} fill="white" opacity={0.9} />
              <path d="M25 34 Q30 37 35 34" stroke="#7C3AED" strokeWidth={1.2} fill="none" strokeLinecap="round" />
              <text x={48} y={20} fontSize={10} fill="#FCD34D">✦</text>
            </svg>
          </SpringCard>

          {/* AIコーデ診断 */}
          <SpringCard
            href="/style-check"
            gradient="linear-gradient(145deg, #0C1A3A 0%, #1E3A6E 50%, #3B82F6 100%)"
            dots={DOTS_A}
            label="AIコーデ診断"
            description="あなたのコーデをAIがチェック"
            infoButton={<StyleCheckInfoModal />}
          >
            <svg viewBox="0 0 60 60" width={48} height={48} aria-hidden>
              <circle cx={30} cy={22} r={11} fill="#BFDBFE" opacity={0.9} />
              <path d="M20 42 Q30 34 40 42" stroke="#93C5FD" strokeWidth={1.8} fill="none" strokeLinecap="round" opacity={0.8} />
              <circle cx={26} cy={21} r={2.5} fill="#1D4ED8" />
              <circle cx={34} cy={21} r={2.5} fill="#1D4ED8" />
              <path d="M26 28 Q30 31 34 28" stroke="#1D4ED8" strokeWidth={1.2} fill="none" strokeLinecap="round" />
              <text x={42} y={14} fontSize={10} fill="#FCD34D">✦</text>
              <circle cx={14} cy={38} r={3} fill="#60A5FA" opacity={0.6} />
              <circle cx={46} cy={38} r={2.5} fill="#93C5FD" opacity={0.5} />
            </svg>
          </SpringCard>

          {/* COSMO */}
          <SpringCard
            href="/cosmo"
            gradient="linear-gradient(145deg, #0F0A2E 0%, #1E1B4B 50%, #4C1D95 100%)"
            dots={DOTS_B}
            label="COSMO"
            description="同じスタイルの仲間を探す"
            infoButton={<CosmoInfoModal />}
          >
            <svg viewBox="0 0 60 60" width={48} height={48} aria-hidden>
              <circle cx={30} cy={30} r={10} fill="#7C3AED" opacity={0.9} />
              <ellipse cx={30} cy={30} rx={20} ry={7} fill="none" stroke="#A78BFA" strokeWidth={1.4} opacity={0.7} />
              <circle cx={30} cy={10} r={3.5} fill="#E9D5FF" />
              <circle cx={50} cy={30} r={3} fill="#C4B5FD" />
              <circle cx={30} cy={50} r={3} fill="#DDD6FE" />
              <circle cx={10} cy={30} r={2.5} fill="#A78BFA" />
              <text x={44} y={16} fontSize={10} fill="#FCD34D">✦</text>
            </svg>
          </SpringCard>

          {/* HYPE */}
          <SpringCard
            href="/hype"
            gradient="linear-gradient(145deg, #1C0030 0%, #7C1D6F 50%, #EC4899 100%)"
            dots={DOTS_A}
            label="HYPE"
            description="テーマ別コーデをみんなで投稿"
            infoButton={<HypeInfoModal />}
          >
            <svg viewBox="0 0 60 60" width={48} height={48} aria-hidden>
              <line x1={30} y1={6} x2={30} y2={14} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
              <line x1={30} y1={46} x2={30} y2={54} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
              <line x1={6} y1={30} x2={14} y2={30} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
              <line x1={46} y1={30} x2={54} y2={30} stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
              <line x1={13} y1={13} x2={19} y2={19} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
              <line x1={41} y1={41} x2={47} y2={47} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
              <line x1={47} y1={13} x2={41} y2={19} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
              <line x1={13} y1={47} x2={19} y2={41} stroke="white" strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
              <path d="M30 13 L44 30 L30 47 L16 30Z" fill="#FBCFE8" opacity={0.9} />
              <path d="M30 21 L38 30 L30 39 L22 30Z" fill="white" opacity={0.95} />
              <circle cx={30} cy={30} r={5} fill="#EC4899" />
            </svg>
          </SpringCard>

          {/* コラム */}
          <SpringCard
            href="/columns"
            gradient="linear-gradient(145deg, #1C1200 0%, #78350F 50%, #D97706 100%)"
            dots={DOTS_B}
            label="コラム"
            description="ファッション知識を楽しく学ぶ"
          >
            <svg viewBox="0 0 60 60" width={48} height={48} aria-hidden fill="none">
              <rect x={10} y={8} width={26} height={36} rx={3} fill="#FDE68A" opacity={0.9} />
              <rect x={24} y={8} width={26} height={36} rx={3} fill="#FCD34D" opacity={0.85} />
              <line x1={28} y1={17} x2={46} y2={17} stroke="#92400E" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
              <line x1={28} y1={23} x2={46} y2={23} stroke="#92400E" strokeWidth={1.5} strokeLinecap="round" opacity={0.7} />
              <line x1={28} y1={29} x2={40} y2={29} stroke="#92400E" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
              <text x={42} y={14} fontSize={10} fill="white" opacity={0.85}>✦</text>
            </svg>
          </SpringCard>

          {/* STYLE PLANET */}
          <SpringCard
            href="/style-planet"
            gradient="linear-gradient(145deg, #0A1A12 0%, #064E3B 50%, #34D399 100%)"
            dots={DOTS_A}
            label="STYLE PLANET"
            description="ブランドを発見する"
          >
            <svg viewBox="0 0 60 60" width={48} height={48} aria-hidden>
              <circle cx={30} cy={30} r={11} fill="#065F46" opacity={0.95} />
              <ellipse cx={30} cy={30} rx={22} ry={7} fill="none" stroke="#6EE7B7" strokeWidth={1.5} opacity={0.7} transform="rotate(-22 30 30)" />
              <circle cx={30} cy={30} r={7} fill="#10B981" opacity={0.9} />
              <ellipse cx={26} cy={27} rx={2.5} ry={2} fill="#A7F3D0" opacity={0.5} />
              <circle cx={14} cy={18} r={1.5} fill="white" opacity={0.3} />
              <circle cx={48} cy={42} r={1} fill="white" opacity={0.25} />
              <text x={44} y={16} fontSize={10} fill="#FCD34D">✦</text>
            </svg>
          </SpringCard>

        </div>
      </div>
    </>
  )
}
