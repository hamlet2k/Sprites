import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  sortFamilies,
  SPRITE_FAMILIES,
  SPRITES,
  VARIANT_ORDER,
  type SortMode,
  type SpriteEntry,
} from './data/sprites'
import { AuthModal } from './components/AuthModal'
import {
  getCurrentAuthUser,
  listRecentSquads,
  loadUserCollection,
  onAuthStateChange,
  recoverSessionFromUrl,
  rememberJoinedSquad,
  saveUserCollection,
  signOut,
  updatePassword,
  updateRecentSquadName,
  type AuthUser,
  type RecentSquad,
} from './lib/auth'
import {
  createRoom,
  fetchRoom,
  isCloudConfigured,
  mergeSpriteMaps,
  normalizeRoomCode,
  pushRoom,
  resolveUserSeatInSquad,
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
  freshSquadForCreate,
  getPlayerSprite,
  importSquad,
  isSeatTakenByOther,
  loadActorSeatId,
  loadRoomCode,
  loadSquad,
  localDraftFromActor,
  parsePlayerImport,
  saveActorSeatId,
  saveRoomCode,
  saveSquad,
} from './lib/storage'
import { useI18n } from './i18n'
import {
  applyExchangeRound,
  buildSuggestionPlan,
  formatAssignmentReason,
  formatAssignmentSpriteName,
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
  | {
      kind: 'password-recovery'
    }
  | {
      kind: 'link-player'
      user: AuthUser
      candidates: Player[]
    }
  | {
      kind: 'choose-seat'
      reason: 'needed' | 'join'
    }

const cloudReady = isCloudConfigured()

export default function App() {
  const { t, locale, setLocale, locales } = useI18n()
  const [state, setState] = useState<SquadState>(() => loadSquad())
  /** This device's seat — only this collection is editable. */
  const [actorSeatId, setActorSeatIdState] = useState<string | null>(() =>
    loadActorSeatId(),
  )
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    () => loadActorSeatId() || '',
  )

  const setActorSeatId = useCallback((id: string | null) => {
    setActorSeatIdState(id)
    saveActorSeatId(id)
    if (id) setSelectedPlayerId(id)
  }, [])
  const [tab, setTab] = useState<Tab>('collection')
  const [query, setQuery] = useState('')
  const [variantFilter, setVariantFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortMode, setSortMode] = useState<SortMode>('type')
  const [suggestMode, setSuggestMode] = useState<SuggestMode>(() =>
    loadSuggestMode(),
  )
  const [modal, setModal] = useState<AppModal | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [squadNameDraft, setSquadNameDraft] = useState('')
  const [recentSquads, setRecentSquads] = useState<RecentSquad[]>([])
  const [newPassword, setNewPassword] = useState('')
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  /** Page scrolled enough to show hamburger on desktop for quick nav. */
  const [pageScrolled, setPageScrolled] = useState(false)
  /** User forced filter pills open while scrolled down. */
  const [filtersForceExpanded, setFiltersForceExpanded] = useState(false)
  /** True once the collection filter sentinel has left the top of the viewport. */
  const [filtersScrolled, setFiltersScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const filtersSentinelRef = useRef<HTMLDivElement>(null)
  const filtersForceExpandedRef = useRef(false)

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
  /**
   * Bumped when a newer remote snapshot is applied mid-save so the in-flight
   * push result is discarded (prevents idle tabs from re-applying old plans).
   */
  const saveEpochRef = useRef(0)
  /** One automatic room re-fetch per error streak (no reload loops). */
  const autoRecoverAttemptedRef = useRef(false)

  const adoptRemoteState = useCallback((remote: SquadState) => {
    // Overlay portable collection onto our linked seat so edits from other
    // squads (via account store) stay visible, and we don't lose local account progress.
    let next = remote
    const uid = authUser?.id
    if (uid) {
      const mine = remote.players.find((p) => p.userId === uid)
      if (mine) {
        // Prefer remote seat for room-local greying of exchanges, but keep mastered/owned
        // from whatever is richer when we next save — for live view use remote as-is
        // if it already has our userId (collection was pushed with the room).
        next = remote
      }
    }
    skipPushRef.current = true
    setState(next)
    stateRef.current = next
    if (next.name) setSquadNameDraft(next.name)
    setSyncStatus('synced')
    setSyncError(null)
    autoRecoverAttemptedRef.current = false
  }, [authUser?.id])

  const refreshRecentSquads = useCallback(async (userId: string) => {
    const res = await listRecentSquads(userId)
    if (res.ok) setRecentSquads(res.data)
  }, [])

  const roomLive = Boolean(roomCode && cloudReady && roomHydrated)
  const interactionLocked =
    roomLive && (syncStatus === 'saving' || syncStatus === 'connecting')

  const bumpEdit = useCallback(() => {
    editSeqRef.current += 1
    if (roomCode && cloudReady && roomHydrated) {
      setSyncStatus('saving')
    }
  }, [roomCode, roomHydrated])

  const finishSeatReady = useCallback(
    async (
      user: AuthUser,
      next: SquadState,
      playerId: string,
      portable: Record<string, import('./types').PlayerSpriteState>,
    ) => {
      const me = next.players.find((p) => p.id === playerId)
      if (me) {
        void saveUserCollection(user.id, me.sprites ?? portable)
      }
      setState(next)
      stateRef.current = next
      setActorSeatId(playerId)
      if (roomCode && roomHydrated) {
        // Linked seat must sync to the room
        skipPushRef.current = false
        bumpEdit()
      }
      await refreshRecentSquads(user.id)
      if (roomCode) {
        void rememberJoinedSquad(user.id, roomCode, next.name)
      }
    },
    [bumpEdit, refreshRecentSquads, roomCode, roomHydrated, setActorSeatId],
  )

  const applyAuthUser = useCallback(
    async (
      user: AuthUser | null,
      seatOpts?: { claimPlayerId?: string; createNew?: boolean },
    ) => {
      setAuthUser(user)
      if (!user) {
        setRecentSquads([])
        return
      }

      const col = await loadUserCollection(user.id)
      let portable = col.ok ? col.data : {}
      if (Object.keys(portable).length === 0) {
        const cur = stateRef.current
        const seed =
          cur.players.find((p) => p.userId === user.id) ??
          (seatOpts?.claimPlayerId
            ? cur.players.find((p) => p.id === seatOpts.claimPlayerId)
            : undefined) ??
          cur.players.find((p) => p.id === selectedPlayerId)
        if (seed && Object.keys(seed.sprites ?? {}).length > 0) {
          portable = seed.sprites
          void saveUserCollection(user.id, portable)
        }
      }

      const resolved = resolveUserSeatInSquad(
        stateRef.current,
        user,
        portable,
        seatOpts,
      )

      if (resolved.kind === 'needs_link') {
        setModal({
          kind: 'link-player',
          user,
          candidates: resolved.candidates,
        })
        await refreshRecentSquads(user.id)
        return
      }

      await finishSeatReady(user, resolved.state, resolved.playerId, portable)
    },
    [finishSeatReady, refreshRecentSquads, selectedPlayerId],
  )

  // Recover OAuth PKCE (Discord/Google) before treating the user as logged out
  useEffect(() => {
    if (!cloudReady) return
    let cancelled = false
    void (async () => {
      const recovered = await recoverSessionFromUrl()
      if (cancelled) return
      if (recovered.error && recovered.event !== 'stale_oauth') {
        setSyncError(recovered.error)
      }
      if (recovered.user) {
        await applyAuthUser(recovered.user)
        if (
          typeof window !== 'undefined' &&
          window.location.hash.includes('type=recovery')
        ) {
          setModal({ kind: 'password-recovery' })
        }
      }
    })()
    const unsub = onAuthStateChange((u, meta) => {
      if (meta?.event === 'INITIAL_SESSION' && !u) return
      if (meta?.event === 'TOKEN_REFRESHED') return
      void applyAuthUser(u)
      if (
        u &&
        typeof window !== 'undefined' &&
        window.location.hash.includes('type=recovery')
      ) {
        setModal({ kind: 'password-recovery' })
      }
    })
    return () => {
      cancelled = true
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, [])

  // Ensure we always know who "I" am on this device
  useEffect(() => {
    const stillHere =
      actorSeatId && state.players.some((p) => p.id === actorSeatId)
    if (stillHere) {
      if (!selectedPlayerId || !state.players.some((p) => p.id === selectedPlayerId)) {
        setSelectedPlayerId(actorSeatId!)
      }
      return
    }
    // Actor missing from roster (new room / join) → force seat choice
    if (state.players.length > 0) {
      setModal((m) =>
        m?.kind === 'choose-seat' || m?.kind === 'link-player' || m?.kind === 'password-recovery'
          ? m
          : { kind: 'choose-seat', reason: roomCode ? 'join' : 'needed' },
      )
    }
  }, [actorSeatId, state.players, selectedPlayerId, roomCode])

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

  // Sticky collection filters sit just under the sticky header
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const apply = () => {
      const h = Math.ceil(el.getBoundingClientRect().height)
      document.documentElement.style.setProperty(
        '--header-sticky-offset',
        `${h}px`,
      )
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [headerMenuOpen, roomCode, authUser, locale, pageScrolled])

  // Close header menu on outside click / Escape
  useEffect(() => {
    if (!headerMenuOpen) return
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const root = headerMenuRef.current
      if (root && !root.contains(e.target as Node)) setHeaderMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHeaderMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [headerMenuOpen])

  // Desktop hamburger appears after a little scroll (mobile always has it)
  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY > 24
      setPageScrolled((prev) => (prev === scrolled ? prev : scrolled))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  // Collapse collection filter pills once the sentinel scrolls under the sticky header
  useEffect(() => {
    if (tab !== 'collection') {
      setFiltersScrolled(false)
      filtersForceExpandedRef.current = false
      setFiltersForceExpanded(false)
      return
    }
    const update = () => {
      const sentinel = filtersSentinelRef.current
      if (!sentinel) return
      const headerH =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--header-sticky-offset',
          ) || '58',
          10,
        ) || 58
      const top = sentinel.getBoundingClientRect().top
      // Hysteresis: avoid expand→reflow→collapse thrash when sticky height changes
      if (top > headerH + 36) {
        setFiltersScrolled((prev) => (prev ? false : prev))
        if (filtersForceExpandedRef.current) {
          filtersForceExpandedRef.current = false
          setFiltersForceExpanded(false)
        }
      } else if (top <= headerH + 2) {
        setFiltersScrolled((prev) => (prev ? prev : true))
      }
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [tab, selectedPlayerId])

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
      const normalized = normalizeRoomCode(code)
      // Wait briefly for auth session so portable collection can attach
      const user = await getCurrentAuthUser()
      if (cancelled) return
      if (user) {
        setAuthUser(user)
        const col = await loadUserCollection(user.id)
        const portable = col.ok ? col.data : {}
        const resolved = resolveUserSeatInSquad(result.data, user, portable)
        if (resolved.kind === 'needs_link') {
          skipPushRef.current = true
          setState(result.data)
          stateRef.current = result.data
          if (result.data.name) setSquadNameDraft(result.data.name)
          setRoomCode(normalized)
          saveRoomCode(normalized)
          writeRoomToUrl(normalized)
          setRoomHydrated(true)
          setSyncStatus('synced')
          setSyncError(null)
          setModal({
            kind: 'link-player',
            user,
            candidates: resolved.candidates,
          })
          void rememberJoinedSquad(user.id, normalized, result.data.name)
          void listRecentSquads(user.id).then((r) => {
            if (r.ok) setRecentSquads(r.data)
          })
          return
        }
        skipPushRef.current = false
        setState(resolved.state)
        stateRef.current = resolved.state
        setSelectedPlayerId(resolved.playerId)
        if (resolved.state.name) setSquadNameDraft(resolved.state.name)
        void rememberJoinedSquad(user.id, normalized, resolved.state.name)
        void listRecentSquads(user.id).then((r) => {
          if (r.ok) setRecentSquads(r.data)
        })
        setRoomCode(normalized)
        saveRoomCode(normalized)
        writeRoomToUrl(normalized)
        setRoomHydrated(true)
        setSyncStatus('saving')
        setSyncError(null)
        return
      }
      skipPushRef.current = true
      setState(result.data)
      stateRef.current = result.data
      setSelectedPlayerId(result.data.players[0]?.id ?? '')
      if (result.data.name) setSquadNameDraft(result.data.name)
      setRoomCode(normalized)
      saveRoomCode(normalized)
      writeRoomToUrl(normalized)
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
        const localRev = stateRef.current.revision ?? 0
        const remoteRev = remote.revision ?? 0

        // Only adopt strictly newer revisions (skip our own echo / equal rev).
        if (remoteRev > 0 && remoteRev <= localRev) return
        // Legacy rooms with no revision: still accept sparse-safe remotes once.
        if (remoteRev === 0 && localRev > 0) return

        // Newer remote always wins — even mid-save. Invalidate the in-flight push
        // so a stale snapshot cannot finish and re-apply an old plan.
        if (saveInFlightRef.current || needsResaveRef.current) {
          saveEpochRef.current += 1
          needsResaveRef.current = false
        }

        adoptRemoteState(remote)
      },
      (msg) => {
        setSyncError(msg)
        setSyncStatus('error')
      },
    )

    return () => sub.unsubscribe()
  }, [roomCode, roomHydrated, adoptRemoteState])

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
    const epochAtStart = saveEpochRef.current
    const snapshot = stateRef.current

    const result = await pushRoom(code, snapshot)

    saveInFlightRef.current = false

    // A newer remote was adopted while this push was in flight — drop this result.
    if (epochAtStart !== saveEpochRef.current) {
      setSyncStatus('synced')
      return
    }

    if (!result.ok) {
      if (result.stale && result.data) {
        adoptRemoteState(result.data)
        return
      }
      if (result.error.includes('Blocked overwrite')) {
        if (result.data) {
          adoptRemoteState(result.data)
          return
        }
        const reloaded = await fetchRoom(code)
        if (reloaded.ok) {
          adoptRemoteState(reloaded.data)
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
    adoptRemoteState(result.data)
  }, [roomCode, roomHydrated, adoptRemoteState])

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
        adoptRemoteState(reloaded.data)
        setRoomHydrated(true)
        return
      }
      // Stay in error; user can tap the pill to hard-refresh
      setSyncError(reloaded.error)
    })()

    return () => {
      cancelled = true
    }
  }, [syncStatus, roomCode, adoptRemoteState])

  // After idle / background: pull latest room + re-apply portable collection.
  useEffect(() => {
    if (!roomCode || !cloudReady || !roomHydrated) return

    const pullIfNewer = () => {
      if (document.visibilityState !== 'visible') return
      if (saveInFlightRef.current) return
      const code = roomCode
      void (async () => {
        const res = await fetchRoom(code)
        if (!res.ok) return
        const remoteRev = res.data.revision ?? 0
        const localRev = stateRef.current.revision ?? 0
        let base = res.data
        if (remoteRev > localRev) {
          adoptRemoteState(res.data)
          base = res.data
        }
        // Re-overlay account collection so edits made in another squad show up
        const user = authUser
        if (!user) return
        const col = await loadUserCollection(user.id)
        if (!col.ok) return
        const cur = stateRef.current
        const mine = cur.players.find((p) => p.userId === user.id)
        if (!mine) return
        const merged = mergeSpriteMaps(col.data, mine.sprites ?? {})
        const same =
          JSON.stringify(merged) === JSON.stringify(mine.sprites ?? {})
        if (same) return
        const players = cur.players.map((p) =>
          p.userId === user.id ? { ...p, sprites: merged } : p,
        )
        const next = { ...cur, players }
        setState(next)
        stateRef.current = next
        skipPushRef.current = false
        bumpEdit()
        void base
      })()
    }

    document.addEventListener('visibilitychange', pullIfNewer)
    window.addEventListener('focus', pullIfNewer)
    return () => {
      document.removeEventListener('visibilitychange', pullIfNewer)
      window.removeEventListener('focus', pullIfNewer)
    }
  }, [roomCode, roomHydrated, adoptRemoteState, authUser, bumpEdit])

  const selectedPlayer = useMemo(
    () => state.players.find((p) => p.id === selectedPlayerId) ?? state.players[0],
    [state.players, selectedPlayerId],
  )

  const isViewingOwnCollection = Boolean(
    actorSeatId && selectedPlayer?.id === actorSeatId,
  )

  const persistPortableCollection = useCallback(
    (player: Player) => {
      if (!authUser || player.userId !== authUser.id) return
      void saveUserCollection(authUser.id, player.sprites)
    },
    [authUser],
  )

  /** Collection edits (sprites) only allowed on this device's seat. */
  const updateOwnCollection = useCallback(
    (fn: (p: Player) => Player) => {
      if (interactionLocked || !actorSeatId) return
      bumpEdit()
      setState((s) => {
        const players = s.players.map((p) => (p.id === actorSeatId ? fn(p) : p))
        const updated = players.find((p) => p.id === actorSeatId)
        if (updated) persistPortableCollection(updated)
        return { ...s, players }
      })
    },
    [interactionLocked, bumpEdit, persistPortableCollection, actorSeatId],
  )

  /** Non-collection roster edits (name of any seat, etc.). */
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

  function claimSeat(playerId: string) {
    const p = stateRef.current.players.find((x) => x.id === playerId)
    if (!p) return
    setActorSeatId(playerId)
    setModal(null)
    // If logged in, link account to this seat
    if (authUser) {
      void applyAuthUser(authUser, { claimPlayerId: playerId })
    }
  }

  function claimNewSeat() {
    const index = stateRef.current.players.length
    const p = createPlayer(
      authUser?.displayName || t('squad.playerN', { n: index + 1 }),
      index,
      authUser?.id,
    )
    bumpEdit()
    setState((s) => ({ ...s, players: [...s.players, p] }))
    stateRef.current = {
      ...stateRef.current,
      players: [...stateRef.current.players, p],
    }
    setActorSeatId(p.id)
    setModal(null)
    if (authUser) {
      void applyAuthUser(authUser, { claimPlayerId: p.id, createNew: true })
    }
  }

  function setStatusFilterSmart(next: string) {
    setStatusFilter((prev) => (prev === next ? 'all' : next))
  }

  const filtersCollapsed = filtersScrolled && !filtersForceExpanded

  function openFiltersExpanded() {
    filtersForceExpandedRef.current = true
    setFiltersForceExpanded(true)
  }

  function closeFiltersExpanded() {
    filtersForceExpandedRef.current = false
    setFiltersForceExpanded(false)
  }

  function goToTab(id: Tab) {
    setTab(id)
    setHeaderMenuOpen(false)
  }

  function onSyncPillClick() {
    if (syncStatus === 'error') {
      window.location.reload()
      return
    }
    void copyShareLink()
  }

  async function copyShareLinkForCode(code: string) {
    const link = shareUrl(code)
    try {
      await navigator.clipboard.writeText(link)
      showInfoModal(
        t('importExport.linkCopiedTitle'),
        t('importExport.linkCopiedMsg'),
        'success',
      )
    } catch {
      showInfoModal(t('importExport.copyLinkTitle'), link, 'info')
    }
  }

  const stats = useMemo(() => {
    if (!selectedPlayer) {
      return {
        owned: 0,
        available: 0,
        lost: 0,
        missing: 0,
        mastered: 0,
        need: 0,
        unmastered: 0,
      }
    }
    let owned = 0
    let available = 0
    let lost = 0
    let missing = 0
    let mastered = 0
    let unmastered = 0
    for (const s of SPRITES) {
      const st = getPlayerSprite(selectedPlayer, s.id)
      if (st.status === 'none') missing++
      else {
        owned++
        if (st.status === 'available') available++
        if (st.status === 'lost') lost++
        if (!st.mastered) unmastered++
      }
      if (st.mastered) mastered++
    }
    return {
      owned,
      available,
      lost,
      missing,
      mastered,
      need: missing + lost,
      unmastered,
    }
  }, [selectedPlayer])

  const statusFilterSummaryLabel = useMemo(() => {
    switch (statusFilter) {
      case 'available':
        return `${stats.available} ${t('collection.available')}`
      case 'lost':
        return `${stats.lost} ${t('collection.lost')}`
      case 'missing':
        return `${stats.missing} ${t('status.missing')}`
      case 'mastered':
        return `${stats.mastered} ${t('collection.mastered')}`
      case 'need':
        return `${stats.need} ${t('collection.needFilterShort')}`
      case 'unmastered':
        return `${stats.unmastered} ${t('collection.levelUpFilter')}`
      default:
        return t('collection.filtersLabel')
    }
  }, [statusFilter, stats, t])

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
    if (!isViewingOwnCollection) return
    updateOwnCollection((p) => {
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
    if (!isViewingOwnCollection) return
    updateOwnCollection((p) => {
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
    if (!isViewingOwnCollection) return
    updateOwnCollection((p) => {
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
      // Prefer the debounced room save path (revision-aware). Immediate push
      // still used so Confirm greys out quickly for teammates.
      skipPushRef.current = true
      const epochAtStart = saveEpochRef.current
      void pushRoom(roomCode, nextState).then((res) => {
        if (epochAtStart !== saveEpochRef.current) return
        if (res.ok) {
          adoptRemoteState(res.data)
        } else if (res.stale && res.data) {
          adoptRemoteState(res.data)
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
    // Never remove this device's seat while still chosen as actor
    if (id === actorSeatId) return
    const remaining = state.players.filter((p) => p.id !== id)
    setState((s) => ({
      ...s,
      players: s.players.filter((p) => p.id !== id),
      activePlayerIds: s.activePlayerIds.filter((x) => x !== id),
    }))
    if (selectedPlayerId === id) {
      setSelectedPlayerId(actorSeatId ?? remaining[0]?.id ?? '')
    }
    clearSharedSuggestion()
  }

  function renamePlayer(id: string, name: string) {
    // Only rename your own seat (avoids accidental renames of teammates)
    if (id !== actorSeatId) return
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
    if (id !== actorSeatId) {
      showInfoModal(t('seat.lockedTitle'), t('seat.lockedImport'), 'info')
      return
    }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = parsePlayerImport(text)
        updateOwnCollection((p) => ({
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

  async function enterRoomState(code: string, remote: SquadState) {
    let next = remote
    let playerId = ''
    let shouldPush = false
    let needSeatPick = false

    if (authUser) {
      const col = await loadUserCollection(authUser.id)
      const portable = col.ok ? col.data : {}
      const resolved = resolveUserSeatInSquad(remote, authUser, portable)
      if (resolved.kind === 'needs_link') {
        skipPushRef.current = true
        setState(remote)
        stateRef.current = remote
        setRoomCode(code)
        saveRoomCode(code)
        writeRoomToUrl(code)
        setRoomHydrated(true)
        setSyncStatus('synced')
        if (remote.name) setSquadNameDraft(remote.name)
        setModal({
          kind: 'link-player',
          user: authUser,
          candidates: resolved.candidates,
        })
        void rememberJoinedSquad(authUser.id, code, remote.name)
        void refreshRecentSquads(authUser.id)
        return
      }
      next = resolved.state
      playerId = resolved.playerId
      shouldPush = true
      const me = next.players.find((p) => p.id === playerId)
      if (me) void saveUserCollection(authUser.id, me.sprites)
      void rememberJoinedSquad(authUser.id, code, next.name)
      void refreshRecentSquads(authUser.id)
    } else {
      // Guest: keep seat if this player id is still in the room
      const prev = actorSeatId
      if (prev && remote.players.some((p) => p.id === prev)) {
        playerId = prev
      } else {
        needSeatPick = true
        playerId = remote.players[0]?.id ?? ''
      }
    }

    skipPushRef.current = !shouldPush
    setState(next)
    stateRef.current = next
    if (playerId && !needSeatPick) setActorSeatId(playerId)
    else if (playerId) setSelectedPlayerId(playerId)
    if (next.name) setSquadNameDraft(next.name)
    setRoomCode(code)
    saveRoomCode(code)
    writeRoomToUrl(code)
    setRoomHydrated(true)
    setSyncStatus(shouldPush ? 'saving' : 'synced')
    if (needSeatPick) {
      setModal({ kind: 'choose-seat', reason: 'join' })
    }
  }

  async function handleCreateRoom() {
    if (!cloudReady) {
      setSyncError(t('squad.cloudNotAvailable'))
      return
    }
    let actor =
      (actorSeatId && state.players.find((p) => p.id === actorSeatId)) || null
    if (!actor) {
      setModal({ kind: 'choose-seat', reason: 'needed' })
      return
    }
    // Logged-in: overlay portable collection onto actor before seeding the room
    if (authUser) {
      const col = await loadUserCollection(authUser.id)
      const portable = col.ok ? col.data : {}
      actor = {
        ...actor,
        userId: authUser.id,
        name: actor.name || authUser.displayName,
        sprites: mergeSpriteMaps(portable, actor.sprites ?? {}),
      }
      void saveUserCollection(authUser.id, actor.sprites)
    }
    setBusy(true)
    setSyncError(null)
    setRoomHydrated(false)
    const name = squadNameDraft.trim() || undefined
    // Fresh room: only this device's seat + empty slots (no old teammates)
    const base = freshSquadForCreate(actor, name)
    const result = await createRoom(base, {
      name,
      createdBy: authUser?.id ?? null,
    })
    setBusy(false)
    if (!result.ok) {
      setSyncError(result.error)
      setSyncStatus('error')
      return
    }
    if (authUser) {
      void rememberJoinedSquad(authUser.id, result.data.code, result.data.state.name)
      void refreshRecentSquads(authUser.id)
    }
    skipPushRef.current = true
    setState(result.data.state)
    stateRef.current = result.data.state
    const myId =
      result.data.state.players.find((p) => p.userId === authUser?.id)?.id ??
      result.data.state.players.find((p) => p.id === actor!.id)?.id ??
      result.data.state.players[0]?.id ??
      ''
    setActorSeatId(myId)
    setRoomCode(result.data.code)
    saveRoomCode(result.data.code)
    writeRoomToUrl(result.data.code)
    setRoomHydrated(true)
    setSyncStatus('synced')
  }

  async function handleJoinRoom(codeRaw?: string) {
    if (!cloudReady) {
      setSyncError('Cloud is not configured. See DEPLOY.md / Help tab.')
      return
    }
    const code = normalizeRoomCode(codeRaw ?? joinInput)
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
    setJoinInput('')
    await enterRoomState(code, result.data)
  }

  async function saveSquadName() {
    if (!roomCode) return
    const name = squadNameDraft.trim() || undefined
    bumpEdit()
    setState((s) => {
      const next = { ...s, name }
      stateRef.current = next
      return next
    })
    if (authUser) {
      await updateRecentSquadName(authUser.id, roomCode, name ?? null)
      await refreshRecentSquads(authUser.id)
    }
  }

  function handleLeaveRoom() {
    // Keep only this device's actor collection locally — drop other seats
    const draft = localDraftFromActor(stateRef.current, actorSeatId)
    skipPushRef.current = true
    setState(draft)
    stateRef.current = draft
    if (draft.players[0]) {
      setActorSeatId(draft.players[0].id)
    }
    setRoomHydrated(false)
    setRoomCode(null)
    saveRoomCode(null)
    writeRoomToUrl(null)
    setSyncStatus('local')
    setSyncError(null)
    setSquadNameDraft('')
  }

  async function copyShareLink() {
    if (!roomCode) return
    await copyShareLinkForCode(roomCode)
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
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = importSquad(text)
        // Leave any live room so cloud sync cannot overwrite the import
        skipPushRef.current = true
        setRoomHydrated(false)
        setRoomCode(null)
        saveRoomCode(null)
        writeRoomToUrl(null)
        setSyncStatus('local')
        setSyncError(null)
        setSquadNameDraft(data.name ?? '')
        // Force seat pick — imported player ids differ from previous actor
        setActorSeatId(null)
        setState(data)
        stateRef.current = data
        setSelectedPlayerId(data.players[0]?.id ?? '')
        // Seat picker is required after import (actor cleared); message explains success
        setModal({ kind: 'choose-seat', reason: 'needed' })
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

  return (
    <div className={`app${interactionLocked ? ' app-sync-busy' : ''}`}>
      {interactionLocked && (
        <div className="sync-busy-overlay" aria-live="polite" aria-busy="true">
          <span className="sync-busy-label">{t('sync.pleaseWait')}</span>
        </div>
      )}
      <header
        className={`header${pageScrolled ? ' header-scrolled' : ''}${
          headerMenuOpen ? ' header-menu-open' : ''
        }`}
        ref={headerRef}
      >
        {/* Hamburger: always on mobile; also on desktop after scroll for tab access */}
        <div className="header-overflow" ref={headerMenuRef}>
          <button
            type="button"
            className="btn btn-sm header-overflow-btn"
            aria-haspopup="menu"
            aria-expanded={headerMenuOpen}
            aria-label={t('app.moreMenu')}
            title={t('app.moreMenu')}
            onClick={() => setHeaderMenuOpen((o) => !o)}
          >
            <span className="icon-hamburger" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
          {headerMenuOpen && (
            <div className="header-overflow-menu" role="menu">
              <div className="header-menu-nav" role="group" aria-label={t('app.navMenu')}>
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
                    role="menuitem"
                    className={`header-menu-item${tab === id ? ' active' : ''}`}
                    onClick={() => goToTab(id)}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
              {/* Support + language: mobile hamburger only (desktop has them in the header). */}
              <div className="header-menu-mobile-only">
                <div className="header-menu-divider" aria-hidden />
                <label className="header-menu-row lang-select-wrap">
                  <span className="header-menu-label">{t('lang.label')}</span>
                  <select
                    className="lang-select header-menu-select"
                    value={locale}
                    onChange={(e) => {
                      setLocale(e.target.value as 'en' | 'es')
                      setHeaderMenuOpen(false)
                    }}
                    aria-label={t('lang.label')}
                  >
                    {locales.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.native}
                      </option>
                    ))}
                  </select>
                </label>
                <a
                  className="header-menu-item header-menu-support-item"
                  href={KOFI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('app.supportTitle')}
                  role="menuitem"
                  onClick={() => setHeaderMenuOpen(false)}
                >
                  <span className="header-support-icon" aria-hidden>
                    ♥
                  </span>
                  {t('app.support')}
                </a>
              </div>
            </div>
          )}
        </div>
        <h1>{t('app.title')}</h1>
        <div className="header-actions">
          {cloudReady && (
            authUser ? (
              <button
                type="button"
                className="btn btn-sm header-account"
                title={t('auth.signOutHint', { name: authUser.displayName })}
                aria-label={t('auth.signOutHint', { name: authUser.displayName })}
                onClick={() => {
                  void signOut().then(() => {
                    // Sign-out is account-only: stay in the live room / keep local
                    // squad state. Detach portable account from this seat's userId
                    // is NOT done — room seats keep their userId links for when
                    // you sign back in. Clear account UI + recent list only.
                    setAuthUser(null)
                    setRecentSquads([])
                  })
                }}
              >
                <span className="header-account-name">{authUser.displayName}</span>
                <svg
                  className="header-signout-icon"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm header-account"
                onClick={() => setAuthOpen(true)}
              >
                {t('app.signIn')}
              </button>
            )
          )}
          <a
            className="btn btn-sm header-support header-desktop-only"
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={t('app.supportTitle')}
            aria-label={t('app.supportTitle')}
          >
            <span className="header-support-icon" aria-hidden>
              ♥
            </span>
            {t('app.support')}
          </a>
          <label className="lang-select-wrap header-desktop-only">
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
              className={`sync-pill sync-${syncStatus}`}
              title={
                syncStatus === 'error'
                  ? t('sync.errorTapRefresh')
                  : t('sync.copyLinkHint', { code: roomCode })
              }
              onClick={onSyncPillClick}
            >
              {syncLabel(syncStatus, roomCode, t)}
            </button>
          )}
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
            {state.players.map((p) => {
              const isYou = p.id === actorSeatId
              return (
              <button
                key={p.id}
                type="button"
                className={`player-chip ${p.id === selectedPlayer.id ? 'selected' : ''} ${
                  state.activePlayerIds.includes(p.id) ? 'active-play' : ''
                } ${isYou ? 'is-you' : ''}`}
                style={{ ['--chip-color' as string]: p.color }}
                onClick={() => setSelectedPlayerId(p.id)}
                title={
                  isYou
                    ? t('seat.youHint')
                    : t('seat.viewOnlyHint', { name: p.name })
                }
              >
                {isYou ? (
                  <span className="dot dot-you" aria-hidden title={t('squad.youBadge')}>
                    <svg
                      className="icon-person"
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      fill="currentColor"
                    >
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </span>
                ) : (
                  <span className="dot" />
                )}
                {p.name}
              </button>
              )
            })}
            <button
              type="button"
              className="seat-switch-btn icon-btn"
              onClick={() => setModal({ kind: 'choose-seat', reason: 'needed' })}
              title={t('seat.switch')}
              aria-label={t('seat.switch')}
            >
              <svg
                className="icon-svg icon-person-switch"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </button>
          </div>
          {!isViewingOwnCollection && (
            <p className="seat-readonly-banner" role="status">
              {t('seat.viewingOther', { name: selectedPlayer.name })}
            </p>
          )}

          {/* Sentinel: when it leaves the top (under sticky header), collapse pills */}
          <div
            className="collection-filters-sentinel"
            ref={filtersSentinelRef}
            aria-hidden
          />
          <div
            className={`collection-filters-sticky${
              filtersCollapsed ? ' is-collapsed' : ''
            }${filtersScrolled && !filtersCollapsed ? ' is-expanded-scroll' : ''}`}
          >
            {filtersCollapsed ? (
              <div
                className="filters-collapsed-bar"
                role="toolbar"
                aria-label={t('collection.statsFilterLabel')}
              >
                <label className="sticky-search-wrap">
                  <span className="visually-hidden">
                    {t('collection.searchPlaceholder')}
                  </span>
                  <input
                    className="sticky-search"
                    type="search"
                    placeholder={t('collection.searchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    enterKeyHint="search"
                    autoComplete="off"
                  />
                  {query ? (
                    <button
                      type="button"
                      className="sticky-search-clear"
                      onClick={() => setQuery('')}
                      title={t('collection.clearSearch')}
                      aria-label={t('collection.clearSearch')}
                    >
                      ×
                    </button>
                  ) : null}
                </label>
                <button
                  type="button"
                  className={`icon-btn filters-icon-btn${
                    statusFilter !== 'all' ? ' has-filter' : ''
                  }`}
                  onClick={openFiltersExpanded}
                  title={
                    statusFilter !== 'all'
                      ? statusFilterSummaryLabel
                      : t('collection.expandFilters')
                  }
                  aria-label={
                    statusFilter !== 'all'
                      ? statusFilterSummaryLabel
                      : t('collection.expandFilters')
                  }
                  aria-expanded={false}
                >
                  <svg
                    className="icon-svg"
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                  </svg>
                  {statusFilter !== 'all' && (
                    <span className="filters-active-dot" aria-hidden />
                  )}
                </button>
              </div>
            ) : (
              <>
                {filtersScrolled && (
                  <button
                    type="button"
                    className="filters-close-btn"
                    onClick={closeFiltersExpanded}
                    title={t('collection.collapseFilters')}
                    aria-label={t('collection.collapseFilters')}
                  >
                    ×
                  </button>
                )}
                {/* Row 1: inventory status */}
                <div
                  className="stats-bar"
                  role="toolbar"
                  aria-label={t('collection.statsFilterLabel')}
                >
                  <button
                    type="button"
                    className={`stat-chip${statusFilter === 'all' ? ' active' : ''}`}
                    onClick={() => setStatusFilterSmart('all')}
                    title={t('collection.filterOwnedTitle')}
                  >
                    <strong>{stats.owned}</strong> / {SPRITES.length}{' '}
                    {t('collection.owned')}
                  </button>
                  <button
                    type="button"
                    className={`stat-chip${
                      statusFilter === 'available' ? ' active' : ''
                    }`}
                    onClick={() => setStatusFilterSmart('available')}
                    title={t('collection.filterAvailableTitle')}
                  >
                    <strong style={{ color: 'var(--available)' }}>
                      {stats.available}
                    </strong>{' '}
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
                    className={`stat-chip${
                      statusFilter === 'missing' ? ' active' : ''
                    }`}
                    onClick={() => setStatusFilterSmart('missing')}
                    title={t('collection.filterMissingTitle')}
                  >
                    <strong style={{ color: 'var(--none)' }}>{stats.missing}</strong>{' '}
                    {t('status.missing')}
                  </button>
                  <button
                    type="button"
                    className={`stat-chip${
                      statusFilter === 'mastered' ? ' active' : ''
                    }`}
                    onClick={() => setStatusFilterSmart('mastered')}
                    title={t('collection.filterMasteredTitle')}
                  >
                    <strong style={{ color: 'var(--master-gold)' }}>
                      {stats.mastered}
                    </strong>{' '}
                    {t('collection.mastered')}
                  </button>
                </div>

                {/* Row 2: in-game quick presets */}
                <div
                  className="preset-bar"
                  role="toolbar"
                  aria-label={t('collection.presetFilterLabel')}
                >
                  <button
                    type="button"
                    className={`stat-chip preset-chip${
                      statusFilter === 'need' ? ' active' : ''
                    }`}
                    onClick={() => setStatusFilterSmart('need')}
                    title={t('collection.filterNeedTitle')}
                  >
                    <strong>{stats.need}</strong> {t('collection.needFilter')}
                  </button>
                  <button
                    type="button"
                    className={`stat-chip preset-chip${
                      statusFilter === 'unmastered' ? ' active' : ''
                    }`}
                    onClick={() => setStatusFilterSmart('unmastered')}
                    title={t('collection.filterUnmasteredTitle')}
                  >
                    <strong style={{ color: 'var(--master-gold)' }}>
                      {stats.unmastered}
                    </strong>{' '}
                    {t('collection.levelUpFilter')}
                  </button>
                </div>

                {/* Row 3: search full width */}
                <div className="filters-search-row">
                  <label className="sticky-search-wrap">
                    <span className="visually-hidden">
                      {t('collection.searchPlaceholder')}
                    </span>
                    <input
                      className="sticky-search"
                      type="search"
                      placeholder={t('collection.searchPlaceholder')}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      enterKeyHint="search"
                      autoComplete="off"
                    />
                    {query ? (
                      <button
                        type="button"
                        className="sticky-search-clear"
                        onClick={() => setQuery('')}
                        title={t('collection.clearSearch')}
                        aria-label={t('collection.clearSearch')}
                      >
                        ×
                      </button>
                    ) : null}
                  </label>
                </div>

                {/* Row 4: sort / variant / status — at top always; on mobile hide when force-expanded while scrolled */}
                <div
                  className={`toolbar filter-toolbar${
                    filtersScrolled ? ' hide-on-scroll-expand-mobile' : ''
                  }`}
                >
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
                    <option value="available">{t('status.available')}</option>
                    <option value="lost">{t('status.lost')}</option>
                    <option value="missing">{t('status.missing')}</option>
                    <option value="mastered">{t('status.mastered')}</option>
                    <option value="need">{t('collection.needFilter')}</option>
                    <option value="unmastered">{t('collection.levelUpFilter')}</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {filteredByFamily.map(({ family, sprites }) => (
            <section key={family.id} className="family">
              <h2 className="family-head">
                <span className={`badge ${family.rarity}`}>{family.name}</span>
                <span className={`badge ${family.rarity}`}>
                  {t(`rarity.${family.rarity}`)}
                </span>
                <span className="ability">
                  {effectText(t, `effects.family.${family.id}`, family.ability)}
                </span>
              </h2>
              <div className="variant-grid">
                {sprites.map((sprite) => {
                  const st = getPlayerSprite(selectedPlayer, sprite.id)
                  const ability = effectText(
                    t,
                    `effects.family.${sprite.familyId}`,
                    sprite.ability,
                  )
                  const variantBonus =
                    sprite.variant !== 'base'
                      ? effectText(
                          t,
                          `effects.variant.${sprite.variant}`,
                          sprite.variantBonus ?? '',
                        )
                      : ''
                  return (
                    <div
                      key={sprite.id}
                      role="button"
                      tabIndex={isViewingOwnCollection ? 0 : -1}
                      className={`sprite-card status-${st.status} ${st.mastered ? 'mastered' : ''}${
                        isViewingOwnCollection ? '' : ' sprite-card-readonly'
                      }`}
                      onClick={() => onSpriteTap(sprite)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSpriteTap(sprite)
                        }
                      }}
                      title={
                        isViewingOwnCollection
                          ? variantBonus
                            ? `${ability}\n+ ${variantBonus}`
                            : ability
                          : t('seat.viewOnlyHint', { name: selectedPlayer.name })
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
                        {isViewingOwnCollection && (
                          <div className="card-actions">
                            <button
                              type="button"
                              className={`card-action-btn missing-btn ${
                                st.status === 'available' ? 'on' : ''
                              }`}
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
                        )}
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
                <div className="suggest-stat-chips" aria-label={plan.summary}>
                  <span className="suggest-stat-chip chip-players">
                    {t('suggest.summaryPlayers', {
                      n: plan.activePlayerIds.length,
                    })}
                  </span>
                  <span className="suggest-stat-chip chip-exchanges">
                    {t('suggest.summaryExchanges', {
                      n: plan.assignments.filter(isExchangeAssignment).length,
                    })}
                  </span>
                  <span className="suggest-stat-chip chip-missing">
                    {t('suggest.summaryMissing', {
                      n: plan.assignments.filter((a) => a.needKind === 'missing')
                        .length,
                    })}
                  </span>
                  <span className="suggest-stat-chip chip-restores">
                    {t('suggest.summaryRestores', {
                      n: plan.assignments.filter((a) => a.needKind === 'lost')
                        .length,
                    })}
                  </span>
                  <span className="suggest-stat-chip chip-gifts">
                    {t('suggest.summaryGifts', {
                      n: plan.assignments.filter((a) => a.kind === 'gift').length,
                    })}
                  </span>
                  <span className="suggest-stat-chip chip-repurchase">
                    {t('suggest.summaryRepurchases', {
                      n: plan.assignments.filter((a) => a.kind === 'repurchase')
                        .length,
                    })}
                  </span>
                  <span className="suggest-stat-chip chip-mastery">
                    {t('suggest.summaryMastery', {
                      n: plan.assignments.filter((a) => a.kind === 'mastery')
                        .length,
                    })}
                  </span>
                </div>
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
                                      {formatAssignmentSpriteName(a, t)}
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
                                    <div className="assignment-reason">
                                      {formatAssignmentReason(a, t)}
                                    </div>
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
                <div className="room-code-row">
                  <span className="muted">{t('squad.roomCode')}</span>
                  <button
                    type="button"
                    className="room-code-bubble"
                    title={t('sync.copyLinkHint', { code: roomCode })}
                    aria-label={t('sync.copyLinkHint', { code: roomCode })}
                    onClick={() => void copyShareLink()}
                  >
                    {roomCode}
                  </button>
                </div>
                <p className="muted">{t('squad.roomHint')}</p>
                <div className="squad-name-row">
                  <label className="squad-name-field">
                    <span>{t('squad.squadName')}</span>
                    <input
                      type="text"
                      className="squad-name-input"
                      value={squadNameDraft}
                      onChange={(e) => setSquadNameDraft(e.target.value)}
                      placeholder={t('squad.squadNamePlaceholder')}
                      maxLength={48}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={
                      (squadNameDraft.trim() || '') === (state.name?.trim() || '')
                    }
                    onClick={() => void saveSquadName()}
                  >
                    {t('squad.updateName')}
                  </button>
                </div>
                <div className="header-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="btn" onClick={handleLeaveRoom}>
                    {t('squad.leaveRoom')}
                  </button>
                </div>
                {syncError ? <p className="error-text">{syncError}</p> : null}
              </>
            ) : (
              <>
                <p className="muted">{t('squad.createHint')}</p>
                <label className="squad-name-field">
                  <span>{t('squad.squadName')}</span>
                  <input
                    type="text"
                    className="squad-name-input"
                    value={squadNameDraft}
                    onChange={(e) => setSquadNameDraft(e.target.value)}
                    placeholder={t('squad.squadNamePlaceholder')}
                    maxLength={48}
                  />
                </label>
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

          {authUser && (
            <div className="help-box recent-squads-box">
              <h3>{t('squad.recentTitle')}</h3>
              {recentSquads.length === 0 ? (
                <p className="muted">{t('squad.recentEmpty')}</p>
              ) : (
                <ul className="recent-squads-list">
                  {recentSquads.map((s) => (
                    <li key={s.roomCode}>
                      <div className="recent-squad-meta">
                        <strong>{s.roomName || t('squad.unnamedSquad')}</strong>
                        <button
                          type="button"
                          className="room-code-bubble"
                          title={t('sync.copyLinkHint', { code: s.roomCode })}
                          aria-label={t('sync.copyLinkHint', { code: s.roomCode })}
                          onClick={() => void copyShareLinkForCode(s.roomCode)}
                        >
                          {s.roomCode}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={busy || roomCode === s.roomCode}
                        onClick={() => void handleJoinRoom(s.roomCode)}
                      >
                        {t('squad.recentJoin')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

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
              {p.id === actorSeatId ? (
                <span
                  className="dot dot-you"
                  style={{ ['--chip-color' as string]: p.color }}
                  title={t('squad.youBadge')}
                  aria-label={t('squad.youBadge')}
                >
                  <svg
                    className="icon-person"
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </span>
              ) : (
                <span
                  className="dot"
                  style={{ background: p.color, width: 16, height: 16 }}
                />
              )}
              <input
                type="text"
                value={p.name}
                disabled={p.id !== actorSeatId}
                onChange={(e) => renamePlayer(p.id, e.target.value)}
                title={
                  p.id === actorSeatId
                    ? t('seat.youHint')
                    : t('seat.viewOnlyHint', { name: p.name })
                }
              />
              {isSeatTakenByOther(p, actorSeatId, authUser?.id) && (
                <span className="taken-badge">{t('seat.takenBadge')}</span>
              )}
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
                  disabled={state.players.length <= 1 || p.id === actorSeatId}
                  title={
                    p.id === actorSeatId
                      ? t('seat.cannotRemoveSelf')
                      : t('squad.removeTitle')
                  }
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

      {authOpen && (
        <AuthModal
          t={t}
          onClose={() => setAuthOpen(false)}
          onAuthed={(user) => {
            void applyAuthUser(user)
          }}
        />
      )}

      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target !== e.currentTarget) return
            // Must pick a seat if none is valid
            if (
              modal.kind === 'choose-seat' &&
              !(actorSeatId && state.players.some((p) => p.id === actorSeatId))
            ) {
              return
            }
            setModal(null)
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
                  : modal.kind === 'password-recovery'
                    ? t('auth.forgotTitle')
                    : modal.kind === 'link-player'
                      ? t('auth.linkTitle')
                      : modal.kind === 'choose-seat'
                        ? t('seat.chooseTitle')
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

            {modal.kind === 'choose-seat' && (
              <>
                <p className="modal-subtitle">
                  {modal.reason === 'join'
                    ? t('seat.chooseJoinBody')
                    : t('seat.chooseBody')}
                </p>
                <div className="link-player-list">
                  {state.players.map((p) => {
                    const isYou = p.id === actorSeatId
                    const taken = isSeatTakenByOther(p, actorSeatId, authUser?.id)
                    return (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn link-player-option${taken ? ' seat-option-taken' : ''}`}
                      disabled={taken && !isYou}
                      onClick={() => {
                        if (taken && !isYou) return
                        claimSeat(p.id)
                      }}
                      title={
                        taken && !isYou
                          ? t('seat.takenHint', { name: p.name })
                          : isYou
                            ? t('seat.youHint')
                            : undefined
                      }
                    >
                      <span
                        className="dot"
                        style={{ background: p.color, width: 12, height: 12 }}
                      />
                      {p.name}
                      {isYou && (
                        <span className="you-badge">{t('squad.youBadge')}</span>
                      )}
                      {!isYou && taken && (
                        <span className="taken-badge">{t('seat.takenBadge')}</span>
                      )}
                    </button>
                    )
                  })}
                </div>
                <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => claimNewSeat()}
                  >
                    {t('seat.createNew')}
                  </button>
                  {actorSeatId &&
                    state.players.some((p) => p.id === actorSeatId) && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setModal(null)}
                      >
                        {t('confirm.cancel')}
                      </button>
                    )}
                </div>
              </>
            )}

            {modal.kind === 'link-player' && (
              <>
                <p className="modal-subtitle">{t('auth.linkBody')}</p>
                <div className="link-player-list">
                  {modal.candidates.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn link-player-option"
                      onClick={() => {
                        const u = modal.user
                        setModal(null)
                        setActorSeatId(p.id)
                        void applyAuthUser(u, { claimPlayerId: p.id })
                      }}
                    >
                      <span
                        className="dot"
                        style={{ background: p.color, width: 12, height: 12 }}
                      />
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="modal-footer" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      const u = modal.user
                      setModal(null)
                      void applyAuthUser(u, { createNew: true })
                    }}
                  >
                    {t('auth.linkCreateNew')}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setModal(null)}
                  >
                    {t('confirm.cancel')}
                  </button>
                </div>
              </>
            )}

            {modal.kind === 'password-recovery' && (
              <>
                <p className="modal-subtitle">{t('auth.newPassword')}</p>
                <label className="auth-field">
                  <span>{t('auth.password')}</span>
                  <input
                    type="password"
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      void updatePassword(newPassword).then((res) => {
                        if (res.ok) {
                          setNewPassword('')
                          setModal(null)
                          showInfoModal(
                            t('auth.loginTitle'),
                            t('auth.passwordUpdated'),
                            'success',
                          )
                        } else {
                          showInfoModal(t('auth.forgotTitle'), res.error, 'error')
                        }
                      })
                    }}
                  >
                    {t('auth.savePassword')}
                  </button>
                </div>
              </>
            )}

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

          <section className="help-section help-disclaimer" aria-label={t('help.disclaimerTitle')}>
            <h3>{t('help.disclaimerTitle')}</h3>
            <p>{t('help.disclaimerBody')}</p>
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
            <h3>{t('help.seatsTitle')}</h3>
            <ul>
              <li>{t('help.seats1')}</li>
              <li>{t('help.seats2')}</li>
              <li>{t('help.seats3')}</li>
            </ul>
          </section>

          <section className="help-section">
            <h3>{t('help.accountTitle')}</h3>
            <ul>
              <li>{t('help.account1')}</li>
              <li>{t('help.account2')}</li>
              <li>{t('help.account3')}</li>
              <li>{t('help.account4')}</li>
            </ul>
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

          <section className="help-section help-support">
            <h3>{t('help.supportTitle')}</h3>
            <p>{t('help.supportBody')}</p>
            <a
              className="btn btn-primary help-support-btn"
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t('help.supportLinkHint')}
            >
              {t('help.supportButton')}
            </a>
          </section>

          <section className="help-section help-opensource">
            <h3>{t('help.openSourceTitle')}</h3>
            <p>{t('help.openSourceBody')}</p>
            <a
              className="btn help-support-btn"
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t('help.openSourceLinkHint')}
            >
              {t('help.openSourceButton')}
            </a>
          </section>
        </div>
      )}
    </div>
  )
}

/** Optional voluntary tips — never gates features. */
const KOFI_URL = 'https://ko-fi.com/hamlet2k'
const GITHUB_URL = 'https://github.com/hamlet2k/Sprites'

/** Stable key for tracking which plan exchanges were already applied. */
function exchangeKey(a: BringAssignment): string {
  return `${a.round}::${a.bringerId}::${a.recipientId ?? ''}::${a.spriteId}`
}

/** i18n lookup with catalog fallback (effects may lag behind new families). */
function effectText(
  t: (key: string, vars?: Record<string, string | number>) => string,
  key: string,
  fallback: string,
): string {
  const out = t(key)
  return !out || out === key ? fallback : out
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
        <div className="modal-exchange-sprite">
          {formatAssignmentSpriteName(a, t)}
        </div>
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


