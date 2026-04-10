/**
 * TRMNL Dashboard Editor — Ontwerp custom layouts voor het e-ink scherm.
 * Ouders/admins kunnen blokken slepen, herordenen en een live preview zien.
 */
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { api } from '../../lib/api'
import { useMyChildren } from '../../lib/queries'

// ── Types ────────────────────────────────────────────────────

type BlockType =
  | 'dagplanning' | 'token_saldo' | 'token_voortgang'
  | 'huidige_activiteit' | 'emotie' | 'afspraken'
  | 'streak' | 'wist_je_dat' | 'spaarpot'

interface DashboardBlock {
  type: BlockType
  config?: Record<string, unknown>
  _key: string // local-only key for Reorder
}

interface Dashboard {
  id: string
  childId: string
  name: string
  layout: 'full' | 'half_vertical' | 'quadrant'
  blocks: { type: BlockType; config?: Record<string, unknown> }[]
  createdAt: string
}

type Layout = 'full' | 'half_vertical' | 'quadrant'

// ── Block catalog ────────────────────────────────────────────

const BLOCK_CATALOG: { type: BlockType; label: string; icon: string; desc: string }[] = [
  { type: 'dagplanning', label: 'Dagplanning', icon: '\u{1F4C5}', desc: 'Schema activiteiten' },
  { type: 'token_saldo', label: 'Token saldo', icon: '\u{2B50}', desc: 'Saldo + vandaag' },
  { type: 'token_voortgang', label: 'Voortgang', icon: '\u{1F4CA}', desc: 'Spaarbalken' },
  { type: 'huidige_activiteit', label: 'Nu bezig', icon: '\u{25B6}\u{FE0F}', desc: 'Huidige activiteit' },
  { type: 'emotie', label: 'Emotie', icon: '\u{1F60A}', desc: 'Laatste check-in' },
  { type: 'afspraken', label: 'Afspraken', icon: '\u{1F5D3}\u{FE0F}', desc: 'Afspraken vandaag' },
  { type: 'streak', label: 'Streak', icon: '\u{1F525}', desc: 'Dagen op rij' },
  { type: 'wist_je_dat', label: 'Wist je dat?', icon: '\u{1F30D}', desc: 'Leuk weetje' },
  { type: 'spaarpot', label: 'Spaarpotje', icon: '\u{1F437}', desc: 'Geldsaldo + doel' },
]

// ── Layout icons (SVG) ───────────────────────────────────────

function LayoutIcon({ layout, active }: { layout: Layout; active: boolean }) {
  const cls = `w-10 h-7 rounded border-2 transition-colors ${active ? 'border-accent bg-accent/10' : 'border-border bg-card'}`
  switch (layout) {
    case 'full':
      return (
        <div className={cls}>
          <div className="m-1 h-[calc(100%-8px)] rounded-sm border border-current opacity-40" />
        </div>
      )
    case 'half_vertical':
      return (
        <div className={`${cls} flex gap-0.5 p-1`}>
          <div className="flex-1 rounded-sm border border-current opacity-40" />
          <div className="flex-1 rounded-sm border border-current opacity-40" />
        </div>
      )
    case 'quadrant':
      return (
        <div className={`${cls} grid grid-cols-2 grid-rows-2 gap-0.5 p-1`}>
          <div className="rounded-sm border border-current opacity-40" />
          <div className="rounded-sm border border-current opacity-40" />
          <div className="rounded-sm border border-current opacity-40" />
          <div className="rounded-sm border border-current opacity-40" />
        </div>
      )
  }
}

// ── Preview block renderer (monochrome, simulates e-ink) ─────

function PreviewBlock({ type }: { type: BlockType }) {
  const catalog = BLOCK_CATALOG.find(b => b.type === type)
  const label = catalog?.label ?? type
  switch (type) {
    case 'dagplanning':
      return (
        <div className="space-y-0.5 text-[10px]">
          <div className="font-bold text-xs mb-1">Dagplanning</div>
          <div className="flex justify-between"><span>✅ Ontbijt</span><span>07:30</span></div>
          <div className="flex justify-between"><span>✅ Schooltas</span><span>07:45</span></div>
          <div className="flex justify-between"><span>▶ Naar school</span><span>08:15</span></div>
          <div className="flex justify-between opacity-50"><span>○ Huiswerk</span><span>15:30</span></div>
        </div>
      )
    case 'token_saldo':
      return (
        <div className="text-[10px]">
          <div className="font-bold text-xs mb-1">Token saldo</div>
          <div className="flex justify-between"><span>Saldo</span><span className="font-bold">12 st</span></div>
          <div className="flex justify-between"><span>Vandaag</span><span>+5</span></div>
        </div>
      )
    case 'token_voortgang':
      return (
        <div className="text-[10px]">
          <div className="font-bold text-xs mb-1">Voortgang</div>
          <div className="font-mono text-[9px] tracking-wider my-0.5">████████░░░░░░░░</div>
          <div className="flex justify-between"><span>◆ Schermtijd</span><span>5 st</span></div>
          <div className="flex justify-between"><span>◇ Spelletje</span><span>20 st</span></div>
        </div>
      )
    case 'huidige_activiteit':
      return (
        <div className="text-center py-1">
          <div className="font-bold text-xs mb-0.5">▶ NU</div>
          <div className="text-sm font-bold">Huiswerk</div>
          <div className="text-[10px] opacity-60">15:30 · 45 min</div>
        </div>
      )
    case 'emotie':
      return (
        <div className="text-[10px]">
          <div className="font-bold text-xs mb-1">Emotie</div>
          <div className="flex justify-between"><span>Vandaag</span><span>:-) good</span></div>
        </div>
      )
    case 'afspraken':
      return (
        <div className="text-[10px]">
          <div className="font-bold text-xs mb-1">Afspraken</div>
          <div>Zie dagplanning</div>
        </div>
      )
    case 'streak':
      return (
        <div className="text-[10px]">
          <div className="font-bold text-xs mb-1">Streak</div>
          <div>7 dagen op rij!</div>
        </div>
      )
    case 'wist_je_dat':
      return (
        <div className="text-[10px]">
          <div className="font-bold text-xs mb-1">Wist je dat?</div>
          <div>Een octopus heeft drie harten.</div>
        </div>
      )
    case 'spaarpot':
      return (
        <div className="text-[10px]">
          <div className="font-bold text-xs mb-1">Spaarpotje</div>
          <div className="flex justify-between"><span>Saldo</span><span>12.50</span></div>
        </div>
      )
    default:
      return <div className="text-[10px]">{label}</div>
  }
}

// ── Unique key generator ─────────────────────────────────────

let _keyCounter = 0
function nextKey() { return `block-${++_keyCounter}-${Date.now()}` }

// ── Main component ───────────────────────────────────────────

export function TrmnlEditorPage() {
  const { data: childrenData } = useMyChildren()
  const children = childrenData?.children ?? []

  const [selectedChildId, setSelectedChildId] = useState('')
  const childId = selectedChildId || children[0]?.id || ''

  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null) // dashboard id being saved

  // Editing state per dashboard
  const [editingDashboards, setEditingDashboards] = useState<Record<string, {
    name: string
    layout: Layout
    blocks: DashboardBlock[]
    dirty: boolean
  }>>({})

  // Block picker
  const [pickerOpen, setPickerOpen] = useState<string | null>(null)

  // Load dashboards when childId changes
  const loadDashboards = useCallback(async () => {
    if (!childId) return
    setLoading(true)
    try {
      const res = await api.get<{ dashboards: Dashboard[] }>(`/api/trmnl/dashboards/${childId}`)
      setDashboards(res.dashboards)
      // Initialize editing state
      const edits: typeof editingDashboards = {}
      for (const d of res.dashboards) {
        edits[d.id] = {
          name: d.name,
          layout: d.layout,
          blocks: d.blocks.map(b => ({ ...b, _key: nextKey() })),
          dirty: false,
        }
      }
      setEditingDashboards(edits)
    } catch {
      // ignore
    }
    setLoading(false)
  }, [childId])

  useEffect(() => { loadDashboards() }, [loadDashboards])

  // Set first child as default
  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId])

  // Create new dashboard
  async function createDashboard() {
    if (!childId) return
    try {
      const res = await api.post<{ dashboard: Dashboard }>('/api/trmnl/dashboards', {
        childId,
        name: 'Nieuw dashboard',
        layout: 'full' as Layout,
        blocks: [{ type: 'dagplanning' }, { type: 'token_saldo' }],
      })
      await loadDashboards()
    } catch {
      // ignore
    }
  }

  // Save dashboard
  async function saveDashboard(dashboardId: string) {
    const edit = editingDashboards[dashboardId]
    if (!edit) return
    setSaving(dashboardId)
    try {
      await api.put(`/api/trmnl/dashboards/${dashboardId}`, {
        childId,
        name: edit.name,
        layout: edit.layout,
        blocks: edit.blocks.map(b => ({ type: b.type, config: b.config })),
      })
      setEditingDashboards(prev => ({
        ...prev,
        [dashboardId]: { ...prev[dashboardId], dirty: false },
      }))
      await loadDashboards()
    } catch {
      // ignore
    }
    setSaving(null)
  }

  // Delete dashboard
  async function deleteDashboard(dashboardId: string) {
    try {
      await api.delete(`/api/trmnl/dashboards/${dashboardId}/${childId}`)
      await loadDashboards()
    } catch {
      // ignore
    }
  }

  // Update editing state helpers
  function updateEdit(dashboardId: string, partial: Partial<typeof editingDashboards[string]>) {
    setEditingDashboards(prev => ({
      ...prev,
      [dashboardId]: { ...prev[dashboardId], ...partial, dirty: true },
    }))
  }

  function addBlock(dashboardId: string, type: BlockType) {
    const edit = editingDashboards[dashboardId]
    if (!edit) return
    updateEdit(dashboardId, {
      blocks: [...edit.blocks, { type, _key: nextKey() }],
    })
    setPickerOpen(null)
  }

  function removeBlock(dashboardId: string, key: string) {
    const edit = editingDashboards[dashboardId]
    if (!edit) return
    updateEdit(dashboardId, {
      blocks: edit.blocks.filter(b => b._key !== key),
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink font-display">TRMNL Dashboard Editor</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Ontwerp custom layouts voor het e-ink scherm
        </p>
      </div>

      {/* Kind selector */}
      {children.length > 1 && (
        <div className="card p-4">
          <label className="text-sm font-medium text-ink mb-2 block">Kind</label>
          <select
            value={childId}
            onChange={e => setSelectedChildId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-ink focus:border-accent focus:outline-none"
          >
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Nieuw dashboard knop */}
      <div className="flex items-center gap-3">
        <button
          onClick={createDashboard}
          className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Nieuw dashboard
        </button>
        {loading && (
          <span className="text-sm text-ink-muted">Laden...</span>
        )}
      </div>

      {/* Dashboard lijst */}
      {dashboards.length === 0 && !loading && (
        <div className="card p-8 text-center">
          <p className="text-ink-muted text-sm">
            Nog geen custom dashboards. Klik op "Nieuw dashboard" om te beginnen.
          </p>
          <p className="text-ink-muted text-xs mt-1">
            Zonder custom dashboard gebruikt TRMNL het standaard scherm.
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {dashboards.map(dashboard => {
          const edit = editingDashboards[dashboard.id]
          if (!edit) return null
          return (
            <motion.div
              key={dashboard.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, transition: { duration: 0.2 } }}
              className="card p-5 space-y-5"
            >
              {/* Dashboard header: name + actions */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Name input */}
                  <input
                    type="text"
                    value={edit.name}
                    onChange={e => updateEdit(dashboard.id, { name: e.target.value })}
                    className="text-lg font-semibold text-ink bg-transparent border-b-2 border-transparent hover:border-border focus:border-accent focus:outline-none w-full transition-colors font-display"
                    placeholder="Dashboard naam..."
                  />

                  {/* Layout selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-muted font-medium">Layout:</span>
                    {(['full', 'half_vertical', 'quadrant'] as Layout[]).map(layout => (
                      <button
                        key={layout}
                        onClick={() => updateEdit(dashboard.id, { layout })}
                        className="flex items-center gap-1.5 group"
                        title={layout === 'full' ? 'Volledig' : layout === 'half_vertical' ? 'Halve hoogte' : 'Kwadrant'}
                      >
                        <LayoutIcon layout={layout} active={edit.layout === layout} />
                        <span className={`text-xs transition-colors ${edit.layout === layout ? 'text-accent font-medium' : 'text-ink-muted group-hover:text-ink'}`}>
                          {layout === 'full' ? 'Full' : layout === 'half_vertical' ? 'Half' : 'Kwadrant'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {edit.dirty && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] text-accent font-medium bg-accent/10 px-2 py-0.5 rounded-full"
                    >
                      Onopgeslagen
                    </motion.span>
                  )}
                  <button
                    onClick={() => saveDashboard(dashboard.id)}
                    disabled={!edit.dirty || saving === dashboard.id}
                    className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium disabled:opacity-40 transition-opacity"
                  >
                    {saving === dashboard.id ? 'Opslaan...' : 'Opslaan'}
                  </button>
                  <button
                    onClick={() => deleteDashboard(dashboard.id)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-ink-muted hover:border-red-300 hover:text-red-500 transition-colors"
                  >
                    Verwijder
                  </button>
                </div>
              </div>

              {/* Two-column: blocks + preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: Block list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">Blokken</h3>
                    <div className="relative">
                      <button
                        onClick={() => setPickerOpen(pickerOpen === dashboard.id ? null : dashboard.id)}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-ink hover:border-accent hover:text-accent transition-colors"
                      >
                        + Blok toevoegen
                      </button>
                      {/* Block picker dropdown */}
                      <AnimatePresence>
                        {pickerOpen === dashboard.id && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg p-2 w-56"
                          >
                            {BLOCK_CATALOG.map(block => {
                              const alreadyAdded = edit.blocks.some(b => b.type === block.type)
                              return (
                                <button
                                  key={block.type}
                                  onClick={() => addBlock(dashboard.id, block.type)}
                                  disabled={alreadyAdded}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm hover:bg-surface disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                  <span className="text-base flex-shrink-0">{block.icon}</span>
                                  <div className="min-w-0">
                                    <div className="font-medium text-ink text-xs">{block.label}</div>
                                    <div className="text-[10px] text-ink-muted truncate">{block.desc}</div>
                                  </div>
                                  {alreadyAdded && (
                                    <span className="text-[10px] text-ink-muted ml-auto flex-shrink-0">toegevoegd</span>
                                  )}
                                </button>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Reorderable block list */}
                  {edit.blocks.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-border text-center">
                      <p className="text-sm text-ink-muted">Geen blokken. Voeg er een toe.</p>
                    </div>
                  ) : (
                    <Reorder.Group
                      axis="y"
                      values={edit.blocks}
                      onReorder={newBlocks => updateEdit(dashboard.id, { blocks: newBlocks })}
                      className="space-y-2"
                    >
                      {edit.blocks.map(block => {
                        const catalog = BLOCK_CATALOG.find(b => b.type === block.type)
                        return (
                          <Reorder.Item
                            key={block._key}
                            value={block}
                            className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border cursor-grab active:cursor-grabbing"
                          >
                            {/* Drag handle */}
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-muted flex-shrink-0">
                              <circle cx="4" cy="3" r="1.2" fill="currentColor" />
                              <circle cx="10" cy="3" r="1.2" fill="currentColor" />
                              <circle cx="4" cy="7" r="1.2" fill="currentColor" />
                              <circle cx="10" cy="7" r="1.2" fill="currentColor" />
                              <circle cx="4" cy="11" r="1.2" fill="currentColor" />
                              <circle cx="10" cy="11" r="1.2" fill="currentColor" />
                            </svg>
                            <span className="text-base flex-shrink-0">{catalog?.icon}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-ink">{catalog?.label ?? block.type}</span>
                              <span className="text-[10px] text-ink-muted ml-2">{catalog?.desc}</span>
                            </div>
                            <button
                              onClick={() => removeBlock(dashboard.id, block._key)}
                              className="p-1 rounded-lg text-ink-muted hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                              title="Verwijder blok"
                            >
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="3" y1="3" x2="11" y2="11" />
                                <line x1="11" y1="3" x2="3" y2="11" />
                              </svg>
                            </button>
                          </Reorder.Item>
                        )
                      })}
                    </Reorder.Group>
                  )}
                </div>

                {/* Right: Live preview */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-ink">Preview (e-ink)</h3>
                  <div
                    className="border-2 border-neutral-800 rounded-lg bg-white overflow-hidden"
                    style={{
                      width: '100%',
                      maxWidth: 400,
                      aspectRatio: edit.layout === 'quadrant' ? '1/1' : edit.layout === 'half_vertical' ? '4/5' : '5/3',
                    }}
                  >
                    <div className="p-3 h-full flex flex-col" style={{ fontFamily: "'Inter', 'Arial', sans-serif", color: '#000' }}>
                      {/* Blocks */}
                      <div className="flex-1 overflow-hidden space-y-2">
                        <AnimatePresence mode="popLayout">
                          {edit.blocks.map(block => (
                            <motion.div
                              key={block._key}
                              layout
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="border-b border-neutral-200 pb-1.5 last:border-b-0"
                            >
                              <PreviewBlock type={block.type} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {edit.blocks.length === 0 && (
                          <div className="text-[10px] text-neutral-400 text-center py-4">
                            Voeg blokken toe
                          </div>
                        )}
                      </div>
                      {/* Footer bar */}
                      <div className="flex justify-between items-center border-t border-neutral-300 pt-1 mt-1">
                        <span style={{ fontSize: 10, fontWeight: 'bold' }}>GRIP</span>
                        <span style={{ fontSize: 9, color: '#666' }}>
                          {new Date().toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-ink-muted">
                    Monochrome weergave — het echte TRMNL scherm is 800x480 pixels.
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default TrmnlEditorPage
