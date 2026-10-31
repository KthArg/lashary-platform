import { useSyncExternalStore } from 'react'
import { hasSupabaseSessionCookie } from '@/shared/lib/supabase/session-cookie'

function subscribeToNothing() {
  return () => {}
}

function readSessionCookie() {
  return hasSupabaseSessionCookie(document.cookie, process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
}

function assumeNoSessionOnServer() {
  return false
}

export function useHasSessionCookie(): boolean {
  return useSyncExternalStore(subscribeToNothing, readSessionCookie, assumeNoSessionOnServer)
}
