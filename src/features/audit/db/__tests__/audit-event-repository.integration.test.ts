import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isOk } from '@/shared/result'
import { AuditEvent } from '@/features/audit/domain/audit-event'
import { SupabaseAuditEventRepository } from '@/features/audit/db/audit-event-repository'

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

describe.skipIf(!configured)('SupabaseAuditEventRepository (Supabase local)', () => {
  let repo: SupabaseAuditEventRepository
  let db: SupabaseClient

  beforeAll(async () => {
    reachable = await probeSupabase()
    if (!reachable) {
      console.warn('[audit/db] Supabase local no disponible — suite omitida.')
      return
    }
    db = createClient(URL, KEY)
    repo = new SupabaseAuditEventRepository(db)
  })

  itLive('insert() está denegado por RLS con token anónimo (SEC-001, fail-closed)', async () => {
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
