import type { Player, PlayerSpriteState, SquadState } from '../types'

const KEY = 'fortnite-sprite-squad-v1'
const ROOM_KEY = 'fortnite-sprite-squad-room-v1'

const COLORS = ['#5b8def', '#f0a030', '#3ecf8e', '#e85d75', '#b48ef0', '#4ecdc4']

export function defaultSpriteState(): PlayerSpriteState {
  return { status: 'none', mastered: false }
}

export function createPlayer(name: string, index: number): Player {
  return {
    id: crypto.randomUUID(),
    name,
    color: COLORS[index % COLORS.length],
    sprites: {},
  }
}

export function emptySquad(): SquadState {
  return {
    players: [
      createPlayer('Player 1', 0),
      createPlayer('Player 2', 1),
      createPlayer('Player 3', 2),
      createPlayer('Player 4', 3),
    ],
    activePlayerIds: [],
  }
}

export function loadSquad(): SquadState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptySquad()
    const data = JSON.parse(raw) as SquadState
    if (!data.players?.length) return emptySquad()
    return data
  } catch {
    return emptySquad()
  }
}

export function saveSquad(state: SquadState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function loadRoomCode(): string | null {
  try {
    return localStorage.getItem(ROOM_KEY)
  } catch {
    return null
  }
}

export function saveRoomCode(code: string | null): void {
  try {
    if (code) localStorage.setItem(ROOM_KEY, code)
    else localStorage.removeItem(ROOM_KEY)
  } catch {
    /* ignore quota / private mode */
  }
}

export function getPlayerSprite(
  player: Player,
  spriteId: string,
): PlayerSpriteState {
  return player.sprites[spriteId] ?? defaultSpriteState()
}

export function exportSquad(state: SquadState): string {
  return JSON.stringify(state, null, 2)
}

export function importSquad(json: string): SquadState {
  const data = JSON.parse(json) as SquadState
  if (!Array.isArray(data.players)) throw new Error('Invalid squad data')
  return data
}
