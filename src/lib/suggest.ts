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

/** How badly the receiver needs this sprite. */
type NeedKind = 'missing' | 'lost'

/**
 * Build a bring/gift plan for the active squad.
 *
 * Receiver needs (priority order):
 * 1. **Missing** — never collected (primary)
 * 2. **Lost** — collected before but needs dust / a trade to restore (secondary)
 *
 * Giver supply:
 * - Prefer **available** (ready, no dust) over **lost** (repurchase first)
 * - Harder-to-find sprites score higher
 * - If a player has no trade value, suggest an unmastered sprite to level
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

        // Receiver needs: missing (primary) or lost (secondary restore)
        let needKind: NeedKind | null = null
        if (r.status === 'none') needKind = 'missing'
        else if (r.status === 'lost') needKind = 'lost'
        if (!needKind) continue

        // Giver must have the sprite in collection (ready or lost-but-can-repurchase)
        if (g.status === 'none') continue

        // Don't "restore" to someone if the giver would only give away their last
        // ready copy and also has lost — still allowed; scoring handles preference.

        const hard = difficultyScore(sprite)
        const availableBonus = g.status === 'available' ? 40 : 0
        // Primary: fill never-collected gaps. Secondary: restore lost.
        const needBonus = needKind === 'missing' ? 35 : 12
        const score =
          hard +
          needBonus +
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

  edges.sort((a, b) => b.score - a.score)

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
    const difficulty = difficultyLabel(e.score)

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

  assignments.sort((a, b) => {
    if (a.bringerName !== b.bringerName)
      return a.bringerName.localeCompare(b.bringerName)
    return b.score - a.score
  })

  const gifts = assignments.filter((a) => a.kind === 'gift').length
  const repurchases = assignments.filter((a) => a.kind === 'repurchase').length
  const mastery = assignments.filter((a) => a.kind === 'mastery').length
  const restores = assignments.filter((a) =>
    a.reason.includes('lost — restore'),
  ).length
  const missingFills = assignments.filter((a) =>
    a.reason.includes('missing from collection'),
  ).length

  return {
    generatedAt: new Date().toISOString(),
    activePlayerIds: active.map((p) => p.id),
    assignments,
    summary: `${active.length} players · ${missingFills} missing fill(s) · ${restores} restore(s) · ${gifts} gift(s) · ${repurchases} repurchase(s) · ${mastery} mastery`,
  }
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
    st: ReturnType<typeof getPlayerSprite>
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
    reason: needsRepurchase
      ? `No trades — repurchase & level for mastery (${best.sprite.summonCost.toLocaleString()} dust)`
      : 'No valuable trades — bring to level toward mastery',
    score: difficultyScore(best.sprite),
    needsRepurchase,
  }
}

function difficultyLabel(score: number): string {
  if (score >= 50) return 'ultra rare'
  if (score >= 35) return 'very rare'
  if (score >= 25) return 'rare'
  if (score >= 15) return 'uncommon'
  return 'common gap'
}
