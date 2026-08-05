import { difficultyScore, SPRITE_BY_ID, SPRITES } from '../data/sprites'
import { tLocale } from '../i18n/catalog'
import type { Locale } from '../i18n/locales'
import type {
  BringAssignment,
  NeedKind,
  Player,
  PlayerSpriteState,
  SuggestionPlan,
  SquadState,
  SuggestMode,
} from '../types'
import { getPlayerSprite } from './storage'

/** Max sprites to recommend a player bring (equip + inventory). */
export const MAX_BRING_PER_PLAYER = 4

export type { SuggestMode }

export const SUGGEST_MODE_KEY = 'fortnite-sprite-squad-suggest-mode'

export function loadSuggestMode(): SuggestMode {
  try {
    const raw = localStorage.getItem(SUGGEST_MODE_KEY)
    if (raw === 'fair' || raw === 'completion') return raw
  } catch {
    /* ignore */
  }
  return 'completion'
}

export function saveSuggestMode(mode: SuggestMode): void {
  try {
    localStorage.setItem(SUGGEST_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}

type Edge = {
  giver: Player
  receiver: Player
  spriteId: string
  score: number
  needsRepurchase: boolean
  summonCost: number
  needKind: NeedKind
}

type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * Build a bring/gift plan for the active squad.
 * @param mode completion = fastest new acquisitions; fair = mutual 1:1 + debt balance
 */
export function buildSuggestionPlan(
  state: SquadState,
  locale: Locale = 'en',
  mode: SuggestMode = 'completion',
): SuggestionPlan {
  const t = (key: string, vars?: Record<string, string | number>) =>
    tLocale(locale, key, vars)

  const active = state.players.filter((p) =>
    state.activePlayerIds.includes(p.id),
  )
  if (active.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      activePlayerIds: [],
      assignments: [],
      summary: t('suggest.selectPlayers'),
    }
  }

  const edges = buildEdges(active, mode)
  const assignments: BringAssignment[] = []
  const usedGift = new Set<string>()
  const coveredNeed = new Set<string>()

  const giveTotal = new Map<string, number>()
  const receiveTotal = new Map<string, number>()
  for (const p of active) {
    giveTotal.set(p.id, 0)
    receiveTotal.set(p.id, 0)
  }
  const debt = (id: string) =>
    (giveTotal.get(id) ?? 0) - (receiveTotal.get(id) ?? 0)
  const noteExchange = (g: string, r: string) => {
    giveTotal.set(g, (giveTotal.get(g) ?? 0) + 1)
    receiveTotal.set(r, (receiveTotal.get(r) ?? 0) + 1)
  }
  const unnoteExchange = (g: string, r: string) => {
    giveTotal.set(g, Math.max(0, (giveTotal.get(g) ?? 0) - 1))
    receiveTotal.set(r, Math.max(0, (receiveTotal.get(r) ?? 0) - 1))
  }

  for (let round = 1; round <= MAX_BRING_PER_PLAYER; round++) {
    const giveThisRound = new Set<string>()
    const receiveThisRound = new Set<string>()

    const isOpen = (e: Edge, readyOnly: boolean | null) => {
      if (readyOnly === true && e.needsRepurchase) return false
      if (readyOnly === false && !e.needsRepurchase) return false
      if (usedGift.has(`${e.giver.id}::${e.spriteId}`)) return false
      if (coveredNeed.has(`${e.receiver.id}::${e.spriteId}`)) return false
      if (giveThisRound.has(e.giver.id)) return false
      if (receiveThisRound.has(e.receiver.id)) return false
      return true
    }

    const tryTake = (e: Edge): boolean => {
      const before = assignments.length
      takeEdge(
        e,
        round,
        assignments,
        usedGift,
        coveredNeed,
        giveThisRound,
        receiveThisRound,
        t,
      )
      if (assignments.length === before) return false
      noteExchange(e.giver.id, e.receiver.id)
      return true
    }

    const bestEdge = (
      fromId: string,
      toId: string,
      readyOnly: boolean | null,
    ): Edge | null => {
      let best: Edge | null = null
      for (const e of edges) {
        if (e.giver.id !== fromId || e.receiver.id !== toId) continue
        if (!isOpen(e, readyOnly)) continue
        if (!best || e.score > best.score) best = e
      }
      return best
    }

    /**
     * Completion packing: maximize Missing fills this round (1 give / 1 receive).
     * Chains allowed (A→B and B→C). Ready preferred via edge score; repurchase
     * stays in the search (not a separate later pass that can block better packs).
     */
    const packMaxCompletion = (
      readyOnly: boolean | null,
      missingOnly: boolean,
    ) => {
      // Anyone who has not given yet can still give; not-yet-receivers can receive.
      // (Previously required "fully free", which blocked residual givers after a
      // partial pack — and ready-only-first packing could lock a 1-fill over a
      // 2-fill chain that needed one repurchase.)
      const givers = active.filter((p) => !giveThisRound.has(p.id))
      const n = givers.length
      if (n === 0) return

      // Best edge per (giverId → receiverId) under filters
      const bestTo = new Map<string, Edge>()
      for (const e of edges) {
        if (!isOpen(e, readyOnly)) continue
        if (missingOnly && e.needKind !== 'missing') continue
        if (giveThisRound.has(e.giver.id)) continue
        if (receiveThisRound.has(e.receiver.id)) continue
        const key = `${e.giver.id}>>${e.receiver.id}`
        const cur = bestTo.get(key)
        if (!cur || e.score > cur.score) bestTo.set(key, e)
      }
      if (bestTo.size === 0) return

      type Pack = { edges: Edge[]; missing: number; total: number; weight: number }
      let best: Pack = { edges: [], missing: 0, total: 0, weight: 0 }

      const better = (a: Pack, b: Pack) => {
        if (a.missing !== b.missing) return a.missing > b.missing
        // Prefer fewer repurchases when missing count ties (faster real completion)
        const aRep = a.edges.filter((e) => e.needsRepurchase).length
        const bRep = b.edges.filter((e) => e.needsRepurchase).length
        if (aRep !== bRep) return aRep < bRep
        if (a.total !== b.total) return a.total > b.total
        return a.weight > b.weight
      }

      const evaluate = (chosen: Edge[]): Pack => {
        let missing = 0
        let weight = 0
        for (const e of chosen) {
          if (e.needKind === 'missing') missing++
          weight += e.score
        }
        return { edges: [...chosen], missing, total: chosen.length, weight }
      }

      const dfs = (giverIdx: number, usedRecv: Set<string>, chosen: Edge[]) => {
        if (giverIdx === n) {
          const pack = evaluate(chosen)
          if (better(pack, best)) best = pack
          return
        }
        // Skip this giver
        dfs(giverIdx + 1, usedRecv, chosen)
        const g = givers[giverIdx]
        for (const e of bestTo.values()) {
          if (e.giver.id !== g.id) continue
          if (usedRecv.has(e.receiver.id)) continue
          if (receiveThisRound.has(e.receiver.id)) continue
          // isOpen again in case state changed mid-search (shouldn't)
          if (!isOpen(e, readyOnly)) continue
          usedRecv.add(e.receiver.id)
          chosen.push(e)
          dfs(giverIdx + 1, usedRecv, chosen)
          chosen.pop()
          usedRecv.delete(e.receiver.id)
        }
      }

      dfs(0, new Set(), [])
      for (const e of best.edges) {
        if (isOpen(e, readyOnly)) tryTake(e)
      }
    }

    // --- fair mode: mutual pairs + residual with debt ---
    const matchMutualPairs = (readyOnly: boolean | null) => {
      type Pair = { ab: Edge; ba: Edge; rank: number }
      const pairs: Pair[] = []
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const a = active[i]
          const b = active[j]
          if (giveThisRound.has(a.id) || giveThisRound.has(b.id)) continue
          if (receiveThisRound.has(a.id) || receiveThisRound.has(b.id)) continue
          const ab = bestEdge(a.id, b.id, readyOnly)
          const ba = bestEdge(b.id, a.id, readyOnly)
          if (!ab || !ba) continue
          const missingN =
            (ab.needKind === 'missing' ? 1 : 0) +
            (ba.needKind === 'missing' ? 1 : 0)
          const debtBoost = debt(a.id) + debt(b.id)
          const rank =
            missingN * 1_000_000 + debtBoost * 50_000 + ab.score + ba.score
          pairs.push({ ab, ba, rank })
        }
      }
      pairs.sort((x, y) => y.rank - x.rank)
      for (const pair of pairs) {
        if (
          giveThisRound.has(pair.ab.giver.id) ||
          giveThisRound.has(pair.ba.giver.id) ||
          receiveThisRound.has(pair.ab.receiver.id) ||
          receiveThisRound.has(pair.ba.receiver.id)
        ) {
          continue
        }
        if (!isOpen(pair.ab, readyOnly) || !isOpen(pair.ba, readyOnly)) continue
        tryTake(pair.ab)
        tryTake(pair.ba)
      }
    }

    const matchResidualFair = (readyOnly: boolean | null) => {
      const list = edges.filter((e) => isOpen(e, readyOnly))
      list.sort((a, b) => {
        const debtDiff = debt(b.receiver.id) - debt(a.receiver.id)
        if (debtDiff !== 0) return debtDiff
        const aSink = debt(a.receiver.id) < 0 ? 1 : 0
        const bSink = debt(b.receiver.id) < 0 ? 1 : 0
        if (aSink !== bSink) return aSink - bSink
        if (a.needKind !== b.needKind) {
          return a.needKind === 'missing' ? -1 : 1
        }
        if (a.needsRepurchase !== b.needsRepurchase) {
          return a.needsRepurchase ? 1 : -1
        }
        const aMut = bestEdge(a.receiver.id, a.giver.id, readyOnly) ? 1 : 0
        const bMut = bestEdge(b.receiver.id, b.giver.id, readyOnly) ? 1 : 0
        if (aMut !== bMut) return bMut - aMut
        return b.score - a.score
      })
      for (const e of list) {
        if (giveThisRound.has(e.giver.id)) continue
        if (receiveThisRound.has(e.receiver.id)) continue
        if (!isOpen(e, readyOnly)) continue
        tryTake(e)
      }
    }

    if (mode === 'completion') {
      // One search for Missing (ready + repurchase scored), then remaining needs.
      // Do NOT pack ready-only first — that can lock Fredek→Antequera (1 fill)
      // and block Fredek→Jars (repurchase) + Jars→Antequera (2 fills).
      packMaxCompletion(null, true)
      packMaxCompletion(null, false)
    } else {
      matchMutualPairs(true)
      matchResidualFair(true)
      matchMutualPairs(false)
      matchResidualFair(false)
    }

    // Skip only pure "repurchase thrash": every exchange restores Lost AND the
    // bringer also needs dust. Ready gifts that restore a Lost collection stay —
    // they were incorrectly wiped before, which skipped useful Fredek→Jars style trades.
    let skippedPureLostRestores = false
    const roundExchanges = assignments.filter(
      (a) => a.round === round && isExchangeAssignment(a),
    )
    if (
      roundExchanges.length > 0 &&
      roundExchanges.every((a) => a.needKind === 'lost') &&
      roundExchanges.every((a) => a.needsRepurchase)
    ) {
      skippedPureLostRestores = true
      for (const a of roundExchanges) {
        usedGift.delete(`${a.bringerId}::${a.spriteId}`)
        if (a.recipientId) {
          coveredNeed.delete(`${a.recipientId}::${a.spriteId}`)
          unnoteExchange(a.bringerId, a.recipientId)
        }
        giveThisRound.delete(a.bringerId)
        if (a.recipientId) receiveThisRound.delete(a.recipientId)
      }
      for (let i = assignments.length - 1; i >= 0; i--) {
        const a = assignments[i]
        if (
          a.round === round &&
          isExchangeAssignment(a) &&
          a.needKind === 'lost' &&
          a.needsRepurchase
        ) {
          assignments.splice(i, 1)
        }
      }
    }

    for (const player of active) {
      if (giveThisRound.has(player.id)) continue
      const alreadyBringing = assignments.some(
        (a) => a.round === round && a.bringerId === player.id,
      )
      if (alreadyBringing) continue

      const mastery = pickMasterySprite(
        player,
        new Set(
          assignments
            .filter((a) => a.bringerId === player.id)
            .map((a) => a.spriteId),
        ),
        skippedPureLostRestores ? 'pure-lost-round' : 'no-trade',
        t,
      )
      if (mastery) {
        mastery.round = round
        assignments.push(mastery)
        giveThisRound.add(player.id)
      } else if (round === 1 || skippedPureLostRestores) {
        const huntKey = skippedPureLostRestores
          ? 'suggest.huntThrash'
          : 'suggest.huntFree'
        assignments.push({
          kind: 'mastery',
          bringerId: player.id,
          bringerName: player.name,
          spriteId: '',
          spriteName: t('suggest.huntName'),
          round,
          reason: t(huntKey),
          reasonKey: huntKey,
          reasonVars: {},
          score: 0,
          needsRepurchase: false,
        })
        giveThisRound.add(player.id)
      }
    }
  }

  assignments.sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round
    if (a.bringerName !== b.bringerName)
      return a.bringerName.localeCompare(b.bringerName)
    return b.score - a.score
  })

  const gifts = assignments.filter((a) => a.kind === 'gift').length
  const repurchases = assignments.filter((a) => a.kind === 'repurchase').length
  const mastery = assignments.filter((a) => a.kind === 'mastery').length
  const restores = assignments.filter((a) => a.needKind === 'lost').length
  const missingFills = assignments.filter((a) => a.needKind === 'missing').length
  const exchangeN = assignments.filter(isExchangeAssignment).length

  const summaryKey =
    mode === 'fair' ? 'suggest.summaryFair' : 'suggest.summaryCompletion'

  return {
    generatedAt: new Date().toISOString(),
    activePlayerIds: active.map((p) => p.id),
    assignments,
    summary: t(summaryKey, {
      players: active.length,
      exchanges: exchangeN,
      missing: missingFills,
      restores,
      gifts,
      repurchases,
      mastery,
    }),
  }
}

function buildEdges(active: Player[], mode: SuggestMode): Edge[] {
  const edges: Edge[] = []
  for (const giver of active) {
    for (const receiver of active) {
      if (giver.id === receiver.id) continue
      for (const sprite of SPRITES) {
        const g = getPlayerSprite(giver, sprite.id)
        const r = getPlayerSprite(receiver, sprite.id)

        let needKind: NeedKind | null = null
        if (r.status === 'none') needKind = 'missing'
        else if (r.status === 'lost') needKind = 'lost'
        if (!needKind) continue
        if (g.status === 'none') continue

        // Priority: Missing >> Lost restore; Ready gift >> bringer repurchase (last option, never skipped).
        const needTier = needKind === 'missing' ? 1_000_000 : 1_000
        const readyTier = g.status === 'available' ? 100_000 : 0
        // Completion: rarity tiny. Fair: rarity matters more for "cool" trades.
        const rarity =
          mode === 'completion'
            ? difficultyScore(sprite) * 0.01
            : difficultyScore(sprite)
        const score =
          needTier +
          readyTier +
          rarity +
          (g.mastered ? (mode === 'fair' ? 2 : 0.001) : 0)

        edges.push({
          giver,
          receiver,
          spriteId: sprite.id,
          score,
          needsRepurchase: g.status === 'lost',
          summonCost: sprite.summonCost,
          needKind,
        })
      }
    }
  }
  return edges
}

function takeEdge(
  e: Edge,
  round: number,
  assignments: BringAssignment[],
  usedGift: Set<string>,
  coveredNeed: Set<string>,
  giveThisRound: Set<string>,
  receiveThisRound: Set<string>,
  t: TFn,
): void {
  const sprite = SPRITE_BY_ID[e.spriteId]
  if (!sprite) return

  const giftKey = `${e.giver.id}::${e.spriteId}`
  const coverKey = `${e.receiver.id}::${e.spriteId}`
  if (usedGift.has(giftKey) || coveredNeed.has(coverKey)) return
  if (giveThisRound.has(e.giver.id)) return
  if (receiveThisRound.has(e.receiver.id)) return

  usedGift.add(giftKey)
  coveredNeed.add(coverKey)
  giveThisRound.add(e.giver.id)
  receiveThisRound.add(e.receiver.id)

  const kind = e.needsRepurchase ? 'repurchase' : 'gift'
  const difficultyKey = difficultyKeyFor(difficultyScore(sprite))
  const needPhraseKey =
    e.needKind === 'missing' ? 'suggest.needMissing' : 'suggest.needLost'
  const reasonKey = e.needsRepurchase
    ? 'suggest.tradeRepurchase'
    : 'suggest.tradeReady'
  const reasonVars: Record<string, string | number> = e.needsRepurchase
    ? {
        cost: e.summonCost.toLocaleString(),
        receiver: e.receiver.name,
        needKey: needPhraseKey,
        difficultyKey,
      }
    : {
        receiver: e.receiver.name,
        needKey: needPhraseKey,
        difficultyKey,
      }

  assignments.push({
    kind,
    bringerId: e.giver.id,
    bringerName: e.giver.name,
    spriteId: e.spriteId,
    spriteName: sprite.name,
    imageUrl: sprite.imageUrl,
    summonCost: sprite.summonCost,
    recipientId: e.receiver.id,
    recipientName: e.receiver.name,
    needKind: e.needKind,
    round,
    reason: formatTradeReason(t, reasonKey, reasonVars),
    reasonKey,
    reasonVars,
    score: e.score,
    needsRepurchase: e.needsRepurchase,
  })
}

/**
 * Resolve assignment synopsis at display time.
 * Always prefers structural rebuild for trades so locale switches and older
 * room plans (English baked `reason`, missing reasonKey) still translate.
 */
export function formatAssignmentReason(
  a: BringAssignment,
  t: TFn,
): string {
  // Trades: rebuild from needKind / dust / rarity so EN↔ES always works.
  if (isExchangeAssignment(a)) {
    return rebuildTradeReason(a, t)
  }

  // Mastery / hunt: prefer stored reasonKey (thrash vs no-trade wording).
  if (a.reasonKey) {
    return t(a.reasonKey, a.reasonVars ?? {})
  }

  // Legacy mastery / hunt without reasonKey
  if (a.kind === 'mastery') {
    if (!a.spriteId) {
      return t('suggest.huntFree')
    }
    if (a.needsRepurchase) {
      return t('suggest.masteryNoTradeRepurchase', {
        cost: (a.summonCost ?? 0).toLocaleString(),
      })
    }
    return t('suggest.masteryNoTrade')
  }

  return a.reason
}

/** Display name for hunt free rows (localized even if plan baked English). */
export function formatAssignmentSpriteName(
  a: BringAssignment,
  t: TFn,
): string {
  if (a.kind === 'mastery' && !a.spriteId) {
    return t('suggest.huntName')
  }
  return a.spriteName || '—'
}

function rebuildTradeReason(a: BringAssignment, t: TFn): string {
  const sprite = a.spriteId ? SPRITE_BY_ID[a.spriteId] : undefined
  const difficultyKey = sprite
    ? difficultyKeyFor(difficultyScore(sprite))
    : 'suggest.difficulty.common'
  const needKey =
    a.needKind === 'lost' ? 'suggest.needLost' : 'suggest.needMissing'
  const cost = (a.summonCost ?? sprite?.summonCost ?? 0).toLocaleString()
  const receiver = a.recipientName || ''

  if (a.needsRepurchase || a.kind === 'repurchase') {
    return formatTradeReason(t, 'suggest.tradeRepurchase', {
      cost,
      receiver,
      needKey,
      difficultyKey,
    })
  }
  return formatTradeReason(t, 'suggest.tradeReady', {
    receiver,
    needKey,
    difficultyKey,
  })
}

function formatTradeReason(
  t: TFn,
  reasonKey: string,
  vars: Record<string, string | number>,
): string {
  const needKey = String(vars.needKey || 'suggest.needMissing')
  const difficultyKey = String(
    vars.difficultyKey || 'suggest.difficulty.common',
  )
  const need = t(needKey)
  const difficulty = t(difficultyKey)
  return t(reasonKey, {
    ...vars,
    need,
    difficulty,
  })
}

function difficultyKeyFor(score: number): string {
  if (score >= 50) return 'suggest.difficulty.ultraRare'
  if (score >= 35) return 'suggest.difficulty.veryRare'
  if (score >= 25) return 'suggest.difficulty.rare'
  if (score >= 15) return 'suggest.difficulty.uncommon'
  return 'suggest.difficulty.common'
}

export type ApplyResult = {
  state: SquadState
  applied: number
  skipped: string[]
}

export type ExchangeApplyMode = 'success' | 'failed' | 'ignored'

export function applyExchangeRound(
  state: SquadState,
  roundAssignments: BringAssignment[],
  mode: ExchangeApplyMode = 'success',
): ApplyResult {
  const players = state.players.map((p) => ({
    ...p,
    sprites: { ...p.sprites },
  }))

  const byId = new Map(players.map((p) => [p.id, p]))
  const byName = new Map(players.map((p) => [p.name.trim().toLowerCase(), p]))

  function resolve(
    id: string | undefined,
    name: string | undefined,
  ): Player | undefined {
    if (id && byId.has(id)) return byId.get(id)
    if (name) {
      const hit = byName.get(name.trim().toLowerCase())
      if (hit) return hit
    }
    return undefined
  }

  let applied = 0
  const skipped: string[] = []

  for (const a of roundAssignments) {
    if (!a.spriteId || !a.recipientId) {
      skipped.push(`${a.spriteName || 'row'}: not an exchange`)
      continue
    }
    if (a.kind === 'mastery') continue

    if (mode === 'ignored') {
      applied++
      continue
    }

    const bringer = resolve(a.bringerId, a.bringerName)
    if (!bringer) {
      skipped.push(`${a.spriteName}: could not find ${a.bringerName}`)
      continue
    }

    if (mode === 'success') {
      const recipient = resolve(a.recipientId, a.recipientName)
      if (!recipient) {
        skipped.push(`${a.spriteName}: could not find ${a.recipientName}`)
        continue
      }

      const bringerPrev = getPlayerSprite(bringer, a.spriteId)
      bringer.sprites[a.spriteId] = {
        status: 'lost',
        mastered: bringerPrev.mastered,
      }

      const recipientPrev = getPlayerSprite(recipient, a.spriteId)
      recipient.sprites[a.spriteId] = {
        status: 'available',
        mastered: recipientPrev.mastered,
      }
    } else {
      const bringerPrev = getPlayerSprite(bringer, a.spriteId)
      bringer.sprites[a.spriteId] = {
        status: 'lost',
        mastered: bringerPrev.mastered,
      }
    }

    applied++
  }

  return {
    state: {
      ...state,
      players,
    },
    applied,
    skipped,
  }
}

export function isExchangeAssignment(a: BringAssignment): boolean {
  return Boolean(a.spriteId && a.recipientId && a.kind !== 'mastery')
}

function pickMasterySprite(
  player: Player,
  exclude: Set<string> = new Set(),
  context: 'no-trade' | 'pure-lost-round' = 'no-trade',
  t: TFn = (k) => k,
): BringAssignment | null {
  const candidates = SPRITES.map((s) => {
    const st = getPlayerSprite(player, s.id)
    if (exclude.has(s.id)) return null
    if (st.status === 'none') return null
    if (st.mastered) return null
    return { sprite: s, st }
  }).filter(Boolean) as {
    sprite: (typeof SPRITES)[number]
    st: PlayerSpriteState
  }[]

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    if (a.st.status !== b.st.status) {
      return a.st.status === 'available' ? -1 : 1
    }
    if (a.st.status === 'lost') {
      return a.sprite.summonCost - b.sprite.summonCost
    }
    return difficultyScore(b.sprite) - difficultyScore(a.sprite)
  })

  const best = candidates[0]
  const needsRepurchase = best.st.status === 'lost'
  const thrashSkip = context === 'pure-lost-round'
  const cost = best.sprite.summonCost.toLocaleString()
  const reasonKey = thrashSkip
    ? needsRepurchase
      ? 'suggest.masteryThrashRepurchase'
      : 'suggest.masteryThrash'
    : needsRepurchase
      ? 'suggest.masteryNoTradeRepurchase'
      : 'suggest.masteryNoTrade'
  const reasonVars: Record<string, string | number> = needsRepurchase
    ? { cost }
    : {}
  return {
    kind: 'mastery',
    bringerId: player.id,
    bringerName: player.name,
    spriteId: best.sprite.id,
    spriteName: best.sprite.name,
    imageUrl: best.sprite.imageUrl,
    summonCost: best.sprite.summonCost,
    needKind: undefined,
    round: 0,
    reason: t(reasonKey, reasonVars),
    reasonKey,
    reasonVars,
    score: difficultyScore(best.sprite),
    needsRepurchase,
  }
}
