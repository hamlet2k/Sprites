import type { OwnershipStatus, PlayerSpriteState } from '../types'

/**
 * Main card tap:
 * - Missing → Ready (first collect)
 * - Ready ↔ Lost thereafter
 * Use set-missing control for Missing.
 */
export function cycleStatus(current: OwnershipStatus): OwnershipStatus {
  if (current === 'none') return 'available'
  if (current === 'available') return 'lost'
  return 'available'
}

export function cyclePlayerSprite(
  state: PlayerSpriteState,
  mode: 'status' | 'mastered' | 'missing',
): PlayerSpriteState {
  if (mode === 'mastered') {
    // Mastered implies at least collected once
    const mastered = !state.mastered
    return {
      status:
        mastered && state.status === 'none' ? 'available' : state.status,
      mastered,
    }
  }
  if (mode === 'missing') {
    return {
      status: 'none',
      // Keep mastery history if they ever extracted at L5
      mastered: state.mastered,
    }
  }
  const status = cycleStatus(state.status)
  return {
    status,
    mastered: state.mastered,
  }
}
