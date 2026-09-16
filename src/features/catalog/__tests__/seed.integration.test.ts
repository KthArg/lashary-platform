import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Test de integración: requiere Supabase local corriendo y NEXT_PUBLIC_SUPABASE_* en .env.local
// (o en el entorno del job de CI). Sin conexión, la suite se salta con aviso.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const EXPECTED_FAMILIES = [
  'lash_classic',
  'lash_volume',
  'lash_extra_volume',
  'brow_design',
  'brow_lamination',
  'henna',
  'waxing',
  'lips',
] as const

let reachable = false
if (SUPABASE_URL && ANON_KEY) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: ANON_KEY },
    })
    reachable = res.status < 500
  } catch {
    reachable = false
  }
}

if (!reachable) {
  console.warn(
    '[catalog/seed] Supabase local no disponible — suite omitida. Definí NEXT_PUBLIC_SUPABASE_* en .env.local y corré "npx supabase start".',
  )
}

describe.skipIf(!reachable)('seed del catálogo — criterio 2 de US-AGE-08', () => {
  let supabase: SupabaseClient

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, ANON_KEY)
  })

  it('carga una técnica por cada una de las 8 familias de servicio', async () => {
    const { data, error } = await supabase
      .from('catalog_techniques')
      .select('family')

    expect(error).toBeNull()
    const families = new Set((data ?? []).map((r) => r.family))
    for (const f of EXPECTED_FAMILIES) {
      expect(families).toContain(f)
    }
    expect(families.size).toBe(EXPECTED_FAMILIES.length)
  })

  it('toda técnica del seed tiene precio y anticipo enteros, y texto de cuidados no vacío', async () => {
    const { data, error } = await supabase
      .from('catalog_techniques')
      .select('price_first_time, price_retouch, deposit, aftercare_text')

    expect(error).toBeNull()
    for (const row of data ?? []) {
      expect(Number.isInteger(row.price_first_time)).toBe(true)
      expect(row.price_first_time).toBeGreaterThan(0)
      expect(Number.isInteger(row.deposit)).toBe(true)
      expect(row.deposit).toBeGreaterThanOrEqual(0)
      expect(String(row.aftercare_text).trim().length).toBeGreaterThan(0)
      if (row.price_retouch !== null) {
        expect(row.price_retouch).toBeGreaterThan(0)
      }
    }
  })
})
