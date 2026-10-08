import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientAlreadyExempt } from '../../domain/errors'

const mocks = vi.hoisted(() => ({
  isStaff: vi.fn(),
  exemptClient: vi.fn(),
  listClientsAction: vi.fn(),
  getAuthSession: vi.fn(),
}))

vi.mock('@/features/payments/ui/require-staff', () => ({ isStaff: mocks.isStaff }))
vi.mock('@/features/payments', () => ({
  exemptClient: mocks.exemptClient,
  ClientAlreadyExempt,
}))
vi.mock('@/features/clients', () => ({ listClientsAction: mocks.listClientsAction }))
vi.mock('@/features/auth', () => ({ getAuthSession: mocks.getAuthSession }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { exemptClientAction, searchClientsAction } from '../actions'
import { initialExemptClientActionState } from '../action-state'

function form(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return formData
}

const STAFF_ID = '00000000-0000-0000-0000-0000000000a1'
const validFields = { clientId: '00000000-0000-0000-0000-0000000000c1', reason: 'caso especial' }

describe('exemptClientAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isStaff.mockResolvedValue(true)
    mocks.getAuthSession.mockResolvedValue({ user: { id: STAFF_ID } })
    mocks.exemptClient.mockResolvedValue({
      ok: true,
      value: { id: 'exm-1', ...validFields, exemptedBy: STAFF_ID, active: true, createdAt: new Date() },
    })
  })

  it('rechaza una llamada directa sin sesión staff antes de tocar exemptClient', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await exemptClientAction(initialExemptClientActionState, form(validFields))

    expect(state.status).toBe('forbidden')
    expect(mocks.exemptClient).not.toHaveBeenCalled()
  })

  it('valida el formulario antes de llamar a exemptClient', async () => {
    const state = await exemptClientAction(
      initialExemptClientActionState,
      form({ clientId: '', reason: '  ' }),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems).toHaveLength(2)
    expect(mocks.exemptClient).not.toHaveBeenCalled()
  })

  it('otorga la exoneración con la clienta seleccionada y la razón', async () => {
    const state = await exemptClientAction(initialExemptClientActionState, form(validFields))

    expect(state).toMatchObject({ status: 'ok' })
    expect(mocks.exemptClient).toHaveBeenCalledWith({
      clientId: validFields.clientId,
      exemptedBy: STAFF_ID,
      reason: validFields.reason,
    })
  })

  it('un cliente ya exonerado vuelve como estado "conflict", no como excepción', async () => {
    mocks.exemptClient.mockResolvedValueOnce({
      ok: false,
      error: new ClientAlreadyExempt(validFields.clientId),
    })

    const state = await exemptClientAction(initialExemptClientActionState, form(validFields))

    expect(state.status).toBe('conflict')
  })
})

describe('searchClientsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isStaff.mockResolvedValue(true)
  })

  it('sin sesión staff no busca nada', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const clients = await searchClientsAction('maría')

    expect(clients).toEqual([])
    expect(mocks.listClientsAction).not.toHaveBeenCalled()
  })

  it('con la caja vacía no busca nada', async () => {
    const clients = await searchClientsAction('   ')

    expect(clients).toEqual([])
    expect(mocks.listClientsAction).not.toHaveBeenCalled()
  })

  it('delega la búsqueda a listClientsAction y devuelve sus resultados', async () => {
    const found = [{ id: 'c1', fullName: 'María', phone: '', email: '', notes: '' }]
    mocks.listClientsAction.mockResolvedValue({ ok: true, clients: found, total: 1, page: 0, pageSize: 10 })

    const clients = await searchClientsAction('maría')

    expect(clients).toEqual(found)
    expect(mocks.listClientsAction).toHaveBeenCalledWith({ name: 'maría', pageSize: 10 })
  })
})
