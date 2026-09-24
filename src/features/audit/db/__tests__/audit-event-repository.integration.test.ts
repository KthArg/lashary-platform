import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isOk } from '@/shared/result'
import { AuditEvent } from '@/features/audit/domain/audit-event'
import { SupabaseAuditEventRepository } from '@/features/audit/db/audit-event-repository'

// Integración contra Supabase local. audit_events no tiene lectura pública (a diferencia de
// catalog_techniques): con token anónimo solo hay algo que probar del lado de la escritura,
// denegada por RLS (SEC-001, fail-closed). Se salta sin conexión.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

let reachable = false
if (URL && KEY) {
  try {
    const res = await fetch(`${URL}/rest/v1/`, { headers: { apikey: KEY } })
    reachable = res.status < 500
  } catch {
    reachable = false
  }
}
if (!reachable) {
  console.warn('[audit/db] Supabase local no disponible — suite omitida.')
}

describe.skipIf(!reachable)('SupabaseAuditEventRepository (Supabase local)', () => {
  let repo: SupabaseAuditEventRepository
  let db: SupabaseClient

  beforeAll(() => {
    db = createClient(URL, KEY)
    repo = new SupabaseAuditEventRepository(db)
  })

  it('insert() está denegado por RLS con token anónimo (SEC-001, fail-closed)', async () => {
    const built = AuditEvent.create('00000000-0000-0000-0000-00000000f001', {
      actorId: '00000000-0000-0000-0000-000000000000',
      action: 'rls.probe',
      entityType: 'rls_probe',
      entityId: '00000000-0000-0000-0000-000000000000',
      createdAt: new Date(),
    })
    expect(isOk(built)).toBe(true)
    if (!isOk(built)) return

    await expect(repo.insert(built.value)).rejects.toThrow()
  })
})
