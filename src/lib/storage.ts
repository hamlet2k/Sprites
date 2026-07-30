import type { Player, PlayerSpriteState, SquadState } from '../types'

const KEY = 'fortnite-sprite-squad-v1'
const ROOM_KEY = 'fortnite-sprite-squad-room-v1'
/** This device's chosen seat (guest or linked account). */
const ACTOR_KEY = 'fortnite-sprite-squad-actor-v1'

const COLORS = ['#5b8def', '#f0a030', '#3ecf8e', '#e85d75', '#b48ef0', '#4ecdc4']

export function defaultSpriteState(): PlayerSpriteState {
  return { status: 'none', mastered: false }
}

export function createPlayer(
  name: string,
  index: number,
  userId?: string,
): Player {
  return {
    id: crypto.randomUUID(),
    name,
    color: COLORS[index % COLORS.length],
    sprites: {},
    ...(userId ? { userId } : {}),
  }
}

export function emptySquad(): SquadState {
  return {
    players: [createPlayer('Player 1', 0)],
    activePlayerIds: [],
  }
}

/** Seat has any ownership / mastery marked. */
export function playerHasProgress(p: Player): boolean {
  return Object.values(p.sprites ?? {}).some(
    (st) => st.mastered || st.status !== 'none',
  )
}

/**
 * True if this seat is linked to another account (not you).
 * Unlinked seats are free to claim when switching — even if they have sprite progress.
 * Only `userId` means “taken” by a logged-in player.
 */
export function isSeatTakenByOther(
  p: Player,
  actorSeatId: string | null,
  myUserId?: string | null,
): boolean {
  if (actorSeatId && p.id === actorSeatId) return false
  if (!p.userId) return false
  if (myUserId && p.userId === myUserId) return false
  return true
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

export function loadActorSeatId(): string | null {
  try {
    return localStorage.getItem(ACTOR_KEY)
  } catch {
    return null
  }
}

export function saveActorSeatId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTOR_KEY, id)
    else localStorage.removeItem(ACTOR_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * After leaving a session: keep only this device's actor collection locally.
 * Drops other seats so the next create does not re-upload them.
 */
export function localDraftFromActor(
  state: SquadState,
  actorId: string | null,
): SquadState {
  const actor =
    (actorId && state.players.find((p) => p.id === actorId)) ||
    state.players[0]
  if (!actor) return emptySquad()
  const me: Player = {
    ...actor,
    sprites: { ...(actor.sprites ?? {}) },
  }
  return {
    players: [me],
    activePlayerIds: [],
  }
}

/**
 * New shared session seed: actor only (add friends with + Add Player).
 */
export function freshSquadForCreate(
  actor: Player,
  squadName?: string,
): SquadState {
  const me: Player = {
    id: actor.id,
    name: actor.name,
    color: actor.color,
    sprites: { ...(actor.sprites ?? {}) },
    ...(actor.userId ? { userId: actor.userId } : {}),
  }
  return {
    players: [me],
    activePlayerIds: [],
    ...(squadName?.trim() ? { name: squadName.trim() } : {}),
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

/** Single-player backup (keeps squad import separate). */
export interface PlayerExportFile {
  version: 1
  type: 'sprite-squad-player'
  exportedAt?: string
  player: {
    name: string
    color?: string
    sprites: Record<string, PlayerSpriteState>
  }
}

export function exportPlayer(player: Player): string {
  const payload: PlayerExportFile = {
    version: 1,
    type: 'sprite-squad-player',
    exportedAt: new Date().toISOString(),
    player: {
      name: player.name,
      color: player.color,
      sprites: player.sprites,
    },
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * Parse a player export (or a full squad file with exactly one player).
 * Does not include id — the target slot keeps its existing id.
 */
export function parsePlayerImport(json: string): {
  name: string
  color?: string
  sprites: Record<string, PlayerSpriteState>
} {
  const data = JSON.parse(json) as unknown
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid player data')
  }
  const obj = data as Record<string, unknown>

  if (obj.type === 'sprite-squad-player' && obj.player && typeof obj.player === 'object') {
    return normalizeImportedPlayer(obj.player as Record<string, unknown>)
  }

  if (Array.isArray(obj.players)) {
    if (obj.players.length === 1 && obj.players[0] && typeof obj.players[0] === 'object') {
      return normalizeImportedPlayer(obj.players[0] as Record<string, unknown>)
    }
    throw new Error(
      'This file has multiple players. Use the per-player Export button, or Import JSON for the whole squad.',
    )
  }

  if (obj.sprites && typeof obj.sprites === 'object') {
    return normalizeImportedPlayer(obj)
  }

  throw new Error('Invalid player data')
}

function normalizeImportedPlayer(raw: Record<string, unknown>): {
  name: string
  color?: string
  sprites: Record<string, PlayerSpriteState>
} {
  if (!raw.sprites || typeof raw.sprites !== 'object') {
    throw new Error('Player file is missing sprites')
  }
  const sprites = raw.sprites as Record<string, PlayerSpriteState>
  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Player'
  const color = typeof raw.color === 'string' ? raw.color : undefined
  return { name, color, sprites }
}
