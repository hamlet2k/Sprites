import { difficultyScore, SPRITE_BY_ID, SPRITES } from '../data/sprites'
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

/**
 * Build a bring/gift plan for the active squad.
 *
 * Receiver needs (strict priority):
 * 1. **Missing** — never collected — always before any lost restore
 * 2. **Lost** — secondary restore via trade
 *
 * Within each need tier: harder-to-find first; prefer ready givers over repurchase.
 * Each bringer's trades are numbered round 1–4 (bring order / match rounds).
 */
export function buildSuggestionPlan(state: SquadState): SuggestionPlan {
  const active = state.players.filter((p) =>
    state.activePlayerIds.includes(p.id),
  )
  if (active.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      activePlayerIds: [],
      assignments: [],
      summary: 'Select who is playing, then run Suggest.',
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
        const availableBonus = g.status === 'available' ? 40 : 0
        // Missing always outranks lost restores (even ultra-rare lost).
        // difficultyScore tops out well under ~150, so 1000 is a hard floor.
        const needTier = needKind === 'missing' ? 1000 : 0
        const score =
          needTier +
          hard +
          availableBonus +
          (g.mastered ? 2 : 0) -
          (g.status === 'lost' ? 15 : 0)

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

  // Missing first, then score within tier
  edges.sort((a, b) => {
    if (a.needKind !== b.needKind) {
      return a.needKind === 'missing' ? -1 : 1
    }
    return b.score - a.score
  })

  const assignments: BringAssignment[] = []
  const bringCount = new Map<string, number>()
  const coveredNeed = new Set<string>()
  const usedGift = new Set<string>()

  for (const e of edges) {
    const brought = bringCount.get(e.giver.id) ?? 0
    if (brought >= MAX_BRING_PER_PLAYER) continue

    const needKey = `${e.receiver.id}::${e.spriteId}`
    if (coveredNeed.has(needKey)) continue

    const giftKey = `${e.giver.id}::${e.spriteId}`
    if (usedGift.has(giftKey)) continue

    const sprite = SPRITE_BY_ID[e.spriteId]
    if (!sprite) continue

    usedGift.add(giftKey)
    coveredNeed.add(needKey)
    bringCount.set(e.giver.id, brought + 1)

    const kind = e.needsRepurchase ? 'repurchase' : 'gift'
    const needPhrase =
      e.needKind === 'missing'
        ? 'missing from collection'
        : 'lost — restore without their dust'
    const difficulty = difficultyLabel(hardScore(e.score, e.needKind))

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
      round: 0, // filled below
      reason: e.needsRepurchase
        ? `Repurchase first (${e.summonCost.toLocaleString()} dust) → ${e.receiver.name} (${needPhrase}, ${difficulty})`
        : `Trade to ${e.receiver.name} — ${needPhrase} (${difficulty})`,
      score: e.score,
      needsRepurchase: e.needsRepurchase,
    })
  }

  // Mastery fallback when a player has nothing useful to gift
  for (const player of active) {
    const count = bringCount.get(player.id) ?? 0
    if (count > 0) continue

    const mastery = pickMasterySprite(player)
    if (mastery) {
      assignments.push(mastery)
      bringCount.set(player.id, 1)
    } else {
      assignments.push({
        kind: 'mastery',
        bringerId: player.id,
        bringerName: player.name,
        spriteId: '',
        spriteName: 'Hunt freely',
        imageUrl: undefined,
        summonCost: undefined,
        needKind: undefined,
        round: 0,
        reason:
          'No trade or mastery targets — open chests / trade mid-game for new finds',
        score: 0,
        needsRepurchase: false,
      })
    }
  }

  // Optional second slot: mastery if they only have one trade
  for (const player of active) {
    const count = bringCount.get(player.id) ?? 0
    if (count >= MAX_BRING_PER_PLAYER) continue
    if (count >= 1 && count < 2) {
      const mastery = pickMasterySprite(
        player,
        new Set(
          assignments
            .filter((a) => a.bringerId === player.id)
            .map((a) => a.spriteId),
        ),
      )
      if (mastery) {
        assignments.push(mastery)
        bringCount.set(player.id, count + 1)
      }
    }
  }

  // Assign rounds 1–4 per bringer (priority order already encoded in score)
  assignRounds(assignments)

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

  return {
    generatedAt: new Date().toISOString(),
    activePlayerIds: active.map((p) => p.id),
    assignments,
    summary: `${active.length} players · ${missingFills} missing fill(s) · ${restores} restore(s) · ${gifts} gift(s) · ${repurchases} repurchase(s) · ${mastery} mastery`,
  }
}

function assignRounds(assignments: BringAssignment[]): void {
  const byBringer = new Map<string, BringAssignment[]>()
  for (const a of assignments) {
    const list = byBringer.get(a.bringerId) ?? []
    list.push(a)
    byBringer.set(a.bringerId, list)
  }
  for (const list of byBringer.values()) {
    // Missing trades first, then by score, mastery last
    list.sort((a, b) => {
      const aMiss = a.needKind === 'missing' ? 0 : a.needKind === 'lost' ? 1 : 2
      const bMiss = b.needKind === 'missing' ? 0 : b.needKind === 'lost' ? 1 : 2
      if (aMiss !== bMiss) return aMiss - bMiss
      return b.score - a.score
    })
    list.forEach((a, i) => {
      a.round = Math.min(i + 1, MAX_BRING_PER_PLAYER)
    })
  }
}

/**
 * Apply confirmed exchanges for one round:
 * - Recipient gains the sprite as **available**
 * - Bringer marks the sprite as **lost**
 * Mastery-only rows are skipped.
 */
export function applyExchangeRound(
  state: SquadState,
  roundAssignments: BringAssignment[],
): SquadState {
  const players = state.players.map((p) => ({
    ...p,
    sprites: { ...p.sprites },
  }))

  const byId = Object.fromEntries(players.map((p) => [p.id, p]))

  for (const a of roundAssignments) {
    if (!a.spriteId || !a.recipientId) continue
    if (a.kind === 'mastery') continue

    const bringer = byId[a.bringerId]
    const recipient = byId[a.recipientId]
    if (!bringer || !recipient) continue

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
  }

  return {
    ...state,
    players,
  }
}

export function isExchangeAssignment(a: BringAssignment): boolean {
  return Boolean(a.spriteId && a.recipientId && a.kind !== 'mastery')
}

function pickMasterySprite(
  player: Player,
  exclude: Set<string> = new Set(),
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
    reason: needsRepurchase
      ? `No trades — repurchase & level for mastery (${best.sprite.summonCost.toLocaleString()} dust)`
      : 'No valuable trades — bring to level toward mastery',
    score: difficultyScore(best.sprite),
    needsRepurchase,
  }
}

function hardScore(score: number, needKind: NeedKind): number {
  return needKind === 'missing' ? score - 1000 : score
}

function difficultyLabel(score: number): string {
  if (score >= 50) return 'ultra rare'
  if (score >= 35) return 'very rare'
  if (score >= 25) return 'rare'
  if (score >= 15) return 'uncommon'
  return 'common gap'
}
