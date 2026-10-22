import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, err } from '@/shared/result'
import { availabilityEntryNotFound, manualBlockInvalid } from '../../../domain/availability-errors'
import { schedulingMessages } from '../../messages'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  revalidatePath: vi.fn(),
  service: {
    releaseManualBlockTail: vi.fn(),
  },
}))

vi.mock('@/features/auth', () => ({
  getAuthSession: mocks.getAuthSession,
  isStaffRole: (role: string) => role === 'admin' || role === 'superadmin',
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('../services/availability-service', () => ({ availabilityService: mocks.service }))

import { releaseManualBlockAction } from '../actions/availability-actions'
import { initialAvailabilityActionState as idle } from '../types/availability-action-state'

const releaseMessages = schedulingMessages.availability.blocks.release
const AVAILABILITY_PATH = '/admin/citas/disponibilidad'
const ENDS_AT = '2026-10-19T17:00:00.000Z'

function form(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [name, value] of Object.entries(fields)) formData.append(name, value)
  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAuthSession.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
})

describe('releaseManualBlockAction — US-AGE-07, criterio 3', () => {
  it('manda el bloqueo, los espacios y el fin que se vio, y refresca el panel', async () => {
    mocks.service.releaseManualBlockTail.mockResolvedValue(ok({ id: 'b-1', endsAtMs: 0 }))
    const state = await releaseManualBlockAction(idle, form({ id: 'b-1', steps: '2', expectedEndsAt: ENDS_AT }))

    expect(mocks.service.releaseManualBlockTail).toHaveBeenCalledWith({
      id: 'b-1',
      steps: 2,
      expectedEndsAt: new Date(ENDS_AT),
    })
    expect(state).toEqual({ status: 'ok', message: releaseMessages.savedOk })
    expect(mocks.revalidatePath).toHaveBeenCalledWith(AVAILABILITY_PATH)
  })

  it.each([
    ['un bloqueo que cambió', manualBlockInvalid(['el bloqueo cambió desde que se abrió el panel'])],
    ['un bloqueo que ya no existe', availabilityEntryNotFound('b-1')],
  ])('%s avisa y refresca la lista', async (_label, error) => {
    mocks.service.releaseManualBlockTail.mockResolvedValue(err(error))
    const state = await releaseManualBlockAction(idle, form({ id: 'b-1', steps: '1', expectedEndsAt: ENDS_AT }))

    expect(state).toEqual({ status: 'conflict', message: releaseMessages.stale })
    expect(mocks.revalidatePath).toHaveBeenCalledWith(AVAILABILITY_PATH)
  })

  it('datos que no son válidos piden elegir cuánto liberar, sin tocar el servicio', async () => {
    const state = await releaseManualBlockAction(idle, form({ id: 'b-1', steps: '', expectedEndsAt: ENDS_AT }))

    expect(state.status).toBe('invalid')
    expect(mocks.service.releaseManualBlockTail).not.toHaveBeenCalled()
  })

  it('una clienta recibe forbidden sin tocar el servicio (SEC-001)', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: { id: 'c-1' }, role: 'cliente' })
    const state = await releaseManualBlockAction(idle, form({ id: 'b-1', steps: '1', expectedEndsAt: ENDS_AT }))

    expect(state.status).toBe('forbidden')
    expect(mocks.service.releaseManualBlockTail).not.toHaveBeenCalled()
  })
})
