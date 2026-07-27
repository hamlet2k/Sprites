/** Ownership / bring status for one sprite for one player. */
export type OwnershipStatus =
  | 'none' // never collected
  | 'available' // in collection and ready to bring (no dust needed)
  | 'lost' // collected before but lost — needs Sprite Dust repurchase

export interface PlayerSpriteState {
  status: OwnershipStatus
  mastered: boolean
}

export interface Player {
  id: string
  name: string
  color: string
  /** spriteId -> state */
  sprites: Record<string, PlayerSpriteState>
}

/** How a planned exchange was resolved after a match. */
export type ExchangeOutcome = 'success' | 'failed' | 'ignored'

/** Suggestion engine style (synced with shared plan in rooms). */
export type SuggestMode = 'completion' | 'fair'

/**
 * Shared suggestion plan + per-exchange outcomes.
 * Stored on SquadState so cloud rooms sync plan + Confirm/Failed/Ignore for everyone.
 */
export interface SharedSuggestion {
  planId: string
  plan: SuggestionPlan
  /** exchangeKey → outcome */
  outcomes: Record<string, ExchangeOutcome>
  /** Engine mode used to build this plan */
  mode?: SuggestMode
}

export interface SquadState {
  players: Player[]
  /** Player ids selected for the next match suggestion. */
  activePlayerIds: string[]
  /**
   * Monotonic cloud revision. Bumped on each successful room save so clients
   * can detect stale pushes. Optional for older local saves.
   */
  revision?: number
  /** Current shared bring/gift plan and resolved exchanges (room-synced). */
  suggestion?: SharedSuggestion
}

export type SuggestionKind = 'gift' | 'repurchase' | 'mastery'

/** Why the recipient needs this sprite. */
export type NeedKind = 'missing' | 'lost'

export interface BringAssignment {
  kind: SuggestionKind
  bringerId: string
  bringerName: string
  spriteId: string
  spriteName: string
  /** Icon URL for the sprite (empty when no specific sprite). */
  imageUrl?: string
  /** Sprite Dust re-summon cost for this sprite. */
  summonCost?: number
  /** Recipient when kind is gift or repurchase-for-trade */
  recipientId?: string
  recipientName?: string
  /** Recipient need: never collected vs lost restore */
  needKind?: NeedKind
  /**
   * Bring slot / match round for this player (1–4).
   * Round 1 = first priority trade for each player, etc.
   */
  round: number
  /** Why this was chosen */
  reason: string
  score: number
  needsRepurchase: boolean
}

export interface SuggestionPlan {
  /** Unique id for this generation; outcomes are scoped to it. */
  planId?: string
  generatedAt: string
  activePlayerIds: string[]
  assignments: BringAssignment[]
  summary: string
}
