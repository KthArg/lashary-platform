import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RESCHEDULE_POLICY_PATH } from '../constants/reschedule-policy-strings'
import { changeRescheduleLimitAction } from '../actions/reschedule-policy-actions'
import { initialReschedulePolicyActionState, type ReschedulePolicyActionState } from '../types/reschedule-policy.types'

let serviceResult: ReschedulePolicyActionState
const mockChange = vi.fn(async (_rawFields: unknown) => serviceResult)
const mockRevalidatePath = vi.fn()

vi.mock('../services/reschedule-policy-service', () => ({
  reschedulePolicyService: { change: (rawFields: unknown) => mockChange(rawFields) },
}))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidatePath(path) }))

beforeEach(() => {
  mockChange.mockClear()
  mockRevalidatePath.mockClear()
})

const formWith = (max: string) => {
  const formData = new FormData()
  formData.set('max', max)
  return formData
}

describe('changeRescheduleLimitAction', () => {
  it('entrega los campos al servicio y, si se guardó, refresca la pantalla', async () => {
    serviceResult = { status: 'ok', message: 'listo' }

    expect(await changeRescheduleLimitAction(initialReschedulePolicyActionState, formWith('2'))).toEqual(serviceResult)
    expect(mockChange).toHaveBeenCalledWith({ max: '2' })
    expect(mockRevalidatePath).toHaveBeenCalledWith(RESCHEDULE_POLICY_PATH)
  })

  it.each(['invalid', 'failed'] as const)('si el estado es %s no refresca nada', async (status) => {
    serviceResult = { status, message: 'x' }

    expect(await changeRescheduleLimitAction(initialReschedulePolicyActionState, formWith('99'))).toEqual(serviceResult)
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
