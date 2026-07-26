import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  RARITY_LABEL,
  sortFamilies,
  SPRITE_FAMILIES,
  SPRITES,
  VARIANT_ORDER,
  type SortMode,
  type SpriteEntry,
} from './data/sprites'
import {
  createRoom,
  fetchRoom,
  getCloudConfigHint,
  isCloudConfigured,
  normalizeRoomCode,
  pushRoom,
  roomFromUrl,
  shareUrl,
  subscribeRoom,
  writeRoomToUrl,
} from './lib/cloud'
import { cyclePlayerSprite } from './lib/cycle'
import {
  createPlayer,
  exportSquad,
  getPlayerSprite,
  importSquad,
  loadRoomCode,
  loadSquad,
  saveRoomCode,
  saveSquad,
} from './lib/storage'
import {
  applyExchangeRound,
  buildSuggestionPlan,
  isExchangeAssignment,
  MAX_BRING_PER_PLAYER,
} from './lib/suggest'
import type {
  BringAssignment,
  Player,
  SuggestionPlan,
  SquadState,
} from './types'
import './App.css'

type Tab = 'collection' | 'suggest' | 'squad' | 'help'
type SyncStatus = 'local' | 'connecting' | 'synced' | 'saving' | 'error' | 'offline'

type AppModal =
  | {
      kind: 'confirm-exchanges'
      title: string
      subtitle: string
      items: BringAssignment[]
    }
  | {
      kind: 'result'
      title: string
      tone: 'success' | 'error' | 'info'
      message: string
      items?: BringAssignment[]
      skipped?: string[]
    }

const cloudReady = isCloudConfigured()

export default function App() {
  const [state, setState] = useState<SquadState>(() => loadSquad())
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [tab, setTab] = useState<Tab>('collection')
  const [query, setQuery] = useState('')
  const [variantFilter, setVariantFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortMode, setSortMode] = useState<SortMode>('type')
  const [plan, setPlan] = useState<SuggestionPlan | null>(null)
  /** Individual exchanges already confirmed for the current plan. */
  const [confirmedExchangeKeys, setConfirmedExchangeKeys] = useState<string[]>(
    [],
  )
  const [modal, setModal] = useState<AppModal | null>(null)

  const [roomCode, setRoomCode] = useState<string | null>(() => roomFromUrl() ?? loadRoomCode())
  const [joinInput, setJoinInput] = useState('')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    roomFromUrl() || loadRoomCode() ? 'connecting' : 'local',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /**
   * Only push after we have loaded/created the room on this session.
   * Without this, a fresh browser with empty localStorage + ?room=CODE
   * would overwrite the cloud room with blank data within ~450ms.
   */
  const [roomHydrated, setRoomHydrated] = useState(false)

  /** Skip next cloud push after applying a remote snapshot. */
  const skipPushRef = useRef(false)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Latest state for async push callbacks (avoid stale closures). */
  const stateRef = useRef(state)
  stateRef.current = state
  const confirmedKeysRef = useRef(confirmedExchangeKeys)
  confirmedKeysRef.current = confirmedExchangeKeys

  useEffect(() => {
    if (!selectedPlayerId && state.players[0]) {
      setSelectedPlayerId(state.players[0].id)
    }
  }, [state.players, selectedPlayerId])

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [modal])

  // Always keep a local cache
  useEffect(() => {
    saveSquad(state)
  }, [state])

  // Join room from URL / saved code on first load — never push until this finishes
  useEffect(() => {
    const code = roomFromUrl() ?? loadRoomCode()
    if (!code || !cloudReady) {
      if (code && !cloudReady) {
        setSyncStatus('local')
        setSyncError('This site is not connected to cloud yet (missing Supabase env).')
      }
      setRoomHydrated(false)
      return
    }

    let cancelled = false
    setRoomHydrated(false)
    setSyncStatus('connecting')
    void (async () => {
      const result = await fetchRoom(code)
      if (cancelled) return
      if (!result.ok) {
        setSyncError(result.error)
        setSyncStatus('error')
        setRoomCode(null)
        saveRoomCode(null)
        writeRoomToUrl(null)
        setRoomHydrated(false)
        return
      }
      skipPushRef.current = true
      setState(result.data)
      setSelectedPlayerId(result.data.players[0]?.id ?? '')
      setRoomCode(normalizeRoomCode(code))
      saveRoomCode(normalizeRoomCode(code))
      writeRoomToUrl(normalizeRoomCode(code))
      setRoomHydrated(true)
      setSyncStatus('synced')
      setSyncError(null)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- join once on mount
  }, [])

  // Live subscription while in a room
  useEffect(() => {
    if (!roomCode || !cloudReady || !roomHydrated) return

    const sub = subscribeRoom(
      roomCode,
      (remote) => {
        // Ignore older/equal revisions when possible
        const localRev = stateRef.current.revision ?? 0
        const remoteRev = remote.revision ?? 0
        if (remoteRev > 0 && remoteRev < localRev) return

        skipPushRef.current = true
        setState(remote)
        setSyncStatus('synced')
        setSyncError(null)
      },
      (msg) => {
        setSyncError(msg)
        setSyncStatus('error')
      },
    )

    return () => sub.unsubscribe()
  }, [roomCode, roomHydrated])

  // Debounced push of local edits — only after room is hydrated
  useEffect(() => {
    if (!roomCode || !cloudReady || !roomHydrated) return
    if (skipPushRef.current) {
      skipPushRef.current = false
      return
    }

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    setSyncStatus('saving')
    const code = roomCode
    const snapshot = state
    pushTimerRef.current = setTimeout(() => {
      void (async () => {
        const result = await pushRoom(code, snapshot)
        if (!result.ok) {
          // If we blocked a wipe, re-fetch room so UI recovers
          if (result.error.includes('Blocked overwrite')) {
            const reloaded = await fetchRoom(code)
            if (reloaded.ok) {
              skipPushRef.current = true
              setState(reloaded.data)
              setSyncStatus('synced')
              setSyncError('Recovered room data (blocked empty overwrite from this device).')
              return
            }
          }
          setSyncError(result.error)
          setSyncStatus('error')
          return
        }
        // Keep local revision in sync with what we saved
        skipPushRef.current = true
        setState(result.data)
        setSyncStatus('synced')
        setSyncError(null)
      })()
    }, 450)

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [state, roomCode, roomHydrated])

  const selectedPlayer = useMemo(
    () => state.players.find((p) => p.id === selectedPlayerId) ?? state.players[0],
    [state.players, selectedPlayerId],
  )

  const updatePlayer = useCallback((playerId: string, fn: (p: Player) => Player) => {
    setState((s) => ({
      ...s,
      players: s.players.map((p) => (p.id === playerId ? fn(p) : p)),
    }))
  }, [])

  const stats = useMemo(() => {
    if (!selectedPlayer) return { owned: 0, available: 0, lost: 0, mastered: 0 }
    let owned = 0
    let available = 0
    let lost = 0
    let mastered = 0
    for (const s of SPRITES) {
      const st = getPlayerSprite(selectedPlayer, s.id)
      if (st.status !== 'none') owned++
      if (st.status === 'available') available++
      if (st.status === 'lost') lost++
      if (st.mastered) mastered++
    }
    return { owned, available, lost, mastered }
  }, [selectedPlayer])

  const filteredByFamily = useMemo(() => {
    if (!selectedPlayer) return []
    const q = query.trim().toLowerCase()
    const families = sortFamilies(SPRITE_FAMILIES, sortMode)
    return families
      .map((family) => {
        const sprites = SPRITES.filter((s) => {
          if (s.familyId !== family.id) return false
          if (variantFilter !== 'all' && s.variant !== variantFilter) return false
          if (
            q &&
            !s.name.toLowerCase().includes(q) &&
            !family.name.toLowerCase().includes(q)
          )
            return false
          if (statusFilter !== 'all') {
            const st = getPlayerSprite(selectedPlayer, s.id)
            if (statusFilter === 'mastered' && !st.mastered) return false
            if (statusFilter === 'unmastered' && st.mastered) return false
            if (statusFilter === 'missing' && st.status !== 'none') return false
            if (statusFilter === 'available' && st.status !== 'available') return false
            if (statusFilter === 'lost' && st.status !== 'lost') return false
            // Missing + lost: not ready in inventory
            if (
              statusFilter === 'need' &&
              st.status !== 'none' &&
              st.status !== 'lost'
            )
              return false
          }
          return true
        }).sort(
          (a, b) =>
            VARIANT_ORDER.indexOf(a.variant) - VARIANT_ORDER.indexOf(b.variant),
        )
        return { family, sprites }
      })
      .filter((g) => g.sprites.length > 0)
  }, [selectedPlayer, query, variantFilter, statusFilter, sortMode])

  function onSpriteTap(sprite: SpriteEntry) {
    if (!selectedPlayer) return
    updatePlayer(selectedPlayer.id, (p) => {
      const cur = getPlayerSprite(p, sprite.id)
      const next = cyclePlayerSprite(cur, 'status')
      return {
        ...p,
        sprites: { ...p.sprites, [sprite.id]: next },
      }
    })
  }

  function onMasterToggle(sprite: SpriteEntry, e: React.MouseEvent) {
    e.stopPropagation()
    if (!selectedPlayer) return
    updatePlayer(selectedPlayer.id, (p) => {
      const cur = getPlayerSprite(p, sprite.id)
      const next = cyclePlayerSprite(cur, 'mastered')
      return {
        ...p,
        sprites: { ...p.sprites, [sprite.id]: next },
      }
    })
  }

  function onMarkMissing(sprite: SpriteEntry, e: React.MouseEvent) {
    e.stopPropagation()
    if (!selectedPlayer) return
    updatePlayer(selectedPlayer.id, (p) => {
      const cur = getPlayerSprite(p, sprite.id)
      if (cur.status === 'none') return p
      const next = cyclePlayerSprite(cur, 'missing')
      return {
        ...p,
        sprites: { ...p.sprites, [sprite.id]: next },
      }
    })
  }

  function movePlayer(id: string, direction: -1 | 1) {
    setState((s) => {
      const index = s.players.findIndex((p) => p.id === id)
      if (index < 0) return s
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= s.players.length) return s
      const players = [...s.players]
      const [item] = players.splice(index, 1)
      players.splice(nextIndex, 0, item)
      return { ...s, players }
    })
  }

  function runSuggest() {
    const next = buildSuggestionPlan(state)
    setPlan(next)
    setConfirmedExchangeKeys([])
    setTab('suggest')
  }

  function isExchangeConfirmed(a: BringAssignment): boolean {
    return confirmedExchangeKeys.includes(exchangeKey(a))
  }

  function openConfirmExchanges(items: BringAssignment[], title: string) {
    const pending = items.filter(
      (a) =>
        isExchangeAssignment(a) &&
        !confirmedKeysRef.current.includes(exchangeKey(a)),
    )
    if (pending.length === 0) return
    setModal({
      kind: 'confirm-exchanges',
      title,
      subtitle:
        'Recipients become Ready; bringers mark these sprites Lost. Only confirm trades that actually happened.',
      items: pending,
    })
  }

  /**
   * Apply exchanges from the latest squad snapshot (not a setState side-effect),
   * then show a result modal. Fixes false "nothing updated" alerts when React
   * defers functional updaters.
   */
  function applyConfirmedExchanges(items: BringAssignment[]) {
    const pending = items.filter(
      (a) =>
        isExchangeAssignment(a) &&
        !confirmedKeysRef.current.includes(exchangeKey(a)),
    )
    if (pending.length === 0) {
      setModal({
        kind: 'result',
        title: 'Already confirmed',
        tone: 'info',
        message: 'These exchanges were already applied for this plan.',
      })
      return
    }

    const result = applyExchangeRound(stateRef.current, pending)
    setState(result.state)
    stateRef.current = result.state

    const keys = pending.map(exchangeKey)
    setConfirmedExchangeKeys((prev) => {
      const next = [...prev]
      for (const k of keys) {
        if (!next.includes(k)) next.push(k)
      }
      confirmedKeysRef.current = next
      return next
    })

    if (result.applied > 0 && roomCode && cloudReady && roomHydrated) {
      skipPushRef.current = true
      void pushRoom(roomCode, result.state).then((res) => {
        if (res.ok) {
          skipPushRef.current = true
          setState(res.data)
          stateRef.current = res.data
          setSyncStatus('synced')
        } else {
          setSyncError(res.error)
          setSyncStatus('error')
        }
      })
    }

    if (result.applied === 0) {
      setModal({
        kind: 'result',
        title: 'Nothing updated',
        tone: 'error',
        message:
          result.skipped.length > 0
            ? 'Could not apply these exchanges.'
            : 'Player ids may not match — regenerate the plan and try again.',
        items: pending,
        skipped: result.skipped,
      })
      return
    }

    setModal({
      kind: 'result',
      title:
        result.applied === 1
          ? 'Exchange confirmed'
          : `${result.applied} exchanges confirmed`,
      tone: 'success',
      message:
        'Collections updated: recipients Ready, bringers Lost. Check Collection if you want to double-check.',
      items: pending,
      skipped: result.skipped.length > 0 ? result.skipped : undefined,
    })
  }

  function confirmRound(round: number) {
    if (!plan) return
    const pending = plan.assignments.filter(
      (a) =>
        a.round === round &&
        isExchangeAssignment(a) &&
        !isExchangeConfirmed(a),
    )
    if (pending.length === 0) return
    openConfirmExchanges(
      pending,
      pending.length === 1
        ? `Confirm Round ${round} exchange?`
        : `Confirm ${pending.length} remaining Round ${round} exchanges?`,
    )
  }

  function confirmSingleExchange(a: BringAssignment) {
    if (!isExchangeAssignment(a) || isExchangeConfirmed(a)) return
    openConfirmExchanges([a], 'Confirm this exchange?')
  }

  function showInfoModal(
    title: string,
    message: string,
    tone: 'info' | 'success' | 'error' = 'info',
  ) {
    setModal({ kind: 'result', title, message, tone })
  }

  function addPlayer() {
    setState((s) => {
      const p = createPlayer(`Player ${s.players.length + 1}`, s.players.length)
      return { ...s, players: [...s.players, p] }
    })
  }

  function removePlayer(id: string) {
    setState((s) => ({
      ...s,
      players: s.players.filter((p) => p.id !== id),
      activePlayerIds: s.activePlayerIds.filter((x) => x !== id),
    }))
  }

  function renamePlayer(id: string, name: string) {
    updatePlayer(id, (p) => ({ ...p, name }))
  }

  async function handleCreateRoom() {
    if (!cloudReady) {
      setSyncError('Cloud is not configured. See DEPLOY.md / Help tab.')
      setTab('help')
      return
    }
    setBusy(true)
    setSyncError(null)
    setRoomHydrated(false)
    const result = await createRoom(state)
    setBusy(false)
    if (!result.ok) {
      setSyncError(result.error)
      setSyncStatus('error')
      return
    }
    // Create already wrote current state — skip the first push echo
    skipPushRef.current = true
    setRoomCode(result.data)
    saveRoomCode(result.data)
    writeRoomToUrl(result.data)
    setRoomHydrated(true)
    setSyncStatus('synced')
  }

  async function handleJoinRoom() {
    if (!cloudReady) {
      setSyncError('Cloud is not configured. See DEPLOY.md / Help tab.')
      return
    }
    const code = normalizeRoomCode(joinInput)
    if (code.length < 4) {
      setSyncError('Enter the room code from your squad mate.')
      return
    }
    setBusy(true)
    setSyncError(null)
    setRoomHydrated(false)
    setSyncStatus('connecting')
    const result = await fetchRoom(code)
    setBusy(false)
    if (!result.ok) {
      setSyncError(result.error)
      setSyncStatus('error')
      return
    }
    skipPushRef.current = true
    setState(result.data)
    setSelectedPlayerId(result.data.players[0]?.id ?? '')
    setRoomCode(code)
    saveRoomCode(code)
    writeRoomToUrl(code)
    setJoinInput('')
    setRoomHydrated(true)
    setSyncStatus('synced')
    setPlan(null)
  }

  function handleLeaveRoom() {
    setRoomHydrated(false)
    setRoomCode(null)
    saveRoomCode(null)
    writeRoomToUrl(null)
    setSyncStatus('local')
    setSyncError(null)
  }

  async function copyShareLink() {
    if (!roomCode) return
    const link = shareUrl(roomCode)
    try {
      await navigator.clipboard.writeText(link)
      setSyncError(null)
      showInfoModal(
        'Link copied',
        'Share link copied to the clipboard. Send it to your squad.',
        'success',
      )
    } catch {
      showInfoModal(
        'Copy this link',
        link,
        'info',
      )
    }
  }

  function doExport() {
    const blob = new Blob([exportSquad(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sprite-squad-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function doImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = importSquad(text)
        setState(data)
        setSelectedPlayerId(data.players[0]?.id ?? '')
        setPlan(null)
      } catch {
        showInfoModal(
          'Import failed',
          'Could not import file — invalid squad JSON.',
          'error',
        )
      }
    }
    input.click()
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Sprite Squad</h1>
        <div className="header-actions">
          {roomCode && (
            <span className={`sync-pill sync-${syncStatus}`} title={syncError ?? undefined}>
              {syncLabel(syncStatus, roomCode)}
            </span>
          )}
          <button type="button" className="btn btn-primary" onClick={runSuggest}>
            Suggest
          </button>
        </div>
      </header>

      <nav className="tabs">
        {(
          [
            ['collection', 'Collection'],
            ['suggest', 'Suggest'],
            ['squad', 'Squad'],
            ['help', 'Help'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'collection' && selectedPlayer && (
        <>
          <div className="squad-strip">
            {state.players.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`player-chip ${p.id === selectedPlayer.id ? 'selected' : ''} ${
                  state.activePlayerIds.includes(p.id) ? 'active-play' : ''
                }`}
                style={{ ['--chip-color' as string]: p.color }}
                onClick={() => setSelectedPlayerId(p.id)}
              >
                <span className="dot" />
                {p.name}
              </button>
            ))}
          </div>

          <div className="stats-bar">
            <span>
              <strong>{stats.owned}</strong> / {SPRITES.length} owned
            </span>
            <span>
              <strong style={{ color: 'var(--available)' }}>{stats.available}</strong>{' '}
              available
            </span>
            <span>
              <strong style={{ color: 'var(--lost)' }}>{stats.lost}</strong> lost
            </span>
            <span>
              <strong style={{ color: 'var(--master-gold)' }}>{stats.mastered}</strong>{' '}
              mastered
            </span>
          </div>

          <div className="legend">
            <span>
              <i className="swatch" style={{ background: 'var(--available)' }} /> Tap: Ready ↔
              Lost
            </span>
            <span>
              <i className="swatch" style={{ background: 'var(--none)' }} /> ✕ Missing
            </span>
            <span>
              <i className="swatch" style={{ background: 'var(--master-gold)' }} /> ♛ Mastered
            </span>
          </div>

          <div className="toolbar">
            <input
              className="search"
              placeholder="Search sprites…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="filter-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              title="Sort families"
            >
              <option value="type">Sort: In-game type</option>
              <option value="rarity">Sort: Rarity</option>
              <option value="dust">Sort: Sprite Dust cost</option>
            </select>
            <select
              className="filter-select"
              value={variantFilter}
              onChange={(e) => setVariantFilter(e.target.value)}
            >
              <option value="all">All variants</option>
              {VARIANT_ORDER.map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="need">Missing + lost</option>
              <option value="missing">Missing</option>
              <option value="available">Available</option>
              <option value="lost">Lost</option>
              <option value="mastered">Mastered</option>
              <option value="unmastered">Not mastered</option>
            </select>
          </div>

          {filteredByFamily.map(({ family, sprites }) => (
            <section key={family.id} className="family">
              <h2 className="family-head">
                <span className={`badge ${family.rarity}`}>{family.name}</span>
                <span className={`badge ${family.rarity}`}>{RARITY_LABEL[family.rarity]}</span>
                <span className="ability">{family.ability}</span>
              </h2>
              <div className="variant-grid">
                {sprites.map((sprite) => {
                  const st = getPlayerSprite(selectedPlayer, sprite.id)
                  return (
                    <div
                      key={sprite.id}
                      role="button"
                      tabIndex={0}
                      className={`sprite-card status-${st.status} ${st.mastered ? 'mastered' : ''}`}
                      onClick={() => onSpriteTap(sprite)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSpriteTap(sprite)
                        }
                      }}
                      title={
                        sprite.variantBonus
                          ? `${sprite.ability}\n+ ${sprite.variantBonus}`
                          : sprite.ability
                      }
                    >
                      {st.mastered && (
                        <span className="mastered-badge" aria-hidden title="Mastered">
                          <CrownIcon />
                        </span>
                      )}
                      <div className="sprite-art">
                        <img
                          src={sprite.imageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                      </div>
                      <div className={`sprite-name name-${sprite.familyRarity}`}>
                        {sprite.name}
                      </div>
                      <div className="badge-row">
                        <span className={`badge ${sprite.rarity}`}>
                          {RARITY_LABEL[sprite.rarity]}
                        </span>
                        {sprite.variant !== 'base' && (
                          <span className="badge">{sprite.variant}</span>
                        )}
                      </div>
                      <div
                        className={`dust-cost ${st.status === 'lost' ? 'dust-needed' : ''}`}
                        title="Sprite Dust to re-summon after loss"
                      >
                        <span className="dust-icon" aria-hidden>
                          ✦
                        </span>
                        {sprite.summonCost.toLocaleString()} dust
                      </div>
                      <div className="card-footer">
                        <span className={`status-label ${st.status}`}>
                          {st.status === 'none'
                            ? 'Missing'
                            : st.status === 'available'
                              ? 'Ready'
                              : 'Lost'}
                        </span>
                        <div className="card-actions">
                          <button
                            type="button"
                            className={`card-action-btn missing-btn ${st.status === 'none' ? 'on' : ''}`}
                            onClick={(e) => onMarkMissing(sprite, e)}
                            title="Mark missing"
                            aria-label="Mark missing"
                            aria-pressed={st.status === 'none'}
                          >
                            <DeleteIcon />
                          </button>
                          <button
                            type="button"
                            className={`card-action-btn master-btn ${st.mastered ? 'on' : ''}`}
                            onClick={(e) => onMasterToggle(sprite, e)}
                            title="Toggle mastered"
                            aria-label="Toggle mastered"
                            aria-pressed={st.mastered}
                          >
                            <CrownIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          {filteredByFamily.length === 0 && (
            <p className="empty-hint">No sprites match your filters.</p>
          )}
        </>
      )}

      {tab === 'suggest' && (
        <div className="suggest-panel">
          <div className="help-box">
            <h3>Who is playing this match?</h3>
            <div className="active-select" style={{ marginTop: 10 }}>
              {state.players.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={state.activePlayerIds.includes(p.id)}
                    onChange={() => {
                      setState((s) => {
                        const has = s.activePlayerIds.includes(p.id)
                        return {
                          ...s,
                          activePlayerIds: has
                            ? s.activePlayerIds.filter((id) => id !== p.id)
                            : [...s.activePlayerIds, p.id],
                        }
                      })
                    }}
                  />
                  <span className="dot" style={{ background: p.color }} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          <button type="button" className="btn btn-primary" onClick={runSuggest}>
            Generate bring / gift plan
          </button>

          {plan && (
            <>
              <div className="suggest-summary">{plan.summary}</div>
              <p className="suggest-hint">
                Each round aims for a fair 1:1 — every player gives one and receives one when
                possible. Missing fills always beat lost restores. After the match, confirm each
                exchange (or the whole remaining round) so recipients become Ready and bringers
                Lost. Skip any trade that did not happen.
              </p>

              {plan.assignments.length === 0 ? (
                <p className="empty-hint">
                  No assignments yet. Mark collections and select players.
                </p>
              ) : (
                <div className="round-list">
                  {Array.from({ length: MAX_BRING_PER_PLAYER }, (_, i) => i + 1)
                    .filter((round) => plan.assignments.some((a) => a.round === round))
                    .map((round) => {
                      const items = plan.assignments.filter((a) => a.round === round)
                      const exchanges = items.filter(isExchangeAssignment)
                      const pendingExchanges = exchanges.filter((a) => !isExchangeConfirmed(a))
                      const confirmedCount = exchanges.length - pendingExchanges.length
                      const done =
                        exchanges.length > 0 && pendingExchanges.length === 0
                      return (
                        <section key={round} className={`round-block ${done ? 'round-done' : ''}`}>
                          <div className="round-header">
                            <div className="round-title">
                              <span className="round-num" aria-hidden>
                                {round}
                              </span>
                              <div>
                                <h3>Round {round}</h3>
                                <p className="round-sub">
                                  {exchanges.length} exchange
                                  {exchanges.length === 1 ? '' : 's'}
                                  {confirmedCount > 0 && !done
                                    ? ` · ${confirmedCount} confirmed`
                                    : ''}
                                  {items.length > exchanges.length
                                    ? ` · ${items.length - exchanges.length} mastery`
                                    : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`btn ${done ? '' : 'btn-primary'}`}
                              disabled={done || exchanges.length === 0}
                              onClick={() => confirmRound(round)}
                            >
                              {done
                                ? 'All confirmed'
                                : exchanges.length === 0
                                  ? 'No exchanges'
                                  : confirmedCount > 0
                                    ? `Confirm remaining (${pendingExchanges.length})`
                                    : 'Confirm all'}
                            </button>
                          </div>

                          <div className="assignment-list">
                            {items.map((a, i) => {
                              const needClass =
                                a.needKind === 'missing'
                                  ? 'need-missing'
                                  : a.needKind === 'lost'
                                    ? 'need-lost'
                                    : 'need-mastery'
                              const bringer = state.players.find((p) => p.id === a.bringerId)
                              const isExchange = isExchangeAssignment(a)
                              const exchangeDone = isExchange && isExchangeConfirmed(a)
                              return (
                                <div
                                  key={`${round}-${a.bringerId}-${a.spriteId}-${i}`}
                                  className={`assignment ${a.kind} ${needClass}${
                                    exchangeDone ? ' assignment-confirmed' : ''
                                  }`}
                                >
                                  <span className="round-badge" title={`Round ${round}`}>
                                    {round}
                                  </span>
                                  {a.imageUrl ? (
                                    <div className="assignment-art" aria-hidden>
                                      <img
                                        src={a.imageUrl}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        draggable={false}
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      className="assignment-art assignment-art-empty"
                                      aria-hidden
                                    >
                                      ?
                                    </div>
                                  )}
                                  <div className="assignment-body">
                                    <div className="badge-row">
                                      {a.needKind === 'missing' && (
                                        <span className="kind-tag need-missing-tag">
                                          New (missing)
                                        </span>
                                      )}
                                      {a.needKind === 'lost' && (
                                        <span className="kind-tag need-lost-tag">
                                          Restore lost
                                        </span>
                                      )}
                                      {a.kind === 'mastery' && (
                                        <span className="kind-tag mastery">Mastery</span>
                                      )}
                                      {a.kind === 'repurchase' && (
                                        <span className="kind-tag repurchase">
                                          Bringer repurchase
                                        </span>
                                      )}
                                      {exchangeDone && (
                                        <span className="kind-tag confirmed-tag">Confirmed</span>
                                      )}
                                    </div>
                                    <div className="assignment-main">
                                      <span
                                        className="bringer-label"
                                        style={
                                          bringer
                                            ? { color: bringer.color }
                                            : undefined
                                        }
                                      >
                                        {a.bringerName}
                                      </span>
                                      <span className="arrow">brings</span>
                                      {a.spriteName || '—'}
                                      {a.recipientName && (
                                        <>
                                          <span className="arrow">→</span>
                                          {a.recipientName}
                                        </>
                                      )}
                                    </div>
                                    {typeof a.summonCost === 'number' && (
                                      <div
                                        className={`dust-cost ${a.needsRepurchase ? 'dust-needed' : ''}`}
                                        title={
                                          a.needsRepurchase
                                            ? 'Bringer must re-summon with dust before trading'
                                            : 'Sprite Dust cost if lost / re-summon'
                                        }
                                      >
                                        <span className="dust-icon" aria-hidden>
                                          ✦
                                        </span>
                                        {a.summonCost.toLocaleString()} dust
                                        {a.needsRepurchase ? ' (bringer pays)' : ''}
                                      </div>
                                    )}
                                    <div className="assignment-reason">{a.reason}</div>
                                  </div>
                                  {isExchange && (
                                    <div className="assignment-actions">
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${exchangeDone ? '' : 'btn-primary'}`}
                                        disabled={exchangeDone}
                                        onClick={() => confirmSingleExchange(a)}
                                      >
                                        {exchangeDone ? 'Done' : 'Confirm'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </section>
                      )
                    })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'squad' && (
        <div className="squad-panel">
          <div className="help-box cloud-box">
            <h3>Share with squad (internet)</h3>
            {!cloudReady ? (
              <p>
                Cloud sync is not configured on this build yet. Host the app (Vercel / Netlify)
                with Supabase keys — full steps in the <strong>Help</strong> tab and{' '}
                <code>DEPLOY.md</code>.
              </p>
            ) : roomCode ? (
              <>
                <p>
                  Room code: <strong className="room-code">{roomCode}</strong>
                </p>
                <p className="muted">
                  Everyone opens the same link and edits the same collection live.
                </p>
                <div className="header-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="btn btn-primary" onClick={() => void copyShareLink()}>
                    Copy share link
                  </button>
                  <button type="button" className="btn" onClick={handleLeaveRoom}>
                    Leave room
                  </button>
                </div>
                <p className="sync-detail">
                  Status: {syncLabel(syncStatus, roomCode)}
                  {syncError ? ` — ${syncError}` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="muted">
                  Create a room from your current data, or join a teammate&apos;s code.
                </p>
                <div className="header-actions" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void handleCreateRoom()}
                  >
                    {busy ? 'Working…' : 'Create room'}
                  </button>
                </div>
                <div className="join-row">
                  <input
                    className="search"
                    placeholder="Room code"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    maxLength={8}
                  />
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => void handleJoinRoom()}
                  >
                    Join
                  </button>
                </div>
                {syncError && <p className="error-text">{syncError}</p>}
              </>
            )}
          </div>

          {state.players.map((p, index) => (
            <div key={p.id} className="player-row">
              <div className="reorder-btns">
                <button
                  type="button"
                  className="btn icon-btn"
                  onClick={() => movePlayer(p.id, -1)}
                  disabled={index === 0}
                  title="Move up"
                  aria-label={`Move ${p.name} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn icon-btn"
                  onClick={() => movePlayer(p.id, 1)}
                  disabled={index === state.players.length - 1}
                  title="Move down"
                  aria-label={`Move ${p.name} down`}
                >
                  ↓
                </button>
              </div>
              <span className="dot" style={{ background: p.color, width: 16, height: 16 }} />
              <input
                type="text"
                value={p.name}
                onChange={(e) => renamePlayer(p.id, e.target.value)}
              />
              <button
                type="button"
                className="btn"
                onClick={() => removePlayer(p.id)}
                disabled={state.players.length <= 1}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn" onClick={addPlayer}>
            + Add player
          </button>
          <div className="header-actions">
            <button type="button" className="btn" onClick={doExport}>
              Export JSON
            </button>
            <button type="button" className="btn" onClick={doImport}>
              Import JSON
            </button>
          </div>
          <p className="empty-hint" style={{ padding: 0, textAlign: 'left' }}>
            Local cache is always saved in this browser. When you are in a room, changes also
            sync to the cloud for your teammates.
          </p>
        </div>
      )}

      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null)
          }}
        >
          <div
            className={`modal-panel modal-${modal.kind === 'result' ? modal.tone : 'confirm'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-modal-title"
          >
            <div className="modal-header">
              <h2 id="app-modal-title">{modal.title}</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setModal(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {modal.kind === 'confirm-exchanges' && (
              <>
                <p className="modal-subtitle">{modal.subtitle}</p>
                <div className="modal-exchange-list">
                  {modal.items.map((a, i) => (
                    <ExchangeModalRow key={`${exchangeKey(a)}-${i}`} a={a} players={state.players} />
                  ))}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => applyConfirmedExchanges(modal.items)}
                  >
                    {modal.items.length === 1
                      ? 'Confirm exchange'
                      : `Confirm ${modal.items.length} exchanges`}
                  </button>
                </div>
              </>
            )}

            {modal.kind === 'result' && (
              <>
                <p className="modal-subtitle">{modal.message}</p>
                {modal.items && modal.items.length > 0 && (
                  <div className="modal-exchange-list">
                    {modal.items.map((a, i) => (
                      <ExchangeModalRow
                        key={`${exchangeKey(a)}-${i}`}
                        a={a}
                        players={state.players}
                      />
                    ))}
                  </div>
                )}
                {modal.skipped && modal.skipped.length > 0 && (
                  <ul className="modal-skipped">
                    {modal.skipped.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setModal(null)}
                  >
                    OK
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'help' && (
        <div className="help-box">
          <h3>How to use (in lobby / between games)</h3>
          <ul>
            <li>
              <strong>Collection</strong> — pick a squad mate, then tap a sprite card to toggle{' '}
              <em>Ready ↔ Lost</em> (Missing first becomes Ready).
            </li>
            <li>
              Tap the <strong>✕</strong> button on a card to mark it <strong>Missing</strong>.
            </li>
            <li>
              <strong>Ready</strong> = can bring without Sprite Dust. <strong>Lost</strong> =
              needs repurchase before bringing.
            </li>
            <li>
              Tap the <strong>crown</strong> when a sprite is mastered (extracted at Level 5).
            </li>
            <li>
              <strong>Squad</strong> — use ↑ / ↓ to reorder players; Collection chips follow that
              order.
            </li>
            <li>
              <strong>Suggest</strong> — check who is in the next game, then generate a plan.
            </li>
          </ul>
          <h3 style={{ marginTop: 16 }}>Share online with teammates</h3>
          <ol>
            <li>
              Deploy the site (see <code>DEPLOY.md</code>) — free on Vercel or Netlify.
            </li>
            <li>
              Create a free{' '}
              <a href="https://supabase.com" target="_blank" rel="noreferrer">
                Supabase
              </a>{' '}
              project, run <code>supabase/schema.sql</code>, set env vars.
            </li>
            <li>
              Open <strong>Squad → Create room</strong>, then <strong>Copy share link</strong>.
            </li>
            <li>Teammates open the link (or join with the room code) on phone or PC.</li>
          </ol>
          <p className="muted">
            Cloud configured on this build:{' '}
            <strong>{cloudReady ? 'yes' : 'no — local only'}</strong>
            {cloudReady ? ` · ${getCloudConfigHint()}` : ''}
          </p>
          <h3 style={{ marginTop: 16 }}>Suggestion rules</h3>
          <ul>
            <li>
              <strong>Fair 1:1:</strong> each round prefers that every player both gives and
              receives one sprite (when the collections allow it).
            </li>
            <li>
              <strong>Primary need:</strong> missing (never collected) before any lost restore.
            </li>
            <li>
              <strong>Rounds 1–4:</strong> bring slots; confirm each exchange (or remaining
              round) so recipients become Ready and bringers Lost. Leave failed trades
              unconfirmed.
            </li>
            <li>Prefers <em>Ready</em> inventory over repurchase on the bringer.</li>
          </ul>
          <h3 style={{ marginTop: 16 }}>Catalog</h3>
          <ul>
            <li>
              <strong>{SPRITES.length}</strong> sprite combinations across{' '}
              {SPRITE_FAMILIES.length} families (C7S3 data as of July 2026).
            </li>
            <li>
              Variants: Base, Gold, Gummy, Galaxy, Holofoil, Cube (Gem/Quack reserved for
              future).
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

/** Stable key for tracking which plan exchanges were already applied. */
function exchangeKey(a: BringAssignment): string {
  return `${a.round}::${a.bringerId}::${a.recipientId ?? ''}::${a.spriteId}`
}

function ExchangeModalRow({
  a,
  players,
}: {
  a: BringAssignment
  players: Player[]
}) {
  const bringer = players.find((p) => p.id === a.bringerId)
  const recipient = players.find((p) => p.id === a.recipientId)
  return (
    <div className="modal-exchange-row">
      <div className="modal-exchange-art" aria-hidden>
        {a.imageUrl ? (
          <img src={a.imageUrl} alt="" loading="lazy" decoding="async" draggable={false} />
        ) : (
          <span>?</span>
        )}
      </div>
      <div className="modal-exchange-meta">
        <div className="modal-exchange-names">
          <span
            className="bringer-label"
            style={bringer ? { color: bringer.color } : undefined}
          >
            {a.bringerName}
          </span>
          <span className="arrow">→</span>
          <span
            className="bringer-label"
            style={recipient ? { color: recipient.color } : undefined}
          >
            {a.recipientName}
          </span>
        </div>
        <div className="modal-exchange-sprite">{a.spriteName}</div>
        <div className="modal-exchange-tags">
          {a.needKind === 'missing' && (
            <span className="kind-tag need-missing-tag">New</span>
          )}
          {a.needKind === 'lost' && (
            <span className="kind-tag need-lost-tag">Restore</span>
          )}
          {a.needsRepurchase && (
            <span className="kind-tag repurchase">Repurchase</span>
          )}
          {typeof a.summonCost === 'number' && (
            <span className="modal-exchange-dust">
              ✦ {a.summonCost.toLocaleString()} dust
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function syncLabel(status: SyncStatus, roomCode: string): string {
  switch (status) {
    case 'connecting':
      return `Room ${roomCode}…`
    case 'saving':
      return `Saving ${roomCode}`
    case 'synced':
      return `Live · ${roomCode}`
    case 'error':
      return `Sync error · ${roomCode}`
    case 'offline':
      return `Offline · ${roomCode}`
    default:
      return roomCode
  }
}

/** Plain 3-point crown for mastery. */
function CrownIcon() {
  return (
    <svg
      className="card-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3 18h18v2H3v-2zm1-3.5L2.5 7.2 8 11l4-6.5 4 6.5 5.5-3.8L20 14.5H4z"
      />
    </svg>
  )
}

/** Crossed circle — mark sprite missing / clear ownership. */
function DeleteIcon() {
  return (
    <svg
      className="card-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 8l8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}


