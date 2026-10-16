import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// SEC-002 — Test de aislamiento RLS de las tablas de disponibilidad de scheduling (US-AGE-01).
//
// La disponibilidad la administra solo staff: anon y una clienta autenticada real (creada por
// sign-up, sin service-role key — SEC-003) no pueden leer ni escribir. El control positivo
// (staff sí puede) vive en supabase/tests/database/scheduling_*.test.sql, donde el rol se
// siembra dentro de una transacción.
//
// Se salta si Supabase local no está disponible; en CI (job-tests-reales) sí lo está.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'

let reachable = false
if (URL && ANON_KEY) {
  try {
    const res = await fetch(`${URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    reachable = res.status < 500
  } catch {
    reachable = false
  }
}
if (!reachable) {
  console.warn('[scheduling/rls] Supabase local no disponible — suite omitida.')
}

async function signUpClienta(): Promise<SupabaseClient> {
  const anon = createClient(URL, ANON_KEY)
  const email = `rls-sched-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anon.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session) {
    throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  return createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
}

const TABLES: Record<string, Record<string, unknown>> = {
  scheduling_resources: { name: 'RLS intento de escritura' },
  scheduling_weekly_availability: {
    resource_id: RESOURCE_ID,
    weekday: 6,
    start_min: 60,
    end_min: 120,
  },
  scheduling_closed_dates: {
    resource_id: RESOURCE_ID,
    closed_on: '2030-01-01',
    kind: 'holiday',
  },
  scheduling_manual_blocks: {
    resource_id: RESOURCE_ID,
    starts_at: '2030-01-02T15:00:00Z',
    ends_at: '2030-01-02T16:00:00Z',
  },
}

describe.skipIf(!reachable)('SEC-002 — aislamiento RLS de la disponibilidad de scheduling', () => {
  let anon: SupabaseClient
  let clienta: SupabaseClient

  beforeAll(async () => {
    anon = createClient(URL, ANON_KEY)
    clienta = await signUpClienta()
    const staffCheck = await clienta.rpc('auth_is_staff')
    if (staffCheck.error || staffCheck.data !== false) {
      throw new Error('setup: la clienta de prueba no debería tener rol de staff')
    }
  })

  for (const [table, row] of Object.entries(TABLES)) {
    it(`${table}: anón y clienta no leen nada`, async () => {
      for (const client of [anon, clienta]) {
        const { data, error } = await client.from(table).select('id')
        expect(error).toBeNull()
        expect(data ?? []).toHaveLength(0)
      }
    })

    it(`${table}: anón y clienta no pueden INSERT`, async () => {
      for (const client of [anon, clienta]) {
        const insert = await client.from(table).insert(row).select()
        expect(insert.error).not.toBeNull()
      }
    })

    it(`${table}: anón y clienta no pueden UPDATE ni DELETE`, async () => {
      for (const client of [anon, clienta]) {
        const update = await client.from(table).update({ created_at: new Date(0).toISOString() }).not('id', 'is', null).select()
        expect(update.data ?? []).toHaveLength(0)
        const remove = await client.from(table).delete().not('id', 'is', null).select()
        expect(remove.data ?? []).toHaveLength(0)
      }
    })
  }
})
