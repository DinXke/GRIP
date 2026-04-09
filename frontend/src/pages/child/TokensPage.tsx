/**
 * Tokens-pagina (kind)
 * Real-time saldo, multi-milestone spaarbalk, beloningenwinkel, ster-animatie
 */
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { useTokenBalance, useRewards, useRedeemReward } from '../../lib/queries'

// ── Ster-vlucht animatie ────────────────────────────────────────
function FlyingStar({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="fixed z-50 pointer-events-none text-3xl"
      initial={{ left: '50%', top: '60%', opacity: 1, scale: 1 }}
      animate={{ left: '50%', top: '38%', opacity: 0, scale: 2.5 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      onAnimationComplete={onDone}
      style={{ position: 'fixed', translateX: '-50%' }}
    >
      ⭐
    </motion.div>
  )
}

// ── Confetti op redeem ──────────────────────────────────────────
function RedeemSuccess({
  title,
  requiresApproval,
  onClose,
}: {
  title: string
  requiresApproval: boolean
  onClose: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: 'rgba(61,50,41,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        className="card p-8 mx-4 text-center max-w-xs"
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="font-display font-bold text-ink text-xl mb-2">Gelukt!</h2>
        <p className="font-body text-ink text-base mb-1">
          Je hebt <strong>{title}</strong> ingewisseld!
        </p>
        {requiresApproval && (
          <p className="font-body text-ink-muted text-sm mb-4">
            Een ouder moet dit nog bevestigen. Ze krijgen een berichtje!
          </p>
        )}
        <button
          onClick={onClose}
          className="btn-primary w-full font-body mt-2"
          style={{
            background: 'var(--accent-primary)',
            borderRadius: 'var(--btn-radius)',
          }}
        >
          Super!
        </button>
      </motion.div>
    </motion.div>
  )
}

export default function TokensPage() {
  const { user } = useAuthStore()
  const childId = user?.id ?? ''

  const { data: tokenData, isLoading: loadingTokens } = useTokenBalance(childId)
  const { data: rewardsData, isLoading: loadingRewards } = useRewards(childId)
  const redeemMutation = useRedeemReward()

  const [showStar, setShowStar] = useState(false)
  const [redeemResult, setRedeemResult] = useState<{
    title: string
    requiresApproval: boolean
  } | null>(null)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [redeemError, setRedeemError] = useState<string | null>(null)

  const balance = tokenData?.balance ?? 0
  const streak = tokenData?.streak ?? 0
  const todayEarned = tokenData?.todayEarned ?? 0
  const transactions = tokenData?.transactions ?? []
  const rewards = (rewardsData?.rewards ?? []).sort((a, b) => a.costTokens - b.costTokens)

  // Vandaag verdiende transacties groeperen
  const today = new Date().toDateString()
  const todayTxns = transactions.filter(
    (t) => t.type !== 'redeemed' && new Date(t.createdAt).toDateString() === today
  )

  // Spaarbalk: zoek het volgende doel
  const nextReward = rewards.find((r) => r.costTokens > balance)
  const maxMilestone = rewards.length > 0 ? Math.max(...rewards.map((r) => r.costTokens)) : 100
  const barMax = nextReward?.costTokens ?? maxMilestone

  const handleRedeem = async (rewardId: string, title: string, cost: number) => {
    if (balance < cost) return
    setRedeemingId(rewardId)
    setRedeemError(null)
    try {
      const res = await redeemMutation.mutateAsync({ childId, rewardId })
      setShowStar(true)
      setTimeout(() => {
        setRedeemResult({ title: res.rewardTitle, requiresApproval: res.requiresApproval })
      }, 600)
    } catch (err: any) {
      setRedeemError(err.message ?? 'Inwisselen mislukt')
    } finally {
      setRedeemingId(null)
    }
  }

  if (loadingTokens || loadingRewards) {
    return (
      <div className="flex items-center justify-center pt-20">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ background: 'var(--accent-token)', animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 pb-24 max-w-lg mx-auto">
      {/* Ster-animatie */}
      {showStar && <FlyingStar onDone={() => setShowStar(false)} />}

      {/* Redeem success */}
      <AnimatePresence>
        {redeemResult && (
          <RedeemSuccess
            title={redeemResult.title}
            requiresApproval={redeemResult.requiresApproval}
            onClose={() => setRedeemResult(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display font-bold text-ink mb-5"
        style={{ fontSize: 'var(--font-size-heading)' }}
      >
        Jouw tokens ⭐
      </motion.h1>

      {/* Saldo + streak */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="card p-6 mb-4 text-center"
        style={{ background: 'var(--bg-card)' }}
      >
        <p className="font-body text-ink-muted text-base mb-1">Jouw saldo</p>
        <p
          className="font-display font-bold"
          style={{
            fontSize: 'var(--font-size-big)',
            lineHeight: 1,
            color: 'var(--accent-token)',
          }}
        >
          ⭐ {balance}
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <span className="font-body text-ink-muted text-sm">
            🔥 {streak} dag{streak !== 1 ? 'en' : ''} op rij
          </span>
          <span
            className="w-px h-4"
            style={{ background: 'var(--border-color)' }}
          />
          <span className="font-body text-ink-muted text-sm">
            +{todayEarned} vandaag
          </span>
        </div>
      </motion.div>

      {/* Multi-milestone spaarbalk */}
      {rewards.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5 mb-4"
        >
          <p className="font-display font-bold text-ink text-base mb-4">
            {nextReward
              ? `Nog ${nextReward.costTokens - balance} ⭐ voor: ${nextReward.title}`
              : 'Je kunt alles al inwisselen! 🎉'}
          </p>

          {/* Balk met mijlpalen */}
          <div className="relative mb-6" style={{ height: 28 }}>
            {/* Achtergrond balk */}
            <div
              className="absolute inset-y-0 left-0 right-0 rounded-full"
              style={{ background: 'var(--bg-surface, #F5E6D3)', top: '50%', height: 12, transform: 'translateY(-50%)' }}
            />
            {/* Gevulde balk */}
            <motion.div
              className="absolute rounded-full"
              style={{
                background: 'linear-gradient(90deg, var(--accent-warm, #E8734A), var(--accent-token, #F2C94C))',
                top: '50%',
                height: 12,
                transform: 'translateY(-50%)',
                left: 0,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((balance / barMax) * 100, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
            {/* Mijlpaal-iconen */}
            {rewards.map((r, i) => {
              const pct = Math.min((r.costTokens / barMax) * 100, 100)
              const reached = balance >= r.costTokens
              return (
                <motion.div
                  key={r.id}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${pct}%`, top: 0, transform: 'translateX(-50%)' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                >
                  <span style={{ fontSize: reached ? 22 : 18, filter: reached ? 'none' : 'grayscale(1)', opacity: reached ? 1 : 0.5 }}>
                    {reached ? '⭐' : '○'}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {/* Labels onder de mijlpalen */}
          <div className="flex justify-between text-xs font-body text-ink-muted">
            <span>0</span>
            {rewards.map((r) => (
              <span key={r.id}>{r.costTokens}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Beloningenwinkel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-4"
      >
        <h2 className="font-display font-bold text-ink text-lg mb-3">Beloningen</h2>

        {redeemError && (
          <div
            className="rounded-2xl px-4 py-3 mb-3 font-body text-sm"
            style={{ background: 'rgba(168,197,214,0.25)', color: 'var(--text-primary)' }}
          >
            {redeemError}
          </div>
        )}

        {rewards.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-3xl mb-2">🎁</p>
            <p className="font-body text-ink-muted">Nog geen beloningen ingesteld. Vraag een ouder!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rewards.map((reward, i) => {
              const canAfford = balance >= reward.costTokens
              const isRedeeming = redeemingId === reward.id
              return (
                <motion.div
                  key={reward.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.07 }}
                  className="card p-4 flex items-center gap-4"
                  style={{ opacity: canAfford ? 1 : 0.65 }}
                >
                  {/* Kosten badge */}
                  <div
                    className="flex-shrink-0 rounded-2xl flex flex-col items-center justify-center"
                    style={{
                      width: 56,
                      height: 56,
                      background: canAfford
                        ? 'linear-gradient(135deg, var(--accent-token), #e6a820)'
                        : 'var(--bg-surface, #F5E6D3)',
                    }}
                  >
                    <span className="font-display font-bold text-base" style={{ color: canAfford ? '#3D3229' : 'var(--text-muted)' }}>
                      ⭐{reward.costTokens}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-ink text-base leading-tight truncate">
                      {reward.title}
                    </p>
                    {reward.description && (
                      <p className="font-body text-ink-muted text-sm truncate">{reward.description}</p>
                    )}
                    {!canAfford && (
                      <p className="font-body text-sm mt-0.5" style={{ color: 'var(--accent-primary)' }}>
                        Nog {reward.costTokens - balance} ⭐ te gaan
                      </p>
                    )}
                  </div>

                  {/* Inwisselknop */}
                  <button
                    disabled={!canAfford || isRedeeming || !!redeemingId}
                    onClick={() => handleRedeem(reward.id, reward.title, reward.costTokens)}
                    className="flex-shrink-0 font-body font-semibold text-sm px-4 py-2"
                    style={{
                      borderRadius: 'var(--btn-radius)',
                      background: canAfford ? 'var(--accent-primary)' : 'var(--bg-surface, #F5E6D3)',
                      color: canAfford ? 'white' : 'var(--text-muted)',
                      opacity: (!canAfford || !!redeemingId) && !isRedeeming ? 0.6 : 1,
                      minHeight: 40,
                      cursor: canAfford ? 'pointer' : 'default',
                    }}
                  >
                    {isRedeeming ? '...' : canAfford ? 'Pakken!' : '🔒'}
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Vandaag verdiend */}
      {todayTxns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-5"
        >
          <h2 className="font-display font-bold text-ink text-lg mb-3">Vandaag verdiend</h2>
          <div className="flex flex-col gap-2">
            {todayTxns.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <span className="font-body text-ink text-base">
                  {t.note ?? labelForSource(t.sourceType)}
                </span>
                <span className="font-display font-bold" style={{ color: 'var(--accent-token)' }}>
                  +{t.amount} ⭐
                </span>
              </div>
            ))}
            <div
              className="flex items-center justify-between pt-2 mt-1"
              style={{ borderTop: '2px solid var(--border-color)' }}
            >
              <span className="font-body font-semibold text-ink">Totaal vandaag</span>
              <span className="font-display font-bold text-lg" style={{ color: 'var(--accent-token)' }}>
                +{todayEarned} ⭐
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function labelForSource(sourceType: string): string {
  const labels: Record<string, string> = {
    manual: 'Manueel toegekend',
    task: 'Taak afgerond',
    task_step: 'Stap afgerond',
    exercise: 'Oefening goed',
    exercise_session: 'Oefensessie klaar',
    emotion_checkin: 'Emotie check-in',
    morning_routine: 'Ochtendroutine',
    bedtime_routine: 'Bedtijdroutine',
    streak: 'Streakbonus',
    activity: 'Activiteit afgerond',
  }
  return labels[sourceType] ?? sourceType
}
