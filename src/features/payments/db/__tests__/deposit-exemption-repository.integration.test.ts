import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isOk } from '@/shared/result'
import { DepositExemption } from '@/features/payments/domain/deposit-exemption'
import { SupabaseDepositExemptionRepository } from '@/features/payments/db/deposit-exemption-repository'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const configured = Boolean(URL && KEY)
let reachable = false

async function probeSupabase(): Promise<boolean> {
  try {
    const res = await fetch(`${URL}/rest/v1/`, { headers: { apikey: KEY } })
    return res.status < 500
  } catch {
    return false
  }
}

function itLive(name: string, fn: () => Promise<void>) {
  it(name, async (ctx) => {
    ctx.skip(!reachable)
    await fn()
  })
}

async function seedRealIds(): Promise<{ userId: string; clientId: string }> {
  const anon = createClient(URL, KEY)
  const email = `db-test-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anon.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session || !data.user) {
    throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  const asClienta = createClient(URL, KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  const profile = await asClienta
    .from('clients_profiles')
    .insert({ user_id: data.user.id, full_name: 'DB test', email, phone: '00000000000' })
    .select('id')
    .single()
  if (profile.error || !profile.data) {
    throw new Error(`no se pudo crear el perfil de prueba: ${profile.error?.message ?? 'sin fila'}`)
  }
  return { userId: data.user.id, clientId: profile.data.id as string }
}

describe.skipIf(!configured)('SupabaseDepositExemptionRepository (Supabase local)', () => {
  let repo: SupabaseDepositExemptionRepository
  let db: SupabaseClient
  let userId: string
  let clientId: string

  beforeAll(async () => {
    reachable = await probeSupabase()
    if (!reachable) {
      console.warn('[payments/db] Supabase local no disponible — suite omitida.')
      return
    }
    db = createClient(URL, KEY)
    repo = new SupabaseDepositExemptionRepository(db)
    const seeded = await seedRealIds()
    userId = seeded.userId
    clientId = seeded.clientId
  })

  itLive('save() está denegado por RLS con token anónimo (SEC-001, fail-closed)', async () => {
    const built = DepositExemption.create('00000000-0000-0000-0000-00000000f101', {
      clientId,
      exemptedBy: userId,
      reason: 'rls probe',
      createdAt: new Date(),
    })
    expect(isOk(built)).toBe(true)
    if (!isOk(built)) return

    await expect(repo.save(built.value)).rejects.toThrow()
  })
})
