import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js'
import { ok, err, type Result } from '@/shared/result'

export type SystemClientConfig = { email: string; password: string }
export type SystemClientFailure = 'system-client-sign-in-failed'

export function readSystemClientConfigFromEnv(env: Record<string, string | undefined>): SystemClientConfig | null {
  const email = env.NOTIFICATIONS_CRON_EMAIL
  const password = env.NOTIFICATIONS_CRON_PASSWORD
  if (!email || !password) return null
  return { email, password }
}

export async function createSystemClient(config: SystemClientConfig): Promise<Result<SupabaseClient, SystemClientFailure>> {
  const client = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { error } = await client.auth.signInWithPassword(config)
  if (error) return err('system-client-sign-in-failed')
  return ok(client)
}
