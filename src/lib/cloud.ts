import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import type { SquadState } from '../types'
import { emptySquad } from './storage'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

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

/** Easy-to-read room codes (no 0/O/1/I). */
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

  // Retry a few times on code collision
  for (let i = 0; i < 5; i++) {
    const code = generateRoomCode()
    const { error } = await sb.from('squad_rooms').insert({
      code,
      state,
      updated_at: new Date().toISOString(),
    })
    if (!error) return { ok: true, data: code }
    if (error.code !== '23505') {
      return { ok: false, error: error.message }
    }
  }
  return { ok: false, error: 'Could not allocate a room code. Try again.' }
}

export async function fetchRoom(
  code: string,
): Promise<CloudResult<SquadState>> {
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

  const state = data.state as SquadState
  if (!state?.players?.length) {
    return { ok: false, error: 'Room data is empty or invalid.' }
  }
  return { ok: true, data: state }
}

export async function pushRoom(
  code: string,
  state: SquadState,
): Promise<CloudResult<true>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }

  const { error } = await sb
    .from('squad_rooms')
    .update({
      state,
      updated_at: new Date().toISOString(),
    })
    .eq('code', normalizeRoomCode(code))

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: true }
}

export type RoomSubscription = {
  unsubscribe: () => void
}

/**
 * Live updates when anyone in the room changes the squad.
 * Returns empty unsubscribe if cloud is off.
 */
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
        const row = payload.new as { state?: SquadState }
        if (row?.state?.players) {
          onRemote(row.state)
        }
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
  // Drop hash if any
  url.hash = ''
  return url.toString()
}

export function localOnlySquad(): SquadState {
  return emptySquad()
}
