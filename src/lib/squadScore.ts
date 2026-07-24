import type { SquadState } from '../types'

/**
 * How much "collection progress" is in a squad snapshot.
 * Used to refuse accidental empty overwrites of cloud rooms.
 */
export function squadWeight(state: SquadState | null | undefined): number {
  if (!state?.players?.length) return 0
  let score = 0
  for (const p of state.players) {
    // Named (non-default) players count a little
    if (p.name && !/^Player \d+$/i.test(p.name.trim())) score += 1
    const sprites = p.sprites ?? {}
    for (const st of Object.values(sprites)) {
      if (st.status === 'available') score += 3
      else if (st.status === 'lost') score += 2
      if (st.mastered) score += 1
    }
  }
  return score
}

/** True when snapshot looks like a blank default squad (typical race-source of wipes). */
export function isSparseSquad(state: SquadState | null | undefined): boolean {
  return squadWeight(state) === 0
}

/**
 * True if applying `local` over `remote` would look like an accidental wipe
 * (e.g. new browser opened the share link and pushed empty localStorage).
 */
export function wouldWipeRoom(local: SquadState, remote: SquadState): boolean {
  const lw = squadWeight(local)
  const rw = squadWeight(remote)
  if (rw === 0) return false
  if (lw === 0 && rw > 0) return true
  // Local is a tiny fraction of remote while remote clearly has progress
  if (rw >= 5 && lw < Math.max(2, Math.floor(rw * 0.15))) return true
  return false
}
