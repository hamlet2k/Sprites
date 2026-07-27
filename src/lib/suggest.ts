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
} from '../types'
import { getPlayerSprite } from './storage'

/** Max sprites to recommend a player bring (equip + inventory). */
export const MAX_BRING_PER_PLAYER = 4

type Edge = {
  giver: Player
  receiver: Player
  spriteId: string
  score: number
  needsRepurchase: boolean
  summonCost: number
  needKind: NeedKind
}

/**
 * Build a bring/gift plan for the active squad.
 *
 * Priority (strict tiers):
 * 1. Receiver **missing** before receiver **lost** restore
 * 2. Giver **Ready** (no dust) before giver **Lost** (repurchase) — never gift a
 *    lost copy while the same giver still has a Ready gift for someone's need
 * 3. Hard cap: at most one gift and one receive per player per round
 *    (multiple passes form cycles; never double-gift one receiver)
 * 4. Harder-to-find sprites within the same tier
 *
 * Per-round anti-thrash: if a round’s exchanges are **only** lost-restores
 * (no missing fills), drop those trades and assign mastery / free hunt instead.
 * Mixed rounds (missing + restore) keep both for fair 1:1 give/receive.
 */
export function buildSuggestionPlan(
  state: SquadState,
  locale: Locale = 'en',
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

  const edges = buildEdges(active)
  const assignments: BringAssignment[] = []
  const usedGift = new Set<string>() // giverId::spriteId
  const coveredNeed = new Set<string>() // receiverId::spriteId

  for (let round = 1; round <= MAX_BRING_PER_PLAYER; round++) {
    const giveThisRound = new Set<string>()
    const receiveThisRound = new Set<string>()

    const openEdges = (readyOnly: boolean) =>
      edges.filter((e) => {
        if (readyOnly && e.needsRepurchase) return false
        if (!readyOnly && !e.needsRepurchase) return false
        if (usedGift.has(`${e.giver.id}::${e.spriteId}`)) return false
        if (coveredNeed.has(`${e.receiver.id}::${e.spriteId}`)) return false
        if (giveThisRound.has(e.giver.id)) return false
        return true
      })

    const sortFair = (list: Edge[], preferUnreceived: boolean) =>
      [...list].sort((a, b) => {
        // 1) Receiver missing before lost-restore
        if (a.needKind !== b.needKind) {
          return a.needKind === 'missing' ? -1 : 1
        }
        // 2) Ready gifts before repurchase (belt-and-suspenders with pass order)
        if (a.needsRepurchase !== b.needsRepurchase) {
          return a.needsRepurchase ? 1 : -1
        }
        if (preferUnreceived) {
          const aR = receiveThisRound.has(a.receiver.id) ? 1 : 0
          const bR = receiveThisRound.has(b.receiver.id) ? 1 : 0
          if (aR !== bR) return aR - bR
        }
        return b.score - a.score
      })

    /**
     * Fair matching within a round: each player gives at most once and
     * receives at most once. Multiple passes find longer exchange cycles
     * (A→B, B→C, C→A). Never dump a second gift onto someone who already
     * received while another player got nothing.
     */
    const runFairMatching = (list: Edge[]) => {
      for (const e of sortFair(list, true)) {
        if (giveThisRound.has(e.giver.id)) continue
        if (receiveThisRound.has(e.receiver.id)) continue
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
      }
    }

    // --- Ready inventory first (no dust) ---
    // Extra passes pick up remaining 1:1 pairs / cycles after earlier takes.
    runFairMatching(openEdges(true))
    runFairMatching(openEdges(true))
    runFairMatching(openEdges(true))

    // --- Only then allow lost / repurchase gifts ---
    runFairMatching(openEdges(false))
    runFairMatching(openEdges(false))
    runFairMatching(openEdges(false))

    // Pure lost-restore rounds thrash (A restores B, B restores A next time).
    // If this round has exchanges and none fill a Missing gap, scrap them.
    let skippedPureLostRestores = false
    const roundExchanges = assignments.filter(
      (a) => a.round === round && isExchangeAssignment(a),
    )
    if (
      roundExchanges.length > 0 &&
      roundExchanges.every((a) => a.needKind === 'lost')
    ) {
      skippedPureLostRestores = true
      for (const a of roundExchanges) {
        usedGift.delete(`${a.bringerId}::${a.spriteId}`)
        if (a.recipientId) {
          coveredNeed.delete(`${a.recipientId}::${a.spriteId}`)
        }
        giveThisRound.delete(a.bringerId)
        if (a.recipientId) receiveThisRound.delete(a.recipientId)
      }
      for (let i = assignments.length - 1; i >= 0; i--) {
        const a = assignments[i]
        if (a.round === round && isExchangeAssignment(a) && a.needKind === 'lost') {
          assignments.splice(i, 1)
        }
      }
    }

    // Mastery / hunt for active players not bringing this round
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
        skippedPureLostRestores
          ? 'pure-lost-round'
          : 'no-trade',
        t,
      )
      if (mastery) {
        mastery.round = round
        assignments.push(mastery)
        giveThisRound.add(player.id)
      } else if (round === 1 || skippedPureLostRestores) {
        assignments.push({
          kind: 'mastery',
          bringerId: player.id,
          bringerName: player.name,
          spriteId: '',
          spriteName: t('suggest.huntName'),
          round,
          reason: skippedPureLostRestores
            ? t('suggest.huntThrash')
            : t('suggest.huntFree'),
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

  return {
    generatedAt: new Date().toISOString(),
    activePlayerIds: active.map((p) => p.id),
    assignments,
    summary: t('suggest.summary', {
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

function buildEdges(active: Player[]): Edge[] {
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

        const hard = difficultyScore(sprite)
        // Hard tiers so rarity never overrides Ready vs Lost or Missing vs restore.
        // difficultyScore tops out well under ~200.
        const needTier = needKind === 'missing' ? 100_000 : 0
        const readyTier = g.status === 'available' ? 10_000 : 0
        const score =
          needTier +
          readyTier +
          hard +
          (g.mastered ? 2 : 0) -
          (g.status === 'lost' ? 50 : 0)

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

type TFn = (key: string, vars?: Record<string, string | number>) => string

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
  const needKey = `${e.receiver.id}::${e.spriteId}`
  if (usedGift.has(giftKey) || coveredNeed.has(needKey)) return
  if (giveThisRound.has(e.giver.id)) return

  usedGift.add(giftKey)
  coveredNeed.add(needKey)
  giveThisRound.add(e.giver.id)
  receiveThisRound.add(e.receiver.id)

  const kind = e.needsRepurchase ? 'repurchase' : 'gift'
  const needPhrase =
    e.needKind === 'missing'
      ? t('suggest.needMissing')
      : t('suggest.needLost')
  const difficulty = difficultyLabel(hardScore(e.score, e.needKind), t)

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
    reason: e.needsRepurchase
      ? t('suggest.tradeRepurchase', {
          cost: e.summonCost.toLocaleString(),
          receiver: e.receiver.name,
          need: needPhrase,
          difficulty,
        })
      : t('suggest.tradeReady', {
          receiver: e.receiver.name,
          need: needPhrase,
          difficulty,
        }),
    score: e.score,
    needsRepurchase: e.needsRepurchase,
  })
}

export type ApplyResult = {
  state: SquadState
  applied: number
  skipped: string[]
}

/**
 * - success: trade completed
 * - failed: died / lost before extract
 * - ignored: forgot to bring — no collection changes
 */
export type ExchangeApplyMode = 'success' | 'failed' | 'ignored'

/**
 * Apply exchanges from a plan.
 *
 * - **success**: recipient → Ready; bringer → Lost
 * - **failed**: bringer → Lost only (recipient unchanged — trade never completed)
 * - **ignored**: no collection changes (forgot to bring / skipped)
 *
 * Resolves players by id, then by name (in case cloud reloads rotated UUIDs
 * after the plan was generated).
 */
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
      // Forgot to bring — track as handled only; collections unchanged
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
      // Failed: died / lost before extract — bringer lost it; receiver got nothing
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
    reason: thrashSkip
      ? needsRepurchase
        ? t('suggest.masteryThrashRepurchase', { cost })
        : t('suggest.masteryThrash')
      : needsRepurchase
        ? t('suggest.masteryNoTradeRepurchase', { cost })
        : t('suggest.masteryNoTrade'),
    score: difficultyScore(best.sprite),
    needsRepurchase,
  }
}

function hardScore(score: number, needKind: NeedKind): number {
  // Strip priority tiers for human-readable rarity label
  let s = score
  if (needKind === 'missing') s -= 100_000
  if (s >= 10_000) s -= 10_000
  return s
}

function difficultyLabel(score: number, t: TFn): string {
  if (score >= 50) return t('suggest.difficulty.ultraRare')
  if (score >= 35) return t('suggest.difficulty.veryRare')
  if (score >= 25) return t('suggest.difficulty.rare')
  if (score >= 15) return t('suggest.difficulty.uncommon')
  return t('suggest.difficulty.common')
}
