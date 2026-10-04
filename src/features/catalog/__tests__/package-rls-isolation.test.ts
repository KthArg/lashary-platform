import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// SEC-002 — Test de aislamiento RLS para catalog_packages y catalog_package_techniques.
//
// Igual postura que catalog_techniques (__tests__/rls-isolation.test.ts): catálogo compartido
// del estudio, lectura pública intencional, escritura solo para staff (público.auth_is_staff()).
// Se salta si Supabase local no está disponible; en CI (job-tests-reales) sí lo está.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const PACKAGES = 'catalog_packages'
const BRIDGE = 'catalog_package_techniques'

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
  console.warn('[catalog/rls] Supabase local no disponible — suite omitida.')
}

async function signUpClienta(): Promise<SupabaseClient> {
  const anon = createClient(URL, ANON_KEY)
  const email = `rls-test-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anon.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session) {
    throw new Error(
      `no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`,
    )
  }
  return createClient(URL, ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  })
}

const packageWriteAttempt = { name: 'RLS intento de escritura', price: 1, is_active: true }

describe.skipIf(!reachable)(
  'SEC-002 — aislamiento RLS de catalog_packages / catalog_package_techniques',
  () => {
    let anon: SupabaseClient
    let clienta: SupabaseClient
    let samplePackageId = ''
    let sampleTechniqueId = ''
    let initialPackageCount = 0
    let initialBridgeCount = 0

    beforeAll(async () => {
      anon = createClient(URL, ANON_KEY)
      clienta = await signUpClienta()

      const { data: pkgs } = await anon.from(PACKAGES).select('id').limit(1)
      samplePackageId = pkgs?.[0]?.id ?? ''

      const { data: bridge } = await anon
        .from(BRIDGE)
        .select('technique_id')
        .eq('package_id', samplePackageId)
        .limit(1)
      sampleTechniqueId = bridge?.[0]?.technique_id ?? ''

      const { count: pkgCount } = await anon
        .from(PACKAGES)
        .select('*', { count: 'exact', head: true })
      initialPackageCount = pkgCount ?? 0

      const { count: bridgeCount } = await anon
        .from(BRIDGE)
        .select('*', { count: 'exact', head: true })
      initialBridgeCount = bridgeCount ?? 0

      // Falla ruidosamente si el seed no está cargado — sin esto, los asserts de "no puede
      // escribir" pasarían igual con un .eq('id', '') que no ejerce RLS de verdad.
      if (!samplePackageId || !sampleTechniqueId || initialPackageCount === 0) {
        throw new Error('setup: el seed de catalog_packages no está cargado')
      }
    })

    it('lectura pública intencional: anón y clienta autenticada pueden SELECT en ambas tablas', async () => {
      for (const client of [anon, clienta]) {
        const pkgs = await client.from(PACKAGES).select('id')
        const bridge = await client.from(BRIDGE).select('package_id')
        expect(pkgs.error).toBeNull()
        expect(bridge.error).toBeNull()
        expect((pkgs.data ?? []).length).toBeGreaterThan(0)
        expect((bridge.data ?? []).length).toBeGreaterThan(0)
      }
    })

    it('token anónimo NO puede INSERT / UPDATE / DELETE en catalog_packages', async () => {
      const insert = await anon.from(PACKAGES).insert(packageWriteAttempt).select()
      expect(insert.error).not.toBeNull()

      const update = await anon
        .from(PACKAGES)
        .update({ price: 999_999 })
        .eq('id', samplePackageId)
        .select()
      expect(update.data ?? []).toHaveLength(0)

      const remove = await anon.from(PACKAGES).delete().eq('id', samplePackageId).select()
      expect(remove.data ?? []).toHaveLength(0)
    })

    it('clienta autenticada sin rol de staff NO puede INSERT / UPDATE / DELETE en catalog_packages', async () => {
      const insert = await clienta.from(PACKAGES).insert(packageWriteAttempt).select()
      expect(insert.error).not.toBeNull()

      const update = await clienta
        .from(PACKAGES)
        .update({ price: 999_999 })
        .eq('id', samplePackageId)
        .select()
      expect(update.data ?? []).toHaveLength(0)

      const remove = await clienta.from(PACKAGES).delete().eq('id', samplePackageId).select()
      expect(remove.data ?? []).toHaveLength(0)
    })

    it('ni anón ni clienta pueden INSERT / DELETE en catalog_package_techniques', async () => {
      for (const client of [anon, clienta]) {
        const insert = await client
          .from(BRIDGE)
          .insert({ package_id: samplePackageId, technique_id: sampleTechniqueId })
          .select()
        expect(insert.error).not.toBeNull()

        const remove = await client
          .from(BRIDGE)
          .delete()
          .eq('package_id', samplePackageId)
          .eq('technique_id', sampleTechniqueId)
          .select()
        expect(remove.data ?? []).toHaveLength(0)
      }
    })

    it('tras los intentos, los conteos no cambiaron (nadie insertó ni borró)', async () => {
      const { count: pkgCount } = await anon
        .from(PACKAGES)
        .select('*', { count: 'exact', head: true })
      const { count: bridgeCount } = await anon
        .from(BRIDGE)
        .select('*', { count: 'exact', head: true })
      expect(pkgCount).toBe(initialPackageCount)
      expect(bridgeCount).toBe(initialBridgeCount)
    })
  },
)
