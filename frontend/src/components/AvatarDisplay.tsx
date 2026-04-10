/**
 * AvatarDisplay — toont de juiste avatar afbeelding voor een kind.
 * Gebruikt avatarId als bestandsnaam in /avatars/, met emoji-fallback.
 */
interface AvatarDisplayProps {
  avatarId?: string | null
  avatarUrl?: string | null
  name?: string
  size?: number
  className?: string
}

const FALLBACK_EMOJI: Record<string, string> = {
  meisje: '👧',
  jongen: '👦',
  neutraal: '🧒',
}

export function AvatarDisplay({ avatarId, avatarUrl, name, size = 64, className = '' }: AvatarDisplayProps) {
  const gender = avatarId?.split('-')[0] ?? 'neutraal'
  const fallback = FALLBACK_EMOJI[gender] ?? '🧒'

  if (avatarId) {
    return (
      <img
        src={`/avatars/${avatarId}.svg`}
        alt={name ?? 'Avatar'}
        width={size}
        height={size}
        className={className}
        onError={(e) => {
          const el = e.currentTarget
          el.style.display = 'none'
          const span = document.createElement('span')
          span.style.fontSize = `${size * 0.7}px`
          span.style.lineHeight = '1'
          span.textContent = fallback
          el.parentNode?.insertBefore(span, el)
        }}
      />
    )
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'Avatar'}
        width={size}
        height={size}
        className={className}
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }

  return <span style={{ fontSize: size * 0.7 }} className={className}>{fallback}</span>
}

export const AVATARS = [
  { id: 'meisje-1', label: 'Meisje 1', gender: 'meisje' },
  { id: 'meisje-2', label: 'Meisje 2', gender: 'meisje' },
  { id: 'meisje-3', label: 'Meisje 3', gender: 'meisje' },
  { id: 'jongen-1', label: 'Jongen 1', gender: 'jongen' },
  { id: 'jongen-2', label: 'Jongen 2', gender: 'jongen' },
  { id: 'jongen-3', label: 'Jongen 3', gender: 'jongen' },
  { id: 'neutraal-1', label: 'Neutraal 1', gender: 'neutraal' },
  { id: 'neutraal-2', label: 'Neutraal 2', gender: 'neutraal' },
]
