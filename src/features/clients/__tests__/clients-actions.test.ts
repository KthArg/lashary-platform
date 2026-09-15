import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClientAction } from '../actions/clients-actions'
import { CLIENTS_ERROR_MESSAGES, normalizePhone } from '@/features/clients'

/** US-CLI-05 criterios 1 y 4 en el borde: lo que createClientAction manda a clients_profiles. */
let dbResult: { data: unknown; error: unknown }
const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({
  insert: (row: unknown) => {
    mockInsert(row)
    return { select: () => ({ single: async () => dbResult }) }
  },
}))
const mockRequireAdmin = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ from: mockFrom })) }))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const row = { id: 'c-1', full_name: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: null }
const input = { fullName: '  Ana Solís ', phone: '8888 7777', email: ' ana@correo.com ', notes: '  ' }

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ role: 'admin' })
  dbResult = { data: row, error: null }
})

describe('normalizePhone', () => {
  it('guarda una sola forma por numero: sin codigo es de Costa Rica, con + se respeta', () => {
    for (const phone of ['88887777', '8888 7777', '8888-7777', '+506 8888 7777', '+50688887777']) {
      expect(normalizePhone(phone)).toBe('+50688887777')
    }
    expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567')
  })
})

describe('createClientAction', () => {
  it('criterios 1 y 4: inserta los datos limpios, con +506 y el telefono verificado, sin cuenta', async () => {
    const result = await createClientAction(input)
    expect(mockFrom).toHaveBeenCalledWith('clients_profiles')
    expect(mockInsert).toHaveBeenCalledWith({
      full_name: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: null, phone_verified: true,
    })
    expect(result).toEqual({ ok: true, client: { id: 'c-1', fullName: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: '' } })
  })

  it('rechaza datos invalidos o incompletos sin tocar la base', async () => {
    for (const bad of [{ ...input, email: 'no-es-correo' }, {} as typeof input]) {
      expect(await createClientAction(bad)).toEqual({ ok: false, error: CLIENTS_ERROR_MESSAGES.formHasErrors })
    }
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('exige sesion de administradora antes de tocar la base', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT:/admin'))
    await expect(createClientAction(input)).rejects.toThrow('NEXT_REDIRECT')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('si la base falla no reporta exito ni filtra el detalle del error', async () => {
    dbResult = { data: null, error: { message: 'new row violates row-level security policy' } }
    expect(await createClientAction(input)).toEqual({ ok: false, error: CLIENTS_ERROR_MESSAGES.saveFailed })
  })
})
