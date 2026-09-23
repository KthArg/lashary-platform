import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SupabasePackageRepository } from '@/features/catalog/db/package-repository'

// Integración contra Supabase local (seed cargado). Lecturas con token anónimo; las escrituras
// están denegadas por RLS (B1) hasta la migración de escritura (pieza 6). Se salta sin conexión.

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
  console.warn('[catalog/db] Supabase local no disponible — suite omitida.')
}

describe.skipIf(!reachable)('SupabasePackageRepository (Supabase local)', () => {
  let repo: SupabasePackageRepository
  let db: SupabaseClient

  beforeAll(() => {
    db = createClient(URL, KEY)
    repo = new SupabasePackageRepository(db)
  })

  it('list reconstituye el dominio: el paquete del seed, con duración total calculada (criterio 2)', async () => {
    const { items, total } = await repo.list({ activeOnly: true, offset: 0, limit: 50 })
    expect(total).toBe(1)
    expect(items).toHaveLength(1)
    const [{ pkg, durationTotalMin }] = items
    expect(pkg.name).toBe('Cejas y pestañas clásico')
    expect(pkg.techniqueIds).toHaveLength(2)
    expect(pkg.price.colones).toBe(30000)
    // Set clásico: 120 + 15 · Diseño de cejas: 45 + 10 = 190
    expect(durationTotalMin).toBe(190)
  })

  it('findById devuelve el paquete o null', async () => {
    const { items } = await repo.list({ activeOnly: true, offset: 0, limit: 1 })
    const found = await repo.findById(items[0].pkg.id)
    expect(found?.pkg.id).toBe(items[0].pkg.id)
    expect(found?.durationTotalMin).toBe(items[0].durationTotalMin)
    expect(
      await repo.findById('00000000-0000-0000-0000-000000000000'),
    ).toBeNull()
  })

  it('save() está denegado por RLS con token anónimo (B1, fail-closed)', async () => {
    const { items } = await repo.list({ activeOnly: true, offset: 0, limit: 1 })
    await expect(repo.save(items[0].pkg)).rejects.toThrow()

    // y la fila no cambió
    const again = await repo.findById(items[0].pkg.id)
    expect(again?.pkg.name).toBe(items[0].pkg.name)
  })
})
