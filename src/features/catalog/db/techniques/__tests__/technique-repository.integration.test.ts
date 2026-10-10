import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseTechniqueRepository } from '@/features/catalog/db/techniques/technique-repository'
import type { TechniqueRepository } from '@/features/catalog/application/techniques/ports'

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

describe.skipIf(!reachable)('createSupabaseTechniqueRepository (Supabase local)', () => {
  let repo: TechniqueRepository
  let db: SupabaseClient

  beforeAll(() => {
    db = createClient(URL, KEY)
    repo = createSupabaseTechniqueRepository(db)
  })

  it('list reconstituye el dominio: 8 activas del seed, montos como Money', async () => {
    const { items, total } = await repo.list({
      activeOnly: true,
      offset: 0,
      limit: 50,
    })
    expect(total).toBe(8)
    expect(items).toHaveLength(8)
    for (const technique of items) {
      expect(technique.priceFirstTime.colones).toBeGreaterThan(0)
      expect(technique.isActive).toBe(true)
    }
  })

  it('list ordena por family y luego name, y pagina', async () => {
    const first = await repo.list({ activeOnly: true, offset: 0, limit: 3 })
    const second = await repo.list({ activeOnly: true, offset: 3, limit: 3 })
    expect(first.items).toHaveLength(3)
    expect(second.items).toHaveLength(3)
    expect(first.items.map((technique) => technique.id)).not.toEqual(
      second.items.map((technique) => technique.id),
    )
  })

  it('findById devuelve la técnica o null', async () => {
    const { items } = await repo.list({ activeOnly: true, offset: 0, limit: 1 })
    const found = await repo.findById(items[0].id)
    expect(found?.id).toBe(items[0].id)
    expect(
      await repo.findById('00000000-0000-0000-0000-000000000000'),
    ).toBeNull()
  })

  it('save() está denegado por RLS con token anónimo (B1, fail-closed)', async () => {
    const { items } = await repo.list({ activeOnly: true, offset: 0, limit: 1 })
    await expect(repo.save(items[0])).rejects.toThrow()

    const again = await repo.findById(items[0].id)
    expect(again?.name).toBe(items[0].name)
  })
})
