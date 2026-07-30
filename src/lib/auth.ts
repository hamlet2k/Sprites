import type { Session, User } from '@supabase/supabase-js'
import type { PlayerSpriteState } from '../types'
import { getSupabase, isCloudConfigured, type CloudResult } from './cloud'

export type AuthUser = {
  id: string
  email: string | null
  displayName: string
}

export type RecentSquad = {
  roomCode: string
  roomName: string | null
  lastJoinedAt: string
}

function mapUser(user: User, displayName?: string | null): AuthUser {
  const meta = user.user_metadata ?? {}
  const name =
    displayName ||
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.custom_claims === 'object' &&
      meta.custom_claims &&
      typeof (meta.custom_claims as { global_name?: string }).global_name ===
        'string' &&
      (meta.custom_claims as { global_name: string }).global_name) ||
    (typeof meta.preferred_username === 'string' && meta.preferred_username) ||
    (user.email ? user.email.split('@')[0] : null) ||
    'Player'
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: name,
  }
}

/** Prefer current origin + path + room query so OAuth returns to the same squad. */
export function authRedirectUrl(): string {
  if (typeof window === 'undefined') return ''
  const u = new URL(window.location.href)
  // Drop OAuth callback noise; keep room= etc.
  u.searchParams.delete('code')
  u.searchParams.delete('state')
  u.searchParams.delete('error')
  u.searchParams.delete('error_code')
  u.searchParams.delete('error_description')
  u.hash = ''
  return u.toString()
}

function stripAuthParamsFromUrl(): void {
  if (typeof window === 'undefined') return
  const u = new URL(window.location.href)
  let changed = false
  for (const key of [
    'code',
    'state',
    'error',
    'error_code',
    'error_description',
  ]) {
    if (u.searchParams.has(key)) {
      u.searchParams.delete(key)
      changed = true
    }
  }
  if (u.hash && (u.hash.includes('access_token') || u.hash.includes('error'))) {
    u.hash = ''
    changed = true
  }
  if (changed) {
    window.history.replaceState({}, '', u.pathname + u.search + u.hash)
  }
}

export async function getSession(): Promise<Session | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getUser()
  if (!data.user) return null
  const { data: profile } = await sb
    .from('profiles')
    .select('display_name')
    .eq('id', data.user.id)
    .maybeSingle()
  return mapUser(data.user, profile?.display_name)
}

/**
 * Finish PKCE/OAuth return (Discord/Google) before the rest of the app runs.
 * Surfaces provider errors that Supabase puts on the query string.
 */
export async function recoverSessionFromUrl(): Promise<{
  user: AuthUser | null
  error?: string
  event?: string
}> {
  const sb = getSupabase()
  if (!sb || typeof window === 'undefined') return { user: null }

  const url = new URL(window.location.href)
  const errDesc =
    url.searchParams.get('error_description') ||
    url.searchParams.get('error') ||
    null
  if (errDesc) {
    stripAuthParamsFromUrl()
    return { user: null, error: decodeURIComponent(errDesc.replace(/\+/g, ' ')) }
  }

  // Prefer an existing session first (stale ?code= must not fail logged-in users)
  const { data: sessionData } = await sb.auth.getSession()
  if (sessionData.session?.user) {
    if (url.searchParams.has('code') || url.searchParams.has('error')) {
      stripAuthParamsFromUrl()
    }
    const u = sessionData.session.user
    const { data: profile } = await sb
      .from('profiles')
      .select('display_name')
      .eq('id', u.id)
      .maybeSingle()
    return { user: mapUser(u, profile?.display_name), event: 'session' }
  }

  const code = url.searchParams.get('code')
  if (code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code)
    stripAuthParamsFromUrl()
    if (error) {
      const msg = error.message || 'Sign-in failed'
      // Stale OAuth return (tab restore / shared link) — don't spam the Squad page
      if (
        /pkce|code verifier|verifier not found/i.test(msg) ||
        /invalid request|flow state/i.test(msg)
      ) {
        return { user: null, event: 'stale_oauth' }
      }
      return { user: null, error: msg, event: 'exchange_failed' }
    }
    if (data.user) {
      const { data: profile } = await sb
        .from('profiles')
        .select('display_name')
        .eq('id', data.user.id)
        .maybeSingle()
      if (!profile) {
        await sb.from('profiles').upsert({
          id: data.user.id,
          display_name: mapUser(data.user).displayName,
        })
      }
      return {
        user: mapUser(data.user, profile?.display_name),
        event: 'signed_in',
      }
    }
  }

  return { user: null }
}

export function onAuthStateChange(
  cb: (user: AuthUser | null, meta?: { event: string }) => void,
): () => void {
  const sb = getSupabase()
  if (!sb) return () => {}
  const { data } = sb.auth.onAuthStateChange((event, session) => {
    if (!session?.user) {
      // Ignore transient signed-out during PKCE exchange noise when URL still has code
      if (
        event === 'INITIAL_SESSION' &&
        typeof window !== 'undefined' &&
        new URL(window.location.href).searchParams.has('code')
      ) {
        return
      }
      cb(null, { event })
      return
    }
    void (async () => {
      const { data: profile } = await sb
        .from('profiles')
        .select('display_name')
        .eq('id', session.user.id)
        .maybeSingle()
      cb(mapUser(session.user, profile?.display_name), { event })
    })()
  })
  return () => data.subscription.unsubscribe()
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<CloudResult<AuthUser | null>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: authRedirectUrl(),
      data: displayName?.trim() ? { full_name: displayName.trim() } : undefined,
    },
  })
  if (error) return { ok: false, error: error.message }
  if (!data.user) return { ok: true, data: null }
  if (displayName?.trim()) {
    await sb.from('profiles').upsert({
      id: data.user.id,
      display_name: displayName.trim(),
    })
  }
  return {
    ok: true,
    data: data.session ? mapUser(data.user, displayName) : null,
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<CloudResult<AuthUser>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) return { ok: false, error: error.message }
  if (!data.user) return { ok: false, error: 'Sign-in failed.' }
  const { data: profile } = await sb
    .from('profiles')
    .select('display_name')
    .eq('id', data.user.id)
    .maybeSingle()
  return { ok: true, data: mapUser(data.user, profile?.display_name) }
}

export async function requestPasswordReset(
  email: string,
): Promise<CloudResult<true>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirectUrl(),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: true }
}

export async function updatePassword(
  newPassword: string,
): Promise<CloudResult<true>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  const { error } = await sb.auth.updateUser({ password: newPassword })
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: true }
}

export async function signInWithOAuth(
  provider: 'google' | 'discord',
): Promise<CloudResult<true>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  if (!isCloudConfigured()) return { ok: false, error: 'Cloud is not configured.' }
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: authRedirectUrl(),
      skipBrowserRedirect: false,
      // Discord needs identify; email is optional but helps profiles
      scopes: provider === 'discord' ? 'identify email' : undefined,
      queryParams:
        provider === 'google'
          ? { access_type: 'online', prompt: 'select_account' }
          : undefined,
    },
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: true }
}

export async function signOut(): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.auth.signOut()
}

export async function loadUserCollection(
  userId: string,
): Promise<CloudResult<Record<string, PlayerSpriteState>>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  const { data, error } = await sb
    .from('user_collections')
    .select('sprites')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  const sprites = (data?.sprites ?? {}) as Record<string, PlayerSpriteState>
  return { ok: true, data: sprites }
}

export async function saveUserCollection(
  userId: string,
  sprites: Record<string, PlayerSpriteState>,
): Promise<CloudResult<true>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  const { error } = await sb.from('user_collections').upsert({
    user_id: userId,
    sprites,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: true }
}

export async function rememberJoinedSquad(
  userId: string,
  roomCode: string,
  roomName?: string | null,
): Promise<void> {
  const sb = getSupabase()
  if (!sb) return
  await sb.from('user_squads').upsert({
    user_id: userId,
    room_code: roomCode,
    room_name: roomName ?? null,
    last_joined_at: new Date().toISOString(),
  })
}

/** Update the display name on recent-squad list without changing last_joined_at. */
export async function updateRecentSquadName(
  userId: string,
  roomCode: string,
  roomName: string | null,
): Promise<CloudResult<true>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  const { error } = await sb
    .from('user_squads')
    .update({ room_name: roomName })
    .eq('user_id', userId)
    .eq('room_code', roomCode)
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: true }
}

export async function listRecentSquads(
  userId: string,
  limit = 8,
): Promise<CloudResult<RecentSquad[]>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  const { data, error } = await sb
    .from('user_squads')
    .select('room_code, room_name, last_joined_at')
    .eq('user_id', userId)
    .order('last_joined_at', { ascending: false })
    .limit(limit)
  if (error) return { ok: false, error: error.message }
  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      roomCode: row.room_code as string,
      roomName: (row.room_name as string | null) ?? null,
      lastJoinedAt: row.last_joined_at as string,
    })),
  }
}

export async function updateProfileDisplayName(
  userId: string,
  displayName: string,
): Promise<CloudResult<true>> {
  const sb = getSupabase()
  if (!sb) return { ok: false, error: 'Cloud is not configured.' }
  const { error } = await sb.from('profiles').upsert({
    id: userId,
    display_name: displayName.trim() || 'Player',
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: true }
}
