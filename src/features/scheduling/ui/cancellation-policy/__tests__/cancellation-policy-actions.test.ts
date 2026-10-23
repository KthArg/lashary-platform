import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CANCELLATION_POLICY_PATH } from '../constants/cancellation-policy-strings'
import { changeCancellationWindowAction } from '../actions/cancellation-policy-actions'
import type { CancellationPolicyActionState } from '../types/cancellation-policy.types'

let serviceResult: CancellationPolicyActionState
const mockChange = vi.fn(async (_fields: Record<string, unknown>) => serviceResult)
const mockRevalidatePath = vi.fn()

vi.mock('../services/cancellation-policy-service', () => ({
  cancellationPolicyService: { change: (fields: Record<string, unknown>) => mockChange(fields) },
}))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidatePath(path) }))

const IDLE: CancellationPolicyActionState = { status: 'idle' }
const formWith = (hours: string) => {
  const formData = new FormData()
  formData.set('hours', hours)
  return formData
}

beforeEach(() => {
  mockChange.mockClear()
  mockRevalidatePath.mockClear()
})

describe('changeCancellationWindowAction', () => {
  it('entrega al servicio solo los campos del formulario y devuelve su respuesta', async () => {
    serviceResult = { status: 'ok', message: 'La ventana quedó en 24 horas.' }

    expect(await changeCancellationWindowAction(IDLE, formWith('24'))).toEqual(serviceResult)
    expect(mockChange).toHaveBeenCalledWith({ hours: '24' })
  })

  it('si se guardó refresca la pantalla de la política', async () => {
    serviceResult = { status: 'ok', message: 'x' }

    await changeCancellationWindowAction(IDLE, formWith('24'))

    expect(mockRevalidatePath).toHaveBeenCalledWith(CANCELLATION_POLICY_PATH)
  })

  it.each(['invalid', 'failed'] as const)('con el estado %s no refresca nada', async (status) => {
    serviceResult = { status, message: 'x' }

    await changeCancellationWindowAction(IDLE, formWith('24'))

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
