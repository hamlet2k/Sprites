import type { OwnershipStatus, PlayerSpriteState } from '../types'

/**
 * One-tap cycle for in-game updates:
 * none → available → lost → none
 * Long-press / separate control for mastered.
 */
export function cycleStatus(current: OwnershipStatus): OwnershipStatus {
  if (current === 'none') return 'available'
  if (current === 'available') return 'lost'
  return 'none'
}

export function cyclePlayerSprite(
  state: PlayerSpriteState,
  mode: 'status' | 'mastered',
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
  const status = cycleStatus(state.status)
  return {
    status,
    // Losing collection resets mastery tracking display? Keep mastered if ever mastered.
    mastered: status === 'none' ? state.mastered : state.mastered,
  }
}
