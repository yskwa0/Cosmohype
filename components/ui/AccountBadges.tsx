interface Props {
  isOfficial?: boolean
  isCosmohypeCreator?: boolean
}

export function AccountBadges({ isOfficial, isCosmohypeCreator }: Props) {
  if (!isOfficial && !isCosmohypeCreator) return null

  return (
    <span className="inline-flex items-center gap-1 flex-shrink-0">
      {isOfficial && (
        <span
          title="公式アカウント"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#7C3AED',
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 12 12" width={9} height={9} fill="none">
            <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {isCosmohypeCreator && (
        <span
          title="Cosmohype Creator"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #EC4899, #7C3AED)',
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 12 12" width={9} height={9} fill="#fff">
            <path d="M6 1l1.2 3.6H11L8.1 6.8l1.2 3.6L6 8.2l-3.3 2.2 1.2-3.6L1 4.6h3.8L6 1z" />
          </svg>
        </span>
      )}
    </span>
  )
}
