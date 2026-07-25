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
 * Fairness (per round 1–4):
 * - Prefer that **each player both gives and receives** one sprite
 * - Missing fills always before lost restores
 * - Within that: harder-to-find + ready (no dust) first
 *
 * Only if a balanced exchange is impossible do we leave someone without a receive
 * or allow an unbalanced gift.
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

  const edges = buildEdges(active)
  const assignments: BringAssignment[] = []
  const usedGift = new Set<string>() // giverId::spriteId
  const coveredNeed = new Set<string>() // receiverId::spriteId

  for (let round = 1; round <= MAX_BRING_PER_PLAYER; round++) {
    const giveThisRound = new Set<string>()
    const receiveThisRound = new Set<string>()

    const available = () =>
      edges.filter((e) => {
        if (usedGift.has(`${e.giver.id}::${e.spriteId}`)) return false
        if (coveredNeed.has(`${e.receiver.id}::${e.spriteId}`)) return false
        if (giveThisRound.has(e.giver.id)) return false
        return true
      })

    const sortFair = (list: Edge[], preferUnreceived: boolean) =>
      [...list].sort((a, b) => {
        if (a.needKind !== b.needKind) {
          return a.needKind === 'missing' ? -1 : 1
        }
        if (preferUnreceived) {
          const aR = receiveThisRound.has(a.receiver.id) ? 1 : 0
          const bR = receiveThisRound.has(b.receiver.id) ? 1 : 0
          if (aR !== bR) return aR - bR
        }
        return b.score - a.score
      })

    // Pass A: balanced 1-give + 1-receive (nobody who already received this round)
    for (const e of sortFair(available(), true)) {
      if (giveThisRound.has(e.giver.id)) continue
      if (receiveThisRound.has(e.receiver.id)) continue
      takeEdge(e, round, assignments, usedGift, coveredNeed, giveThisRound, receiveThisRound)
    }

    // Pass B: players who still need to give → only to players who have not received yet
    for (const e of sortFair(available(), true)) {
      if (giveThisRound.has(e.giver.id)) continue
      if (receiveThisRound.has(e.receiver.id)) continue
      takeEdge(e, round, assignments, usedGift, coveredNeed, giveThisRound, receiveThisRound)
    }

    // Pass C: remaining givers fill anyone (unbalanced, last resort)
    for (const e of sortFair(available(), false)) {
      if (giveThisRound.has(e.giver.id)) continue
      takeEdge(e, round, assignments, usedGift, coveredNeed, giveThisRound, receiveThisRound)
    }

    // Pass D: mastery / hunt for active players not bringing this round
    for (const player of active) {
      if (giveThisRound.has(player.id)) continue
      // Only add mastery on early rounds if they have zero trades overall so far
      const alreadyBringing = assignments.some((a) => a.bringerId === player.id)
      if (alreadyBringing && round > 1) continue
      if (alreadyBringing) continue

      const mastery = pickMasterySprite(
        player,
        new Set(
          assignments
            .filter((a) => a.bringerId === player.id)
            .map((a) => a.spriteId),
        ),
      )
      if (mastery) {
        mastery.round = round
        assignments.push(mastery)
        giveThisRound.add(player.id)
      } else if (round === 1) {
        assignments.push({
          kind: 'mastery',
          bringerId: player.id,
          bringerName: player.name,
          spriteId: '',
          spriteName: 'Hunt freely',
          round,
          reason:
            'No trade or mastery targets — open chests / trade mid-game for new finds',
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
    summary: `${active.length} players · fair 1:1 preferred · ${exchangeN} exchange(s) · ${missingFills} missing · ${restores} restore · ${gifts} gift · ${repurchases} repurchase · ${mastery} mastery`,
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
        const availableBonus = g.status === 'available' ? 40 : 0
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
    round,
    reason: e.needsRepurchase
      ? `Repurchase first (${e.summonCost.toLocaleString()} dust) → ${e.receiver.name} (${needPhrase}, ${difficulty})`
      : `Trade to ${e.receiver.name} — ${needPhrase} (${difficulty})`,
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
 * Apply confirmed exchanges for one round:
 * - Recipient gains the sprite as **available**
 * - Bringer marks the sprite as **lost**
 *
 * Resolves players by id, then by name (in case cloud reloads rotated UUIDs
 * after the plan was generated).
 */
export function applyExchangeRound(
  state: SquadState,
  roundAssignments: BringAssignment[],
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

    const bringer = resolve(a.bringerId, a.bringerName)
    const recipient = resolve(a.recipientId, a.recipientName)

    if (!bringer || !recipient) {
      skipped.push(
        `${a.spriteName}: could not find ${!bringer ? a.bringerName : a.recipientName}`,
      )
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
