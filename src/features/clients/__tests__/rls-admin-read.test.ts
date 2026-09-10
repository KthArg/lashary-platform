import { describe, it, expect } from 'vitest'

/**
 * SEC-002 — aislamiento de public.clients_profiles con `clients_profiles_select_admin`
 * (migracion 20260910000000). Replica la semantica PERMISIVA de Postgres: las politicas de SELECT
 * se combinan con OR, asi que la de admin no puede ampliar lo que ve una clienta.
 *
 * LIMITE DECLARADO, registrado como deuda en SPEC.md: MODELA las politicas en TypeScript, no
 * ejecuta Postgres. Cerrar la brecha exige supabase local en CI con dos tokens reales.
 */

// USING (auth.uid() = user_id)
const selectOwn = (uid: string, rowUserId: string | null) => uid === rowUserId
// USING (public.auth_is_admin())
const selectAdmin = (isAdmin: boolean) => isAdmin
const canSelect = (uid: string, isAdmin: boolean, rowUserId: string | null) =>
  selectOwn(uid, rowUserId) || selectAdmin(isAdmin)

const clienteA = { id: '11111111-1111-1111-1111-111111111111', isAdmin: false }
const clienteB = { id: '22222222-2222-2222-2222-222222222222', isAdmin: false }
const admin = { id: '33333333-3333-3333-3333-333333333333', isAdmin: true }

describe('SEC-002: clients_profiles_select_admin no afloja el aislamiento entre clientas', () => {
  it('la clienta A sigue sin poder leer el perfil de la clienta B', () => {
    expect(canSelect(clienteA.id, clienteA.isAdmin, clienteB.id)).toBe(false)
  })

  it('la clienta A sigue leyendo su propio perfil', () => {
    expect(canSelect(clienteA.id, clienteA.isAdmin, clienteA.id)).toBe(true)
  })

  it('la clienta A no puede leer una ficha creada a mano (user_id NULL)', () => {
    expect(canSelect(clienteA.id, clienteA.isAdmin, null)).toBe(false)
  })

  it('la administradora lee perfiles ajenos: es lo que la politica nueva habilita', () => {
    expect(canSelect(admin.id, admin.isAdmin, clienteA.id)).toBe(true)
    expect(canSelect(admin.id, admin.isAdmin, clienteB.id)).toBe(true)
  })

  it('la administradora lee las fichas sin cuenta, que es de donde sale la lista de /admin/clients', () => {
    expect(canSelect(admin.id, admin.isAdmin, null)).toBe(true)
  })

  it('la politica de admin solo agrega SELECT: escribir sigue exigiendo ser la duena de la fila', () => {
    // Sin politicas de INSERT/UPDATE de admin a proposito: la escritura entra con su server action.
    const canUpdate = (uid: string, rowUserId: string | null) => uid === rowUserId
    expect(canUpdate(admin.id, clienteA.id)).toBe(false)
    expect(canUpdate(admin.id, null)).toBe(false)
  })
})
