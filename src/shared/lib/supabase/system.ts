import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js'

export type SystemClientConfig = { email: string; password: string }

export function readSystemClientConfigFromEnv(env: Record<string, string | undefined>): SystemClientConfig | null {
  const email = env.NOTIFICATIONS_CRON_EMAIL
  const password = env.NOTIFICATIONS_CRON_PASSWORD
  if (!email || !password) return null
  return { email, password }
}

export async function createSystemClient(config: SystemClientConfig): Promise<SupabaseClient> {
  const client = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { error } = await client.auth.signInWithPassword(config)
  if (error) throw error
  return client
}
