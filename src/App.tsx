import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
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
  exportPlayer,
  exportSquad,
  getPlayerSprite,
  importSquad,
  loadRoomCode,
  loadSquad,
  parsePlayerImport,
  saveRoomCode,
  saveSquad,
} from './lib/storage'
import { useI18n } from './i18n'
import {
  applyExchangeRound,
  buildSuggestionPlan,
  isExchangeAssignment,
  loadSuggestMode,
  MAX_BRING_PER_PLAYER,
  saveSuggestMode,
  type ExchangeApplyMode,
} from './lib/suggest'
import type {
  BringAssignment,
  ExchangeOutcome,
  Player,
  SquadState,
  SuggestMode,
} from './types'
import './App.css'

type Tab = 'collection' | 'suggest' | 'squad' | 'help'
type SyncStatus = 'local' | 'connecting' | 'synced' | 'saving' | 'error' | 'offline'

type AppModal =
  | {
      kind: 'confirm-exchanges'
      mode: ExchangeApplyMode
      title: string
      subtitle: string
      items: BringAssignment[]
    }
  | {
      kind: 'confirm-delete-player'
      playerId: string
      playerName: string
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
  const { t, locale, setLocale, locales } = useI18n()
  const [state, setState] = useState<SquadState>(() => loadSquad())
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [tab, setTab] = useState<Tab>('collection')
  const [query, setQuery] = useState('')
  const [variantFilter, setVariantFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortMode, setSortMode] = useState<SortMode>('type')
  const [suggestMode, setSuggestMode] = useState<SuggestMode>(() =>
    loadSuggestMode(),
  )
  const [modal, setModal] = useState<AppModal | null>(null)

  /** Shared plan + outcomes live on SquadState so the room syncs them. */
  const plan = state.suggestion?.plan ?? null
  const exchangeOutcomes = state.suggestion?.outcomes ?? {}
  const planMode = state.suggestion?.mode ?? suggestMode

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
  /** Bumps on every local edit; used so a slow save cannot wipe newer taps. */
  const editSeqRef = useRef(0)
  const saveInFlightRef = useRef(false)
  const needsResaveRef = useRef(false)
  /** One automatic room re-fetch per error streak (no reload loops). */
  const autoRecoverAttemptedRef = useRef(false)

  const roomLive = Boolean(roomCode && cloudReady && roomHydrated)
  const interactionLocked =
    roomLive && (syncStatus === 'saving' || syncStatus === 'connecting')

  const bumpEdit = useCallback(() => {
    editSeqRef.current += 1
    if (roomCode && cloudReady && roomHydrated) {
      setSyncStatus('saving')
    }
  }, [roomCode, roomHydrated])

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
        // Don't clobber in-flight local edits or a save mid-flight
        if (saveInFlightRef.current || needsResaveRef.current) return

        const localRev = stateRef.current.revision ?? 0
        const remoteRev = remote.revision ?? 0
        if (remoteRev > 0 && remoteRev < localRev) return

        skipPushRef.current = true
        setState(remote)
        stateRef.current = remote
        setSyncStatus('synced')
        setSyncError(null)
        autoRecoverAttemptedRef.current = false
      },
      (msg) => {
        setSyncError(msg)
        setSyncStatus('error')
      },
    )

    return () => sub.unsubscribe()
  }, [roomCode, roomHydrated])

  const flushRoomSave = useCallback(async () => {
    if (!roomCode || !cloudReady || !roomHydrated) return
    if (saveInFlightRef.current) {
      needsResaveRef.current = true
      return
    }

    saveInFlightRef.current = true
    needsResaveRef.current = false
    setSyncStatus('saving')

    const code = roomCode
    const seqAtStart = editSeqRef.current
    const snapshot = stateRef.current

    const result = await pushRoom(code, snapshot)

    saveInFlightRef.current = false

    if (!result.ok) {
      if (result.error.includes('Blocked overwrite')) {
        const reloaded = await fetchRoom(code)
        if (reloaded.ok) {
          skipPushRef.current = true
          setState(reloaded.data)
          stateRef.current = reloaded.data
          setSyncStatus('synced')
          setSyncError(null)
          autoRecoverAttemptedRef.current = false
          return
        }
      }
      setSyncError(result.error)
      setSyncStatus('error')
      return
    }

    autoRecoverAttemptedRef.current = false

    // Local changed while the network save was in flight — keep local, save again
    if (editSeqRef.current !== seqAtStart || needsResaveRef.current) {
      needsResaveRef.current = false
      setSyncStatus('saving')
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
      pushTimerRef.current = setTimeout(() => {
        void flushRoomSave()
      }, 200)
      return
    }

    // Safe to take server snapshot (includes bumped revision)
    skipPushRef.current = true
    setState(result.data)
    stateRef.current = result.data
    setSyncStatus('synced')
    setSyncError(null)
  }, [roomCode, roomHydrated])

  // Debounced push of local edits — only after room is hydrated
  useEffect(() => {
    if (!roomCode || !cloudReady || !roomHydrated) return
    if (skipPushRef.current) {
      skipPushRef.current = false
      return
    }

    setSyncStatus('saving')
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      void flushRoomSave()
    }, 450)

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [state, roomCode, roomHydrated, flushRoomSave])

  // One automatic re-fetch when sync errors (no full reload loop)
  useEffect(() => {
    if (syncStatus !== 'error' || !roomCode || !cloudReady) return
    if (autoRecoverAttemptedRef.current) return
    autoRecoverAttemptedRef.current = true

    let cancelled = false
    void (async () => {
      const reloaded = await fetchRoom(roomCode)
      if (cancelled) return
      if (reloaded.ok) {
        skipPushRef.current = true
        setState(reloaded.data)
        stateRef.current = reloaded.data
        setRoomHydrated(true)
        setSyncStatus('synced')
        setSyncError(null)
        autoRecoverAttemptedRef.current = false
        return
      }
      // Stay in error; user can tap the pill to hard-refresh
      setSyncError(reloaded.error)
    })()

    return () => {
      cancelled = true
    }
  }, [syncStatus, roomCode])

  const selectedPlayer = useMemo(
    () => state.players.find((p) => p.id === selectedPlayerId) ?? state.players[0],
    [state.players, selectedPlayerId],
  )

  const updatePlayer = useCallback(
    (playerId: string, fn: (p: Player) => Player) => {
      if (interactionLocked) return
      bumpEdit()
      setState((s) => ({
        ...s,
        players: s.players.map((p) => (p.id === playerId ? fn(p) : p)),
      }))
    },
    [interactionLocked, bumpEdit],
  )

  function setStatusFilterSmart(next: string) {
    setStatusFilter((prev) => (prev === next ? 'all' : next))
  }

  function onLegendTapCycle() {
    // Green legend: toggle Ready ↔ Missing+Lost
    setStatusFilter((prev) =>
      prev === 'available' ? 'need' : prev === 'need' ? 'available' : 'available',
    )
  }

  function onSyncPillClick() {
    if (syncStatus === 'error') {
      window.location.reload()
    }
  }

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

  function setSuggestModeAndSave(mode: SuggestMode) {
    setSuggestMode(mode)
    saveSuggestMode(mode)
  }

  function runSuggest(mode: SuggestMode = suggestMode) {
    const built = buildSuggestionPlan(state, locale, mode)
    const planId = crypto.randomUUID()
    const nextPlan = { ...built, planId }
    setState((s) => {
      const next: SquadState = {
        ...s,
        suggestion: {
          planId,
          plan: nextPlan,
          outcomes: {},
          mode,
        },
      }
      stateRef.current = next
      return next
    })
    setTab('suggest')
  }

  function clearSharedSuggestion() {
    setState((s) => {
      if (!s.suggestion) return s
      const { suggestion: _drop, ...rest } = s
      const next = { ...rest } as SquadState
      stateRef.current = next
      return next
    })
  }

  function exchangeOutcome(a: BringAssignment): ExchangeOutcome | undefined {
    return exchangeOutcomes[exchangeKey(a)]
  }

  function isExchangeHandled(a: BringAssignment): boolean {
    return exchangeOutcome(a) !== undefined
  }

  function subtitleForMode(mode: ExchangeApplyMode): string {
    if (mode === 'success') return t('confirm.subtitle')
    if (mode === 'failed') return t('confirm.failSubtitle')
    return t('confirm.ignoreSubtitle')
  }

  function titleForMode(
    mode: ExchangeApplyMode,
    scope: 'one' | 'roundOne' | 'roundMany',
    vars?: Record<string, string | number>,
  ): string {
    if (mode === 'success') {
      if (scope === 'one') return t('confirm.titleOne')
      if (scope === 'roundOne') return t('confirm.titleRoundOne', vars)
      return t('confirm.titleRoundMany', vars)
    }
    if (mode === 'failed') {
      if (scope === 'one') return t('confirm.failTitleOne')
      if (scope === 'roundOne') return t('confirm.failTitleRoundOne', vars)
      return t('confirm.failTitleRoundMany', vars)
    }
    if (scope === 'one') return t('confirm.ignoreTitleOne')
    if (scope === 'roundOne') return t('confirm.ignoreTitleRoundOne', vars)
    return t('confirm.ignoreTitleRoundMany', vars)
  }

  function openConfirmExchanges(
    items: BringAssignment[],
    title: string,
    mode: ExchangeApplyMode,
  ) {
    const currentOutcomes = stateRef.current.suggestion?.outcomes ?? {}
    const pending = items.filter(
      (a) =>
        isExchangeAssignment(a) &&
        currentOutcomes[exchangeKey(a)] === undefined,
    )
    if (pending.length === 0) return
    setModal({
      kind: 'confirm-exchanges',
      mode,
      title,
      subtitle: subtitleForMode(mode),
      items: pending,
    })
  }

  /**
   * Apply exchanges from the latest squad snapshot (not a setState side-effect),
   * then show a result modal. Outcomes are written into SquadState.suggestion so
   * every room client greys out the same rows.
   */
  function applyExchanges(items: BringAssignment[], mode: ExchangeApplyMode) {
    const base = stateRef.current
    const currentOutcomes = base.suggestion?.outcomes ?? {}
    const pending = items.filter(
      (a) =>
        isExchangeAssignment(a) &&
        currentOutcomes[exchangeKey(a)] === undefined,
    )
    if (pending.length === 0) {
      setModal({
        kind: 'result',
        title: t('confirm.alreadyTitle'),
        tone: 'info',
        message: t('confirm.alreadyMsg'),
      })
      return
    }

    const result = applyExchangeRound(base, pending, mode)
    const outcome: ExchangeOutcome =
      mode === 'success' ? 'success' : mode === 'failed' ? 'failed' : 'ignored'

    const nextOutcomes = { ...currentOutcomes }
    for (const a of pending) {
      nextOutcomes[exchangeKey(a)] = outcome
    }

    const shared = base.suggestion
    const nextState: SquadState = {
      ...result.state,
      suggestion: shared
        ? {
            planId: shared.planId,
            plan: shared.plan,
            outcomes: nextOutcomes,
            mode: shared.mode ?? suggestMode,
          }
        : {
            planId: plan?.planId ?? crypto.randomUUID(),
            plan: plan ?? {
              planId: crypto.randomUUID(),
              generatedAt: new Date().toISOString(),
              activePlayerIds: base.activePlayerIds,
              assignments: pending,
              summary: '',
            },
            outcomes: nextOutcomes,
            mode: suggestMode,
          },
    }

    setState(nextState)
    stateRef.current = nextState

    if (result.applied > 0 && roomCode && cloudReady && roomHydrated) {
      skipPushRef.current = true
      void pushRoom(roomCode, nextState).then((res) => {
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
        title: t('confirm.nothingTitle'),
        tone: 'error',
        message:
          result.skipped.length > 0
            ? t('confirm.nothingSkipped')
            : t('confirm.nothingIds'),
        items: pending,
        skipped: result.skipped,
      })
      return
    }

    const title =
      mode === 'success'
        ? result.applied === 1
          ? t('confirm.successOne')
          : t('confirm.successMany', { n: result.applied })
        : mode === 'failed'
          ? result.applied === 1
            ? t('confirm.failSuccessOne')
            : t('confirm.failSuccessMany', { n: result.applied })
          : result.applied === 1
            ? t('confirm.ignoreSuccessOne')
            : t('confirm.ignoreSuccessMany', { n: result.applied })

    const message =
      mode === 'success'
        ? t('confirm.successMsg')
        : mode === 'failed'
          ? t('confirm.failSuccessMsg')
          : t('confirm.ignoreSuccessMsg')

    setModal({
      kind: 'result',
      title,
      tone: mode === 'success' ? 'success' : 'info',
      message,
      items: pending,
      skipped: result.skipped.length > 0 ? result.skipped : undefined,
    })
  }

  function confirmRound(round: number, mode: ExchangeApplyMode = 'success') {
    if (!plan) return
    const pending = plan.assignments.filter(
      (a) =>
        a.round === round &&
        isExchangeAssignment(a) &&
        !isExchangeHandled(a),
    )
    if (pending.length === 0) return
    const scope = pending.length === 1 ? 'roundOne' : 'roundMany'
    openConfirmExchanges(
      pending,
      titleForMode(
        mode,
        scope,
        pending.length === 1
          ? { n: round }
          : { count: pending.length, n: round },
      ),
      mode,
    )
  }

  function confirmSingleExchange(
    a: BringAssignment,
    mode: ExchangeApplyMode = 'success',
  ) {
    if (!isExchangeAssignment(a) || isExchangeHandled(a)) return
    openConfirmExchanges([a], titleForMode(mode, 'one'), mode)
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
      const p = createPlayer(
        t('squad.playerN', { n: s.players.length + 1 }),
        s.players.length,
      )
      return { ...s, players: [...s.players, p] }
    })
  }

  function requestRemovePlayer(id: string) {
    if (state.players.length <= 1) return
    const player = state.players.find((p) => p.id === id)
    if (!player) return
    setModal({
      kind: 'confirm-delete-player',
      playerId: player.id,
      playerName: player.name,
    })
  }

  function removePlayer(id: string) {
    const remaining = state.players.filter((p) => p.id !== id)
    setState((s) => ({
      ...s,
      players: s.players.filter((p) => p.id !== id),
      activePlayerIds: s.activePlayerIds.filter((x) => x !== id),
    }))
    if (selectedPlayerId === id) {
      setSelectedPlayerId(remaining[0]?.id ?? '')
    }
    clearSharedSuggestion()
  }

  function renamePlayer(id: string, name: string) {
    updatePlayer(id, (p) => ({ ...p, name }))
  }

  function doExportPlayer(id: string) {
    const player = state.players.find((p) => p.id === id)
    if (!player) return
    const safe = player.name.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'player'
    const blob = new Blob([exportPlayer(player)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sprite-player-${safe}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function doImportPlayer(id: string) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = parsePlayerImport(text)
        updatePlayer(id, (p) => ({
          ...p,
          name: data.name || p.name,
          color: data.color ?? p.color,
          sprites: data.sprites,
        }))
        clearSharedSuggestion()
        showInfoModal(
          t('importExport.playerImportedTitle'),
          t('importExport.playerImportedMsg', {
            name: data.name || t('importExport.playerDefault'),
          }),
          'success',
        )
      } catch (err) {
        showInfoModal(
          t('importExport.importFailed'),
          err instanceof Error
            ? err.message
            : t('importExport.importSquadInvalid'),
          'error',
        )
      }
    }
    input.click()
  }

  async function handleCreateRoom() {
    if (!cloudReady) {
      setSyncError(t('squad.cloudNotAvailable'))
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
        t('importExport.linkCopiedTitle'),
        t('importExport.linkCopiedMsg'),
        'success',
      )
    } catch {
      showInfoModal(t('importExport.copyLinkTitle'), link, 'info')
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
        stateRef.current = data
        setSelectedPlayerId(data.players[0]?.id ?? '')
      } catch {
        showInfoModal(
          t('importExport.importFailed'),
          t('importExport.importSquadInvalid'),
          'error',
        )
      }
    }
    input.click()
  }

  return (
    <div className={`app${interactionLocked ? ' app-sync-busy' : ''}`}>
      {interactionLocked && (
        <div className="sync-busy-overlay" aria-live="polite" aria-busy="true">
          <span className="sync-busy-label">{t('sync.pleaseWait')}</span>
        </div>
      )}
      <header className="header">
        <h1>{t('app.title')}</h1>
        <div className="header-actions">
          <label className="lang-select-wrap">
            <span className="visually-hidden">{t('lang.label')}</span>
            <select
              className="lang-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'es')}
              aria-label={t('lang.label')}
              title={t('lang.label')}
            >
              {locales.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.native}
                </option>
              ))}
            </select>
          </label>
          {roomCode && (
            <button
              type="button"
              className={`sync-pill sync-${syncStatus}${
                syncStatus === 'error' ? ' sync-pill-clickable' : ''
              }`}
              title={
                syncStatus === 'error'
                  ? t('sync.errorTapRefresh')
                  : (syncError ?? undefined)
              }
              onClick={onSyncPillClick}
              disabled={syncStatus !== 'error'}
            >
              {syncLabel(syncStatus, roomCode, t)}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => runSuggest(suggestMode)}
          >
            {t('app.suggest')}
          </button>
        </div>
      </header>

      <nav className="tabs">
        {(
          [
            ['collection', 'tabs.collection'],
            ['suggest', 'tabs.suggest'],
            ['squad', 'tabs.squad'],
            ['help', 'tabs.help'],
          ] as const
        ).map(([id, labelKey]) => (
          <button
            key={id}
            type="button"
            className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {t(labelKey)}
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

          <div className="stats-bar" role="toolbar" aria-label={t('collection.statsFilterLabel')}>
            <button
              type="button"
              className={`stat-chip${statusFilter === 'all' ? ' active' : ''}`}
              onClick={() => setStatusFilterSmart('all')}
              title={t('collection.filterOwnedTitle')}
            >
              <strong>{stats.owned}</strong> / {SPRITES.length} {t('collection.owned')}
            </button>
            <button
              type="button"
              className={`stat-chip${statusFilter === 'available' ? ' active' : ''}`}
              onClick={() => setStatusFilterSmart('available')}
              title={t('collection.filterAvailableTitle')}
            >
              <strong style={{ color: 'var(--available)' }}>{stats.available}</strong>{' '}
              {t('collection.available')}
            </button>
            <button
              type="button"
              className={`stat-chip${statusFilter === 'lost' ? ' active' : ''}`}
              onClick={() => setStatusFilterSmart('lost')}
              title={t('collection.filterLostTitle')}
            >
              <strong style={{ color: 'var(--lost)' }}>{stats.lost}</strong>{' '}
              {t('collection.lost')}
            </button>
            <button
              type="button"
              className={`stat-chip${statusFilter === 'mastered' ? ' active' : ''}`}
              onClick={() => setStatusFilterSmart('mastered')}
              title={t('collection.filterMasteredTitle')}
            >
              <strong style={{ color: 'var(--master-gold)' }}>{stats.mastered}</strong>{' '}
              {t('collection.mastered')}
            </button>
          </div>

          <div className="legend" role="toolbar" aria-label={t('collection.legendFilterLabel')}>
            <button
              type="button"
              className={`legend-chip${
                statusFilter === 'available' || statusFilter === 'need' ? ' active' : ''
              }`}
              onClick={onLegendTapCycle}
              title={t('collection.legendTapTitle')}
            >
              <i className="swatch" style={{ background: 'var(--available)' }} />{' '}
              {t('collection.legendTap')}
            </button>
            <button
              type="button"
              className={`legend-chip${statusFilter === 'missing' ? ' active' : ''}`}
              onClick={() => setStatusFilterSmart('missing')}
              title={t('collection.legendMissingTitle')}
            >
              <i className="swatch" style={{ background: 'var(--none)' }} />{' '}
              {t('collection.legendMissing')}
            </button>
            <button
              type="button"
              className={`legend-chip${statusFilter === 'mastered' ? ' active' : ''}`}
              onClick={() => setStatusFilterSmart('mastered')}
              title={t('collection.legendMasteredTitle')}
            >
              <i className="swatch" style={{ background: 'var(--master-gold)' }} />{' '}
              {t('collection.legendMastered')}
            </button>
          </div>

          <div className="toolbar">
            <input
              className="search"
              placeholder={t('collection.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="filter-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              title={t('collection.sortTitle')}
            >
              <option value="type">{t('collection.sortType')}</option>
              <option value="rarity">{t('collection.sortRarity')}</option>
              <option value="dust">{t('collection.sortDust')}</option>
            </select>
            <select
              className="filter-select"
              value={variantFilter}
              onChange={(e) => setVariantFilter(e.target.value)}
            >
              <option value="all">{t('variant.all')}</option>
              {VARIANT_ORDER.map((v) => (
                <option key={v} value={v}>
                  {t(`variant.${v}`)}
                </option>
              ))}
            </select>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('collection.allStatus')}</option>
              <option value="need">{t('collection.needFilter')}</option>
              <option value="missing">{t('status.missing')}</option>
              <option value="available">{t('status.available')}</option>
              <option value="lost">{t('status.lost')}</option>
              <option value="mastered">{t('status.mastered')}</option>
              <option value="unmastered">{t('status.notMastered')}</option>
            </select>
          </div>

          {filteredByFamily.map(({ family, sprites }) => (
            <section key={family.id} className="family">
              <h2 className="family-head">
                <span className={`badge ${family.rarity}`}>{family.name}</span>
                <span className={`badge ${family.rarity}`}>
                  {t(`rarity.${family.rarity}`)}
                </span>
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
                        <span
                          className="mastered-badge"
                          aria-hidden
                          title={t('collection.masteredBadge')}
                        >
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
                          {t(`rarity.${sprite.rarity}`)}
                        </span>
                        {sprite.variant !== 'base' && (
                          <span className="badge">{t(`variant.${sprite.variant}`)}</span>
                        )}
                      </div>
                      <div
                        className={`dust-cost ${st.status === 'lost' ? 'dust-needed' : ''}`}
                        title={t('collection.dustTitle')}
                      >
                        <span className="dust-icon" aria-hidden>
                          ✦
                        </span>
                        {sprite.summonCost.toLocaleString()} {t('collection.dust')}
                      </div>
                      <div className="card-footer">
                        <span className={`status-label ${st.status}`}>
                          {st.status === 'none'
                            ? t('status.missing')
                            : st.status === 'available'
                              ? t('status.ready')
                              : t('status.lost')}
                        </span>
                        <div className="card-actions">
                          <button
                            type="button"
                            className={`card-action-btn missing-btn ${st.status === 'none' ? 'on' : ''}`}
                            onClick={(e) => onMarkMissing(sprite, e)}
                            title={t('collection.markMissing')}
                            aria-label={t('collection.markMissing')}
                            aria-pressed={st.status === 'none'}
                          >
                            <DeleteIcon />
                          </button>
                          <button
                            type="button"
                            className={`card-action-btn master-btn ${st.mastered ? 'on' : ''}`}
                            onClick={(e) => onMasterToggle(sprite, e)}
                            title={t('collection.toggleMastered')}
                            aria-label={t('collection.toggleMastered')}
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
            <p className="empty-hint">{t('collection.noMatch')}</p>
          )}
        </>
      )}

      {tab === 'suggest' && (
        <div className="suggest-panel">
          <div className="help-box">
            <h3>{t('suggest.whoPlaying')}</h3>
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

          <div className="suggest-mode-bar">
            <span className="suggest-mode-label">{t('suggest.modeLabel')}</span>
            <div className="suggest-mode-toggle" role="group" aria-label={t('suggest.modeLabel')}>
              <button
                type="button"
                className={`btn btn-sm suggest-mode-btn ${suggestMode === 'completion' ? 'active' : ''}`}
                onClick={() => setSuggestModeAndSave('completion')}
                title={t('suggest.modeCompletionHint')}
              >
                {t('suggest.modeCompletion')}
              </button>
              <button
                type="button"
                className={`btn btn-sm suggest-mode-btn ${suggestMode === 'fair' ? 'active' : ''}`}
                onClick={() => setSuggestModeAndSave('fair')}
                title={t('suggest.modeFairHint')}
              >
                {t('suggest.modeFair')}
              </button>
            </div>
          </div>
          <p className="suggest-hint">
            {suggestMode === 'fair'
              ? t('suggest.hintFair')
              : t('suggest.hintCompletion')}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => runSuggest(suggestMode)}
          >
            {t('suggest.generate')}
          </button>

          {plan && (
            <>
              <div className="suggest-summary">
                <span className="suggest-mode-badge">
                  {planMode === 'fair'
                    ? t('suggest.modeFair')
                    : t('suggest.modeCompletion')}
                </span>
                {plan.summary}
              </div>
              {planMode !== suggestMode && (
                <p className="suggest-mode-mismatch">
                  {t('suggest.modeMismatch')}
                </p>
              )}

              {plan.assignments.length === 0 ? (
                <p className="empty-hint">{t('suggest.noAssignments')}</p>
              ) : (
                <div className="round-list">
                  {Array.from({ length: MAX_BRING_PER_PLAYER }, (_, i) => i + 1)
                    .filter((round) => plan.assignments.some((a) => a.round === round))
                    .map((round) => {
                      const items = plan.assignments.filter((a) => a.round === round)
                      const exchanges = items.filter(isExchangeAssignment)
                      const pendingExchanges = exchanges.filter((a) => !isExchangeHandled(a))
                      const handledCount = exchanges.length - pendingExchanges.length
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
                                <h3>{t('suggest.round', { n: round })}</h3>
                                <p className="round-sub">
                                  {exchanges.length}{' '}
                                  {exchanges.length === 1
                                    ? t('suggest.exchange')
                                    : t('suggest.exchanges')}
                                  {handledCount > 0 && !done
                                    ? ` · ${t('suggest.handled', { n: handledCount })}`
                                    : ''}
                                  {items.length > exchanges.length
                                    ? ` · ${t('suggest.masteryCount', {
                                        n: items.length - exchanges.length,
                                      })}`
                                    : ''}
                                </p>
                              </div>
                            </div>
                            <div className="round-header-actions">
                              <button
                                type="button"
                                className={`btn ${done ? '' : 'btn-primary'}`}
                                disabled={done || exchanges.length === 0}
                                onClick={() => confirmRound(round, 'success')}
                              >
                                {done
                                  ? t('suggest.allHandled')
                                  : exchanges.length === 0
                                    ? t('suggest.noExchanges')
                                    : handledCount > 0
                                      ? t('suggest.confirmRemaining', {
                                          n: pendingExchanges.length,
                                        })
                                      : t('suggest.confirmAll')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-warn"
                                disabled={done || exchanges.length === 0}
                                onClick={() => confirmRound(round, 'failed')}
                                title={t('suggest.failedTitle')}
                              >
                                {done
                                  ? t('suggest.done')
                                  : handledCount > 0
                                    ? t('suggest.failedRemaining', {
                                        n: pendingExchanges.length,
                                      })
                                    : t('suggest.failedAll')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-mute"
                                disabled={done || exchanges.length === 0}
                                onClick={() => confirmRound(round, 'ignored')}
                                title={t('suggest.ignoreTitle')}
                              >
                                {done
                                  ? t('suggest.done')
                                  : handledCount > 0
                                    ? t('suggest.ignoreRemaining', {
                                        n: pendingExchanges.length,
                                      })
                                    : t('suggest.ignoreAll')}
                              </button>
                            </div>
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
                              const recipient = state.players.find(
                                (p) => p.id === a.recipientId,
                              )
                              const isExchange = isExchangeAssignment(a)
                              const outcome = isExchange ? exchangeOutcome(a) : undefined
                              const exchangeDone = outcome !== undefined
                              return (
                                <div
                                  key={`${round}-${a.bringerId}-${a.spriteId}-${i}`}
                                  className={`assignment ${a.kind} ${needClass}${
                                    outcome === 'success'
                                      ? ' assignment-confirmed'
                                      : outcome === 'failed'
                                        ? ' assignment-failed'
                                        : outcome === 'ignored'
                                          ? ' assignment-ignored'
                                          : ''
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
                                          {t('suggest.newMissing')}
                                        </span>
                                      )}
                                      {a.needKind === 'lost' && (
                                        <span className="kind-tag need-lost-tag">
                                          {t('suggest.restoreLost')}
                                        </span>
                                      )}
                                      {a.kind === 'mastery' && (
                                        <span className="kind-tag mastery">
                                          {t('suggest.mastery')}
                                        </span>
                                      )}
                                      {a.kind === 'repurchase' && (
                                        <span className="kind-tag repurchase">
                                          {t('suggest.bringerRepurchase')}
                                        </span>
                                      )}
                                      {outcome === 'success' && (
                                        <span className="kind-tag confirmed-tag">
                                          {t('suggest.confirmedTag')}
                                        </span>
                                      )}
                                      {outcome === 'failed' && (
                                        <span className="kind-tag failed-tag">
                                          {t('suggest.failedTag')}
                                        </span>
                                      )}
                                      {outcome === 'ignored' && (
                                        <span className="kind-tag ignored-tag">
                                          {t('suggest.ignoredTag')}
                                        </span>
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
                                      <span className="arrow">{t('suggest.brings')}</span>
                                      {a.spriteName || '—'}
                                      {a.recipientName && (
                                        <>
                                          <span className="arrow">→</span>
                                          <span
                                            className="bringer-label"
                                            style={
                                              recipient
                                                ? { color: recipient.color }
                                                : undefined
                                            }
                                          >
                                            {a.recipientName}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    {typeof a.summonCost === 'number' && (
                                      <div
                                        className={`dust-cost ${a.needsRepurchase ? 'dust-needed' : ''}`}
                                        title={
                                          a.needsRepurchase
                                            ? t('suggest.dustBringerMust')
                                            : t('suggest.dustIfLost')
                                        }
                                      >
                                        <span className="dust-icon" aria-hidden>
                                          ✦
                                        </span>
                                        {a.summonCost.toLocaleString()}{' '}
                                        {a.needsRepurchase
                                          ? t('suggest.dustBringerPays')
                                          : t('collection.dust')}
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
                                        onClick={() =>
                                          confirmSingleExchange(a, 'success')
                                        }
                                      >
                                        {outcome === 'success'
                                          ? t('suggest.done')
                                          : t('suggest.confirm')}
                                      </button>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${exchangeDone ? '' : 'btn-warn'}`}
                                        disabled={exchangeDone}
                                        onClick={() =>
                                          confirmSingleExchange(a, 'failed')
                                        }
                                        title={t('suggest.failedTitle')}
                                      >
                                        {outcome === 'failed'
                                          ? t('suggest.done')
                                          : t('suggest.failed')}
                                      </button>
                                      <button
                                        type="button"
                                        className={`btn btn-sm ${exchangeDone ? '' : 'btn-mute'}`}
                                        disabled={exchangeDone}
                                        onClick={() =>
                                          confirmSingleExchange(a, 'ignored')
                                        }
                                        title={t('suggest.ignoreTitle')}
                                      >
                                        {outcome === 'ignored'
                                          ? t('suggest.done')
                                          : t('suggest.ignore')}
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
            <h3>{t('squad.shareTitle')}</h3>
            {!cloudReady ? (
              <p>{t('squad.cloudUnavailable')}</p>
            ) : roomCode ? (
              <>
                <p>
                  {t('squad.roomCode')} <strong className="room-code">{roomCode}</strong>
                </p>
                <p className="muted">{t('squad.roomHint')}</p>
                <div className="header-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="btn btn-primary" onClick={() => void copyShareLink()}>
                    {t('squad.copyLink')}
                  </button>
                  <button type="button" className="btn" onClick={handleLeaveRoom}>
                    {t('squad.leaveRoom')}
                  </button>
                </div>
                <p className="sync-detail">
                  {t('squad.status')} {syncLabel(syncStatus, roomCode, t)}
                  {syncError ? ` — ${syncError}` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="muted">{t('squad.createHint')}</p>
                <div className="header-actions" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void handleCreateRoom()}
                  >
                    {busy ? t('squad.working') : t('squad.createRoom')}
                  </button>
                </div>
                <div className="join-row">
                  <input
                    className="search"
                    placeholder={t('squad.roomPlaceholder')}
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
                    {t('squad.join')}
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
                  title={t('squad.moveUp')}
                  aria-label={`${t('squad.moveUp')}: ${p.name}`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn icon-btn"
                  onClick={() => movePlayer(p.id, 1)}
                  disabled={index === state.players.length - 1}
                  title={t('squad.moveDown')}
                  aria-label={`${t('squad.moveDown')}: ${p.name}`}
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
              <div className="player-row-actions">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => doExportPlayer(p.id)}
                  title={t('squad.exportPlayerTitle')}
                >
                  {t('squad.export')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => doImportPlayer(p.id)}
                  title={t('squad.importPlayerTitle')}
                >
                  {t('squad.import')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => requestRemovePlayer(p.id)}
                  disabled={state.players.length <= 1}
                  title={t('squad.removeTitle')}
                >
                  {t('squad.remove')}
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn" onClick={addPlayer}>
            {t('squad.addPlayer')}
          </button>
          <div className="header-actions">
            <button type="button" className="btn" onClick={doExport}>
              {t('squad.exportFull')}
            </button>
            <button type="button" className="btn" onClick={doImport}>
              {t('squad.importFull')}
            </button>
          </div>
          <p className="empty-hint" style={{ padding: 0, textAlign: 'left' }}>
            {t('squad.footer')}
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
            className={`modal-panel modal-${
              modal.kind === 'result'
                ? modal.tone
                : modal.kind === 'confirm-delete-player'
                  ? 'error'
                  : 'confirm'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-modal-title"
          >
            <div className="modal-header">
              <h2 id="app-modal-title">
                {modal.kind === 'confirm-delete-player'
                  ? t('deletePlayer.title')
                  : modal.title}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setModal(null)}
                aria-label={t('close')}
              >
                ×
              </button>
            </div>

            {modal.kind === 'confirm-exchanges' && (
              <>
                <p className="modal-subtitle">{modal.subtitle}</p>
                <div className="modal-exchange-list">
                  {modal.items.map((a, i) => (
                    <ExchangeModalRow
                      key={`${exchangeKey(a)}-${i}`}
                      a={a}
                      players={state.players}
                      t={t}
                    />
                  ))}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={() => setModal(null)}>
                    {t('confirm.cancel')}
                  </button>
                  <button
                    type="button"
                    className={
                      modal.mode === 'success'
                        ? 'btn btn-primary'
                        : modal.mode === 'failed'
                          ? 'btn btn-warn'
                          : 'btn btn-mute'
                    }
                    onClick={() => {
                      const mode = modal.mode
                      const items = modal.items
                      setModal(null)
                      applyExchanges(items, mode)
                    }}
                  >
                    {modal.mode === 'success'
                      ? modal.items.length === 1
                        ? t('confirm.confirmOne')
                        : t('confirm.confirmMany', { n: modal.items.length })
                      : modal.mode === 'failed'
                        ? modal.items.length === 1
                          ? t('confirm.failConfirmOne')
                          : t('confirm.failConfirmMany', {
                              n: modal.items.length,
                            })
                        : modal.items.length === 1
                          ? t('confirm.ignoreConfirmOne')
                          : t('confirm.ignoreConfirmMany', {
                              n: modal.items.length,
                            })}
                  </button>
                </div>
              </>
            )}

            {modal.kind === 'confirm-delete-player' && (
              <>
                <p className="modal-subtitle">
                  {t('deletePlayer.body', { name: modal.playerName })
                    .split(modal.playerName)
                    .map((part, i, arr) =>
                      i < arr.length - 1 ? (
                        <span key={i}>
                          {part}
                          <strong style={{ color: 'var(--text)' }}>{modal.playerName}</strong>
                        </span>
                      ) : (
                        <span key={i}>{part}</span>
                      ),
                    )}
                </p>
                <div className="modal-footer">
                  <button type="button" className="btn" onClick={() => setModal(null)}>
                    {t('confirm.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      removePlayer(modal.playerId)
                      setModal(null)
                    }}
                  >
                    {t('deletePlayer.confirm')}
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
                        t={t}
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
                    {t('confirm.ok')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'help' && (
        <div className="help-guide">
          <section className="help-section help-intro">
            <h2>{t('help.introTitle')}</h2>
            <p>{t('help.introP1')}</p>
            <p>{t('help.introP2')}</p>
          </section>

          <section className="help-section">
            <h3>{t('help.startTitle')}</h3>
            <ol className="help-steps">
              <li>{t('help.start1')}</li>
              <li>{t('help.start2')}</li>
              <li>{t('help.start3')}</li>
              <li>{t('help.start4')}</li>
              <li>{t('help.start5')}</li>
            </ol>
          </section>

          <section className="help-section">
            <h3>{t('help.statusesTitle')}</h3>
            <div className="help-status-grid">
              <div className="help-status-card status-missing">
                <strong>{t('help.statusMissingTitle')}</strong>
                <p>{t('help.statusMissingBody')}</p>
              </div>
              <div className="help-status-card status-ready">
                <strong>{t('help.statusReadyTitle')}</strong>
                <p>{t('help.statusReadyBody')}</p>
              </div>
              <div className="help-status-card status-lost">
                <strong>{t('help.statusLostTitle')}</strong>
                <p>{t('help.statusLostBody')}</p>
              </div>
              <div className="help-status-card status-mastered">
                <strong>{t('help.statusMasteredTitle')}</strong>
                <p>{t('help.statusMasteredBody')}</p>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h3>{t('help.collectionTitle')}</h3>
            <ul>
              <li>{t('help.collectionP1')}</li>
              <li>{t('help.collectionP2')}</li>
              <li>{t('help.collectionP3')}</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>{t('help.matchTitle')}</h3>
            <div className="help-two-col">
              <div className="help-card">
                <h4>{t('help.matchBeforeTitle')}</h4>
                <ol>
                  <li>{t('help.matchBefore1')}</li>
                  <li>{t('help.matchBefore2')}</li>
                  <li>{t('help.matchBefore3')}</li>
                </ol>
              </div>
              <div className="help-card">
                <h4>{t('help.matchAfterTitle')}</h4>
                <ol>
                  <li>{t('help.matchAfter1')}</li>
                  <li>{t('help.matchAfter2')}</li>
                  <li>{t('help.matchAfter3')}</li>
                </ol>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h3>{t('help.suggestTitle')}</h3>
            <ul>
              <li>{t('help.suggest1')}</li>
              <li>{t('help.suggest2')}</li>
              <li>{t('help.suggest3')}</li>
              <li>{t('help.suggest4')}</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>{t('help.shareTitle')}</h3>
            <ol className="help-steps">
              <li>{t('help.share1')}</li>
              <li>{t('help.share2')}</li>
              <li>{t('help.share3')}</li>
            </ol>
            <p className="help-note">{t('help.shareNote')}</p>
          </section>

          <section className="help-section">
            <h3>{t('help.backupTitle')}</h3>
            <ul>
              <li>{t('help.backupFull')}</li>
              <li>{t('help.backupPlayer')}</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>{t('help.tipTitle')}</h3>
            <ul>
              <li>{t('help.tip1')}</li>
              <li>{t('help.tip2')}</li>
              <li>{t('help.tip3')}</li>
              <li>
                {t('help.tipCatalog', {
                  sprites: SPRITES.length,
                  families: SPRITE_FAMILIES.length,
                })}
              </li>
            </ul>
          </section>
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
  t,
}: {
  a: BringAssignment
  players: Player[]
  t: (key: string, vars?: Record<string, string | number>) => string
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
            <span className="kind-tag need-missing-tag">{t('confirm.tagNew')}</span>
          )}
          {a.needKind === 'lost' && (
            <span className="kind-tag need-lost-tag">{t('confirm.tagRestore')}</span>
          )}
          {a.needsRepurchase && (
            <span className="kind-tag repurchase">{t('confirm.tagRepurchase')}</span>
          )}
          {typeof a.summonCost === 'number' && (
            <span className="modal-exchange-dust">
              ✦ {a.summonCost.toLocaleString()} {t('collection.dust')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function syncLabel(
  status: SyncStatus,
  roomCode: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  switch (status) {
    case 'connecting':
      return t('sync.connecting', { code: roomCode })
    case 'saving':
      return t('sync.saving', { code: roomCode })
    case 'synced':
      return t('sync.synced', { code: roomCode })
    case 'error':
      return t('sync.error', { code: roomCode })
    case 'offline':
      return t('sync.offline', { code: roomCode })
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


