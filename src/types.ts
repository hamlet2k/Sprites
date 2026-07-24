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

export interface SquadState {
  players: Player[]
  /** Player ids selected for the next match suggestion. */
  activePlayerIds: string[]
}

export type SuggestionKind = 'gift' | 'repurchase' | 'mastery'

export interface BringAssignment {
  kind: SuggestionKind
  bringerId: string
  bringerName: string
  spriteId: string
  spriteName: string
  /** Recipient when kind is gift or repurchase-for-trade */
  recipientId?: string
  recipientName?: string
  /** Why this was chosen */
  reason: string
  score: number
  needsRepurchase: boolean
  summonCost?: number
}

export interface SuggestionPlan {
  generatedAt: string
  activePlayerIds: string[]
  assignments: BringAssignment[]
  summary: string
}
