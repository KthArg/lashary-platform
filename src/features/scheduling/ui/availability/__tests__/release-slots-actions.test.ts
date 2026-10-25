import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, err } from '@/shared/result'
import {
  manualBlockHasAppointment,
  manualBlockInvalid,
  manualBlockNotBlocked,
} from '../../../domain/availability-errors'
import { schedulingMessages } from '../../messages'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  revalidatePath: vi.fn(),
  service: {
    releaseSlots: vi.fn(),
  },
}))

vi.mock('@/features/auth', () => ({
  getAuthSession: mocks.getAuthSession,
  isStaffRole: (role: string) => role === 'admin' || role === 'superadmin',
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('../services/availability-service', () => ({ availabilityService: mocks.service }))

import { releaseSlotsAction } from '../actions/availability-actions'
import { initialAvailabilityActionState as idle } from '../types/availability-action-state'

const pickerMessages = schedulingMessages.availability.picker
const AVAILABILITY_PATH = '/admin/citas/disponibilidad'

function form(fields: Record<string, string | string[]>): FormData {
  const formData = new FormData()
  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) formData.append(name, item)
  }
  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAuthSession.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
})

describe('releaseSlotsAction — US-AGE-07, criterio 3', () => {
  it('manda todos los espacios marcados, también los que no son seguidos, y refresca el panel', async () => {
    mocks.service.releaseSlots.mockResolvedValue(ok(undefined))
    const state = await releaseSlotsAction(idle, form({ date: '2026-10-19', slot: ['570', '630', '840'] }))

    expect(mocks.service.releaseSlots).toHaveBeenCalledWith({ date: '2026-10-19', slotStartMinutes: [570, 630, 840] })
    expect(state).toEqual({ status: 'ok', message: pickerMessages.releasedOk })
    expect(mocks.revalidatePath).toHaveBeenCalledWith(AVAILABILITY_PATH)
  })

  it('sin espacios marcados o con un campo vacío pide marcar uno, sin tocar el servicio', async () => {
    const withoutSlots: Array<Record<string, string>> = [{ date: '2026-10-19' }, { date: '2026-10-19', slot: '' }]
    for (const fields of withoutSlots) {
      const state = await releaseSlotsAction(idle, form(fields))
      expect(state).toEqual({ status: 'invalid', problems: [schedulingMessages.availability.validation.pickSlot] })
    }
    expect(mocks.service.releaseSlots).not.toHaveBeenCalled()
  })

  it.each([
    [
      'un espacio que ya estaba liberado avisa «ya estaba liberado, revisá la lista»',
      manualBlockNotBlocked(),
      { status: 'conflict', message: pickerMessages.alreadyReleased },
    ],
    [
      'lo que sobra con una cita activa pide resolver la cita y enlaza a las citas (criterio 4)',
      manualBlockHasAppointment(),
      {
        status: 'conflict',
        message: pickerMessages.releaseHasAppointment,
        link: { href: '/admin/citas', label: pickerMessages.goToAppointments },
      },
    ],
    [
      'un espacio que ya no se ofrece avisa',
      manualBlockInvalid(['un espacio elegido no se ofrece ese día']),
      { status: 'conflict', message: pickerMessages.releaseStale },
    ],
  ])('%s y refresca los espacios', async (_label, error, expected) => {
    mocks.service.releaseSlots.mockResolvedValue(err(error))
    const state = await releaseSlotsAction(idle, form({ date: '2026-10-19', slot: '570' }))

    expect(state).toEqual(expected)
    expect(mocks.revalidatePath).toHaveBeenCalledWith(AVAILABILITY_PATH)
  })

  it('una clienta recibe forbidden sin tocar el servicio (SEC-001)', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: { id: 'c-1' }, role: 'cliente' })
    const state = await releaseSlotsAction(idle, form({ date: '2026-10-19', slot: '570' }))

    expect(state.status).toBe('forbidden')
    expect(mocks.service.releaseSlots).not.toHaveBeenCalled()
  })
})
