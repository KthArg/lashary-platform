import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabasePromotionRepository } from '@/features/catalog/db/promotions/promotion-repository'
import type { PromotionRepository } from '@/features/catalog/application/promotions/ports'

// Integración contra Supabase local (seed cargado). Lecturas con token anónimo; las escrituras
// están denegadas por RLS (B1) y se verifican como tal. Se salta sin conexión (sin Docker).

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

describe.skipIf(!reachable)('createSupabasePromotionRepository (Supabase local)', () => {
  let repo: PromotionRepository
  let db: SupabaseClient
  let techniqueId = ''

  beforeAll(async () => {
    db = createClient(URL, KEY)
    repo = createSupabasePromotionRepository(db)

    const { data } = await db.from('catalog_techniques').select('id').limit(1)
    techniqueId = data?.[0]?.id ?? ''
    if (!techniqueId) throw new Error('setup: el seed de catalog_techniques no está cargado')
  })

  // Sin afterAll de limpieza: save() con token anónimo siempre es denegado por RLS más abajo,
  // así que esta suite nunca persiste nada — no hay nada que borrar, y borrar por technique_id
  // arriesgaba eliminar la promoción del seed si coincidía con la primera técnica (dependencia
  // de orden entre archivos de test que otras suites, como la de aislamiento RLS, necesitan).

  it('save() está denegado por RLS con token anónimo (B1, fail-closed)', async () => {
    const built = await import('@/features/catalog/domain/promotions/promotion').then((m) =>
      m.buildPromotion({
        id: '00000000-0000-0000-0000-00000000a001',
        target: { type: 'technique', techniqueId },
        discountPercent: 10,
        startsAt: new Date('2020-01-01T00:00:00Z'),
        endsAt: new Date('2020-01-31T00:00:00Z'),
      }),
    )
    if (!built.ok) throw new Error('fixture inválida')
    await expect(repo.save(built.value)).rejects.toThrow()
  })

  it('list devuelve al menos la promoción del seed (US-PROM-01)', async () => {
    const page = await repo.list({ offset: 0, limit: 10 })
    expect(page.total).toBeGreaterThanOrEqual(1)
  })

  it('listActive solo devuelve lo vigente en `now`: la del seed dentro de su ventana, nada fuera de ella', async () => {
    const withinSeedWindow = await repo.listActive(new Date('2026-06-01T00:00:00Z'), {
      offset: 0,
      limit: 10,
    })
    expect(withinSeedWindow.total).toBeGreaterThanOrEqual(1)

    const beforeAnyPromotion = await repo.listActive(new Date('2020-01-01T00:00:00Z'), {
      offset: 0,
      limit: 10,
    })
    expect(beforeAnyPromotion.total).toBe(0)
  })

  it('findById devuelve null para un id inexistente', async () => {
    expect(await repo.findById('00000000-0000-0000-0000-000000000000')).toBeNull()
  })
})
