import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useUpdateAvatar } from '../../lib/queries'
import { AvatarDisplay, AVATARS } from '../../components/AvatarDisplay'

interface MyProfile {
  id: string
  name: string
  avatarId?: string | null
  gender?: string | null
  dateOfBirth?: string | null
}

// ── Avatar picker voor kinderen ────────────────────────────────
function AvatarPicker({ current, onSelect }: { current: string; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<string>('alle')
  const filtered = filter === 'alle' ? AVATARS : AVATARS.filter((a) => a.gender === filter)

  return (
    <div className="space-y-4">
      {/* Filter knoppen */}
      <div className="flex gap-2 justify-center">
        {[
          { key: 'alle', label: 'Alle' },
          { key: 'meisje', label: '👧 Meisje' },
          { key: 'jongen', label: '👦 Jongen' },
          { key: 'neutraal', label: '🧒 Neutraal' },
        ].map((f) => (
          <motion.button
            key={f.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full font-display font-medium text-sm transition-all ${
              filter === f.key
                ? 'bg-[var(--accent-warm)] text-white shadow-lg'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--accent-calm)]/30'
            }`}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-4 gap-3">
        {filtered.map((av) => (
          <motion.button
            key={av.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelect(av.id)}
            className={`relative p-2 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
              current === av.id
                ? 'border-[var(--accent-warm)] bg-[var(--accent-warm)]/10'
                : 'border-transparent bg-[var(--bg-surface)] hover:border-[var(--accent-calm)]'
            }`}
          >
            <AvatarDisplay avatarId={av.id} size={64} />
            {current === av.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--accent-warm)] flex items-center justify-center"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Hoofdpagina ────────────────────────────────────────────────
export function ChildSettingsPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<MyProfile>('/api/users/me'),
  })

  const updateAvatar = useUpdateAvatar()
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const currentAvatar = selectedAvatar ?? profile?.avatarId ?? 'neutraal-1'

  async function handleSave() {
    if (!selectedAvatar) return
    const gender = AVATARS.find((a) => a.id === selectedAvatar)?.gender
    await updateAvatar.mutateAsync({ avatarId: selectedAvatar, gender })
    setSaved(true)
    setSelectedAvatar(null)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-[var(--accent-warm)]"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">
          Mijn instellingen
        </h1>
        <p className="text-[var(--text-muted)] mt-1">Kies jouw avatar!</p>
      </div>

      {/* Huidige avatar groot */}
      <div className="flex justify-center mb-8">
        <motion.div
          key={currentAvatar}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-32 h-32 rounded-full bg-[var(--bg-surface)] border-4 border-[var(--accent-warm)]/40 flex items-center justify-center overflow-hidden shadow-lg"
        >
          <AvatarDisplay avatarId={currentAvatar} name={profile?.name} size={112} />
        </motion.div>
      </div>

      {profile?.name && (
        <p className="text-center font-display text-xl font-bold text-[var(--text-primary)] mb-6">
          Hallo, {profile.name}! 👋
        </p>
      )}

      {/* Avatar picker */}
      <div className="bg-[var(--bg-card)] rounded-3xl p-5 border-2 border-[var(--accent-calm)]/20 mb-6">
        <h2 className="font-display font-bold text-lg text-[var(--text-primary)] mb-4 text-center">
          Kies jouw avatar
        </h2>
        <AvatarPicker
          current={currentAvatar}
          onSelect={(id) => setSelectedAvatar(id)}
        />
      </div>

      {/* Opslaan knop */}
      <AnimatePresence>
        {selectedAvatar && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <button
              onClick={handleSave}
              disabled={updateAvatar.isPending}
              className="w-full py-4 rounded-2xl bg-[var(--accent-warm)] text-white font-display font-bold text-xl shadow-lg hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              {updateAvatar.isPending ? 'Opslaan...' : '⭐ Avatar opslaan!'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Succes bericht */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center mt-6 p-4 rounded-2xl bg-[var(--accent-forest)]/10 border border-[var(--accent-forest)]/30"
          >
            <p className="font-display font-bold text-[var(--accent-forest)] text-lg">
              🎉 Super! Jouw avatar is opgeslagen!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
