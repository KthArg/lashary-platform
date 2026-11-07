import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CONFIRMATION_POLICY_PATH } from '../constants/confirmation-policy-strings'
import { changeConfirmationDeadlineAction } from '../actions/confirmation-policy-actions'
import type { ConfirmationPolicyActionState } from '../types/confirmation-policy.types'

let serviceResult: ConfirmationPolicyActionState
const mockChange = vi.fn(async (_fields: Record<string, unknown>) => serviceResult)
const mockRevalidatePath = vi.fn()

vi.mock('../services/confirmation-policy-service', () => ({
  confirmationPolicyService: { change: (fields: Record<string, unknown>) => mockChange(fields) },
}))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidatePath(path) }))

const IDLE: ConfirmationPolicyActionState = { status: 'idle' }
const formWith = (hours: string) => {
  const formData = new FormData()
  formData.set('hours', hours)
  return formData
}

beforeEach(() => {
  mockChange.mockClear()
  mockRevalidatePath.mockClear()
})

describe('changeConfirmationDeadlineAction', () => {
  it('entrega al servicio solo los campos del formulario y devuelve su respuesta', async () => {
    serviceResult = { status: 'ok', message: 'El plazo quedó en 24 horas.' }

    expect(await changeConfirmationDeadlineAction(IDLE, formWith('24'))).toEqual(serviceResult)
    expect(mockChange).toHaveBeenCalledWith({ hours: '24' })
  })

  it('si se guardó refresca la pantalla de la política', async () => {
    serviceResult = { status: 'ok', message: 'x' }

    await changeConfirmationDeadlineAction(IDLE, formWith('24'))

    expect(mockRevalidatePath).toHaveBeenCalledWith(CONFIRMATION_POLICY_PATH)
  })

  it.each(['invalid', 'failed'] as const)('con el estado %s no refresca nada', async (status) => {
    serviceResult = { status, message: 'x' }

    await changeConfirmationDeadlineAction(IDLE, formWith('24'))

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
