import { describe, it, expect, vi } from 'vitest'

// El entry point usa el cliente Supabase de servidor (next/headers). Lo sustituimos por un
// almacén de cookies vacío -> cliente anónimo, y probamos contra Supabase local con el seed.
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))

import {
  listTechniques,
  getTechnique,
  TechniqueNotFound,
} from '@/features/catalog'

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
  console.warn('[catalog/public-api] Supabase local no disponible — suite omitida.')
}

describe.skipIf(!reachable)('API pública de catalog (index.ts)', () => {
  it('listTechniques devuelve la página de técnicas activas del seed', async () => {
    const page = await listTechniques()
    expect(page.total).toBe(8)
    expect(page.items).toHaveLength(8)
    expect(typeof page.items[0].priceFirstTime).toBe('number')
  })

  it('getTechnique resuelve por id, y devuelve TechniqueNotFound si no existe', async () => {
    const page = await listTechniques()
    const found = await getTechnique(page.items[0].id)
    expect(found.ok).toBe(true)

    const missing = await getTechnique('00000000-0000-0000-0000-000000000000')
    expect(missing.ok).toBe(false)
    if (!missing.ok) {
      expect(missing.error).toBeInstanceOf(TechniqueNotFound)
    }
  })
})
