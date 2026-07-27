import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { SquadState } from '../types'
import { emptySquad } from './storage'
import { isSparseSquad, wouldWipeRoom } from './squadScore'

/**
 * Supabase JS expects the project root only, e.g.
 *   https://xxxx.supabase.co
 * NOT the REST path (.../rest/v1/). If /rest/v1 is included, requests become
 * /rest/v1/rest/v1/... and PostgREST returns PGRST125 "Invalid path specified".
 */
function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let u = raw.trim().replace(/\/+$/, '')
  u = u.replace(/\/rest\/v1$/i, '')
  u = u.replace(/\/auth\/v1$/i, '')
  u = u.replace(/\/realtime\/v1$/i, '')
  return u || undefined
}

const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

let client: SupabaseClient | null = null

export function isCloudConfigured(): boolean {
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 20)
}

export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured()) return null
  if (!client) {
    client = createClient(url!, anonKey!)
  }
  return client
}

export function getCloudConfigHint(): string {
  if (!isCloudConfigured()) return 'Cloud env vars missing.'
  return `API host: ${url}`
}

export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  for (const b of bytes) code += alphabet[b % alphabet.length]
  return code
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
}

export type CloudResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function createRoom(state: SquadState): Promise<CloudResult<string>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured on this deployment.' }

  for (let i = 0; i < 5; i++) {
    const code = generateRoomCode()
    const payload = withRevision(state, (state.revision ?? 0) + 1)
    const { error } = await sb.from('squad_rooms').insert({
      code,
      state: payload,
      updated_at: new Date().toISOString(),
    })
    if (!error) return { ok: true, data: code }
    if (error.code !== '23505') {
      return { ok: false, error: error.message }
    }
  }
  return { ok: false, error: 'Could not allocate a room code. Try again.' }
}

export async function fetchRoom(code: string): Promise<CloudResult<SquadState>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured on this deployment.' }

  const normalized = normalizeRoomCode(code)
  if (normalized.length < 4) {
    return { ok: false, error: 'Enter a valid room code.' }
  }

  const { data, error } = await sb
    .from('squad_rooms')
    .select('state')
    .eq('code', normalized)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Room not found. Check the code.' }

  const state = normalizeSquad(data.state)
  if (!state?.players?.length) {
    return { ok: false, error: 'Room data is empty or invalid.' }
  }
  return { ok: true, data: state }
}

/**
 * Push local squad to the room.
 * Safety: never overwrite a room that has real progress with empty/sparse local data
 * (the main cause of "room wiped after deploy / new device").
 */
export async function pushRoom(
  code: string,
  state: SquadState,
): Promise<CloudResult<SquadState>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }

  const normalized = normalizeRoomCode(code)

  const { data: existing, error: readError } = await sb
    .from('squad_rooms')
    .select('state')
    .eq('code', normalized)
    .maybeSingle()

  if (readError) return { ok: false, error: readError.message }
  if (!existing) return { ok: false, error: 'Room not found. It may have been deleted.' }

  const remote = normalizeSquad(existing.state)
  if (remote && wouldWipeRoom(state, remote)) {
    return {
      ok: false,
      error:
        'Blocked overwrite: this device has almost no collection data vs the room. Reloading room instead of wiping it.',
    }
  }

  const nextRevision = Math.max(state.revision ?? 0, remote?.revision ?? 0) + 1
  const payload = withRevision(state, nextRevision)

  const { error } = await sb
    .from('squad_rooms')
    .update({
      state: payload,
      updated_at: new Date().toISOString(),
    })
    .eq('code', normalized)

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: payload }
}

export type RoomSubscription = {
  unsubscribe: () => void
}

export function subscribeRoom(
  code: string,
  onRemote: (state: SquadState) => void,
  onError?: (message: string) => void,
): RoomSubscription {
  const sb = getSupabase()
  if (!sb) return { unsubscribe: () => {} }

  const normalized = normalizeRoomCode(code)
  let channel: RealtimeChannel | null = null

  channel = sb
    .channel(`squad_room_${normalized}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'squad_rooms',
        filter: `code=eq.${normalized}`,
      },
      (payload) => {
        const row = payload.new as { state?: unknown }
        const state = normalizeSquad(row?.state)
        if (!state?.players?.length) return
        // Ignore empty realtime payloads that would wipe a filled client
        if (isSparseSquad(state)) return
        onRemote(state)
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        onError?.('Live sync connection error. Changes still save when online.')
      }
    })

  return {
    unsubscribe: () => {
      if (channel) void sb.removeChannel(channel)
    },
  }
}

export function roomFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('room')
  if (!code) return null
  const n = normalizeRoomCode(code)
  return n.length >= 4 ? n : null
}

export function writeRoomToUrl(code: string | null): void {
  const url = new URL(window.location.href)
  if (code) url.searchParams.set('room', normalizeRoomCode(code))
  else url.searchParams.delete('room')
  window.history.replaceState({}, '', url.toString())
}

export function shareUrl(code: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set('room', normalizeRoomCode(code))
  url.hash = ''
  return url.toString()
}

export function localOnlySquad(): SquadState {
  return emptySquad()
}

function withRevision(state: SquadState, revision: number): SquadState {
  return { ...state, revision }
}

function normalizeSquad(raw: unknown): SquadState | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as SquadState
  if (!Array.isArray(s.players) || s.players.length === 0) return null
  return {
    players: s.players,
    activePlayerIds: Array.isArray(s.activePlayerIds) ? s.activePlayerIds : [],
    revision: typeof s.revision === 'number' ? s.revision : 0,
    // Preserve shared plan + Confirm/Failed/Ignore outcomes for all room clients
    suggestion: s.suggestion,
  }
}
