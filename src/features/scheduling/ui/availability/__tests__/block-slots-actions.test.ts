import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, err } from '@/shared/result'
import {
  availabilityEntryNotFound,
  manualBlockHasAppointment,
  manualBlockInvalid,
  manualBlockOverlap,
} from '../../../domain/availability-errors'
import { schedulingMessages } from '../../messages'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  revalidatePath: vi.fn(),
  service: {
    blockSlots: vi.fn(),
    removeManualBlock: vi.fn(),
  },
}))

vi.mock('@/features/auth', () => ({
  getAuthSession: mocks.getAuthSession,
  isStaffRole: (role: string) => role === 'admin' || role === 'superadmin',
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('../services/availability-service', () => ({ availabilityService: mocks.service }))

import { blockSlotsAction, removeManualBlockAction } from '../actions/availability-actions'
import { initialAvailabilityActionState as idle } from '../types/availability-action-state'

const availabilityMessages = schedulingMessages.availability
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

describe('blockSlotsAction — US-AGE-07', () => {
  it('manda todos los espacios marcados y refresca el panel (criterio 1)', async () => {
    mocks.service.blockSlots.mockResolvedValue(ok([]))
    const state = await blockSlotsAction(
      idle,
      form({ date: '2026-10-19', slot: ['540', '570', '840'], reason: ' trámite ' }),
    )

    expect(mocks.service.blockSlots).toHaveBeenCalledWith({
      date: '2026-10-19',
      slotStartMinutes: [540, 570, 840],
      reason: 'trámite',
    })
    expect(state).toEqual({ status: 'ok', message: availabilityMessages.picker.savedOk })
    expect(mocks.revalidatePath).toHaveBeenCalledWith(AVAILABILITY_PATH)
  })

  it('sin espacios marcados pide marcar uno, sin tocar el servicio', async () => {
    const state = await blockSlotsAction(idle, form({ date: '2026-10-19' }))
    expect(state).toEqual({ status: 'invalid', problems: [availabilityMessages.validation.pickSlot] })
    expect(mocks.service.blockSlots).not.toHaveBeenCalled()
  })

  it.each([
    ['un espacio con cita avisa que hay que resolverla (criterio 4)', manualBlockHasAppointment(), availabilityMessages.picker.hasAppointment],
    ['un espacio ya bloqueado avisa el solape', manualBlockOverlap(), availabilityMessages.picker.overlap],
    ['un espacio que ya pasó avisa', manualBlockInvalid(['un espacio elegido ya pasó']), availabilityMessages.picker.stale],
  ])('%s y refresca los espacios', async (_label, error, message) => {
    mocks.service.blockSlots.mockResolvedValue(err(error))
    const state = await blockSlotsAction(idle, form({ date: '2026-10-19', slot: '540' }))
    expect(state).toEqual({ status: 'conflict', message })
    expect(mocks.revalidatePath).toHaveBeenCalledWith(AVAILABILITY_PATH)
  })

  it('una clienta recibe forbidden sin tocar el servicio (SEC-001)', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: { id: 'c-1' }, role: 'cliente' })
    const state = await blockSlotsAction(idle, form({ date: '2026-10-19', slot: '540' }))
    expect(state.status).toBe('forbidden')
    expect(mocks.service.blockSlots).not.toHaveBeenCalled()
  })
})

describe('removeManualBlockAction — US-AGE-07, criterio 3', () => {
  it('desbloquea y refresca el panel', async () => {
    mocks.service.removeManualBlock.mockResolvedValue(ok(undefined))
    const state = await removeManualBlockAction(idle, form({ id: 'b-1' }))
    expect(mocks.service.removeManualBlock).toHaveBeenCalledWith('b-1')
    expect(state).toEqual({ status: 'ok', message: availabilityMessages.blocks.removedOk })
  })

  it('un bloqueo que ya no existe avisa', async () => {
    mocks.service.removeManualBlock.mockResolvedValue(err(availabilityEntryNotFound('b-1')))
    expect(await removeManualBlockAction(idle, form({ id: 'b-1' }))).toEqual({
      status: 'conflict',
      message: availabilityMessages.notFound,
    })
  })

  it('sin sesión recibe forbidden sin tocar el servicio (SEC-001)', async () => {
    mocks.getAuthSession.mockResolvedValue(null)
    expect((await removeManualBlockAction(idle, form({ id: 'b-1' }))).status).toBe('forbidden')
    expect(mocks.service.removeManualBlock).not.toHaveBeenCalled()
  })
})
