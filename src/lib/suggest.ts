import { difficultyScore, SPRITE_BY_ID, SPRITES } from '../data/sprites'
import type {
  BringAssignment,
  Player,
  SuggestionPlan,
  SquadState,
} from '../types'
import { getPlayerSprite } from './storage'

/** Max sprites to recommend a player bring (equip + inventory). */
const MAX_BRING_PER_PLAYER = 4

/**
 * Build a bring/gift plan for the active squad.
 *
 * Priority:
 * 1. Hard-to-find sprites (low drop rate / high rarity variants)
 * 2. Available inventory (no repurchase) over lost
 * 3. If only lost copies exist for a needed sprite, suggest repurchase
 * 4. If a player has no trade value, suggest an unmastered sprite to level
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
  }

  const edges: Edge[] = []

  for (const giver of active) {
    for (const receiver of active) {
      if (giver.id === receiver.id) continue
      for (const sprite of SPRITES) {
        const g = getPlayerSprite(giver, sprite.id)
        const r = getPlayerSprite(receiver, sprite.id)
        if (r.status !== 'none') continue // receiver already has it
        if (g.status === 'none') continue // giver never collected

        const hard = difficultyScore(sprite)
        const availableBonus = g.status === 'available' ? 40 : 0
        // Prefer filling gaps for receivers who are missing rare stuff
        const score =
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
        })
      }
    }
  }

  // Highest score first
  edges.sort((a, b) => b.score - a.score)

  const assignments: BringAssignment[] = []
  const bringCount = new Map<string, number>()
  /** spriteId -> set of receiver ids already covered */
  const coveredNeed = new Set<string>()
  /** giverId+spriteId already used */
  const usedGift = new Set<string>()

  for (const e of edges) {
    const brought = bringCount.get(e.giver.id) ?? 0
    if (brought >= MAX_BRING_PER_PLAYER) continue

    const needKey = `${e.receiver.id}::${e.spriteId}`
    if (coveredNeed.has(needKey)) continue

    const giftKey = `${e.giver.id}::${e.spriteId}`
    if (usedGift.has(giftKey)) continue

    // Prefer available gifts first pass — skip lost if available alternative exists later?
    // Score already penalizes lost; still allow if high difficulty.

    const sprite = SPRITE_BY_ID[e.spriteId]
    if (!sprite) continue

    usedGift.add(giftKey)
    coveredNeed.add(needKey)
    bringCount.set(e.giver.id, brought + 1)

    const kind = e.needsRepurchase ? 'repurchase' : 'gift'
    assignments.push({
      kind,
      bringerId: e.giver.id,
      bringerName: e.giver.name,
      spriteId: e.spriteId,
      spriteName: sprite.name,
      recipientId: e.receiver.id,
      recipientName: e.receiver.name,
      reason: e.needsRepurchase
        ? `Repurchase (${e.summonCost.toLocaleString()} dust) — ${difficultyLabel(e.score)} for ${e.receiver.name}`
        : `Trade to ${e.receiver.name} — ${difficultyLabel(e.score)}`,
      score: e.score,
      needsRepurchase: e.needsRepurchase,
      summonCost: e.needsRepurchase ? e.summonCost : undefined,
    })
  }

  // Mastery / self-level fallback for players with no (or few) trade assignments
  for (const player of active) {
    const count = bringCount.get(player.id) ?? 0
    if (count > 0) continue

    const mastery = pickMasterySprite(player)
    if (mastery) {
      assignments.push(mastery)
      bringCount.set(player.id, 1)
    } else {
      // Nothing useful in catalog — suggest hunting in world
      assignments.push({
        kind: 'mastery',
        bringerId: player.id,
        bringerName: player.name,
        spriteId: '',
        spriteName: 'Hunt freely',
        reason:
          'No trade or mastery targets — open chests / trade mid-game for new finds',
        score: 0,
        needsRepurchase: false,
      })
    }
  }

  // Also top up remaining slots with mastery targets for partial traders
  for (const player of active) {
    let count = bringCount.get(player.id) ?? 0
    while (count < 1) {
      // already handled above
      break
    }
    if (count >= MAX_BRING_PER_PLAYER) continue
    // Optional: fill one mastery if they only have 1 trade
    if (count >= 1 && count < 2) {
      const mastery = pickMasterySprite(player, new Set(
        assignments
          .filter((a) => a.bringerId === player.id)
          .map((a) => a.spriteId),
      ))
      if (mastery) {
        assignments.push(mastery)
        bringCount.set(player.id, count + 1)
      }
    }
  }

  // Sort for display: by bringer name, then score
  assignments.sort((a, b) => {
    if (a.bringerName !== b.bringerName)
      return a.bringerName.localeCompare(b.bringerName)
    return b.score - a.score
  })

  const gifts = assignments.filter((a) => a.kind === 'gift').length
  const repurchases = assignments.filter((a) => a.kind === 'repurchase').length
  const mastery = assignments.filter((a) => a.kind === 'mastery').length

  return {
    generatedAt: new Date().toISOString(),
    activePlayerIds: active.map((p) => p.id),
    assignments,
    summary: `${active.length} players · ${gifts} gift(s) · ${repurchases} repurchase(s) · ${mastery} mastery grind(s)`,
  }
}

function pickMasterySprite(
  player: Player,
  exclude: Set<string> = new Set(),
): BringAssignment | null {
  // Prefer available unmastered; then lost unmastered (cheapest first)
  const candidates = SPRITES.map((s) => {
    const st = getPlayerSprite(player, s.id)
    if (exclude.has(s.id)) return null
    if (st.status === 'none') return null
    if (st.mastered) return null
    return { sprite: s, st }
  }).filter(Boolean) as {
    sprite: (typeof SPRITES)[number]
    st: ReturnType<typeof getPlayerSprite>
  }[]

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    // available first
    if (a.st.status !== b.st.status) {
      return a.st.status === 'available' ? -1 : 1
    }
    // cheaper repurchase if lost
    if (a.st.status === 'lost') {
      return a.sprite.summonCost - b.sprite.summonCost
    }
    // slightly prefer harder ones still (mastery rewards)
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
    reason: needsRepurchase
      ? `No trades — repurchase & level for mastery (${best.sprite.summonCost.toLocaleString()} dust)`
      : 'No valuable trades — bring to level toward mastery',
    score: difficultyScore(best.sprite),
    needsRepurchase,
    summonCost: needsRepurchase ? best.sprite.summonCost : undefined,
  }
}

function difficultyLabel(score: number): string {
  if (score >= 50) return 'ultra rare'
  if (score >= 35) return 'very rare'
  if (score >= 25) return 'rare'
  if (score >= 15) return 'uncommon'
  return 'common gap'
}
