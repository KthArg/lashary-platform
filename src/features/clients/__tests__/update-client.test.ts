import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateClientAction } from '../actions/clients-actions'
import { CLIENTS_ERROR_MESSAGES } from '@/features/clients'

/** US-CLI-05 criterio 2 en el borde: lo que updateClientAction manda a clients_profiles. */
let phoneLookup: { data: unknown; error: unknown }
let updateResult: { data: unknown; error: unknown }
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn(() => ({
  select: () => ({ like: async () => phoneLookup }),
  update: (patch: unknown) => {
    mockUpdate(patch)
    return {
      eq: (column: string, value: string) => {
        mockEq(column, value)
        return { select: () => ({ maybeSingle: async () => updateResult }) }
      },
    }
  },
}))
const mockRequireAdmin = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ from: mockFrom })) }))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const row = { id: 'c-1', full_name: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: 'Nueva nota' }
const input = { fullName: ' Ana Solís ', phone: '8888-7777', email: 'ana@correo.com', notes: 'Nueva nota' }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ role: 'admin' })
  phoneLookup = { data: [], error: null }
  updateResult = { data: row, error: null }
})

describe('updateClientAction', () => {
  it('criterio 2: actualiza esa clienta por id con los datos limpios, sin tocar phone_verified', async () => {
    const result = await updateClientAction('c-1', input)
    expect(mockEq).toHaveBeenCalledWith('id', 'c-1')
    const [patch] = mockUpdate.mock.calls[0]
    expect(patch).toMatchObject({ full_name: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: 'Nueva nota' })
    expect(patch).not.toHaveProperty('phone_verified')
    expect(typeof patch.updated_at).toBe('string')
    expect(result).toEqual({ ok: true, client: { id: 'c-1', fullName: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: 'Nueva nota' } })
  })

  it('criterio 3: guardar sin cambiar su propio telefono no cuenta como duplicado', async () => {
    phoneLookup = { data: [{ id: 'c-1', phone: '+50688887777' }], error: null }
    expect((await updateClientAction('c-1', input)).ok).toBe(true)
  })

  it('criterio 3: no guarda si el telefono ya es de otra clienta', async () => {
    phoneLookup = { data: [{ id: 'c-2', phone: '+506 8888 7777' }], error: null }
    expect(await updateClientAction('c-1', input)).toEqual({ ok: false, error: CLIENTS_ERROR_MESSAGES.phoneTaken })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('SEC-005: un id vacio o que RLS no deja ver no finge exito', async () => {
    expect(await updateClientAction('', input)).toEqual({ ok: false, error: CLIENTS_ERROR_MESSAGES.clientNotFound })
    expect(mockFrom).not.toHaveBeenCalled()
    updateResult = { data: null, error: null }
    expect(await updateClientAction('de-otra', input)).toEqual({ ok: false, error: CLIENTS_ERROR_MESSAGES.clientNotFound })
  })

  it('rechaza datos invalidos sin tocar la base, y exige sesion de administradora', async () => {
    expect(await updateClientAction('c-1', { ...input, email: 'no-es-correo' })).toEqual({ ok: false, error: CLIENTS_ERROR_MESSAGES.formHasErrors })
    expect(mockFrom).not.toHaveBeenCalled()
    mockRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT:/admin'))
    await expect(updateClientAction('c-1', input)).rejects.toThrow('NEXT_REDIRECT')
  })
})
