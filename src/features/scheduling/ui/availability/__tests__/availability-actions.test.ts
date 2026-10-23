import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, err } from '@/shared/result'
import {
  availabilityEntryNotFound,
  closedDateAlreadyExists,
  manualBlockHasAppointment,
  manualBlockOverlap,
  weeklyBlockInvalid,
  weeklyBlockOverlap,
} from '../../../domain/availability-errors'
import { storageFailed } from '../../../domain/errors'
import { schedulingMessages } from '../../messages'
import { CONFIRM_FIELD, CONFIRM_VALUE } from '../constants/confirm-reduction.constants'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  revalidatePath: vi.fn(),
  service: {
    addWeeklyBlock: vi.fn(),
    removeWeeklyBlock: vi.fn(),
    addClosedDate: vi.fn(),
    removeClosedDate: vi.fn(),
    addManualBlock: vi.fn(),
    countAffectedByWeeklyBlock: vi.fn(),
    countAffectedOnDate: vi.fn(),
    countAffectedInRange: vi.fn(),
  },
}))

vi.mock('@/features/auth', () => ({
  getAuthSession: mocks.getAuthSession,
  isStaffRole: (role: string) => role === 'admin' || role === 'superadmin',
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('../services/availability-service', () => ({ availabilityService: mocks.service }))

import {
  addClosedDateAction,
  addManualBlockAction,
  addWeeklyBlockAction,
  removeClosedDateAction,
  removeWeeklyBlockAction,
} from '../actions/availability-actions'
import { initialAvailabilityActionState as idle } from '../types/availability-action-state'

const availabilityMessages = schedulingMessages.availability

function form(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAuthSession.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
  mocks.service.countAffectedByWeeklyBlock.mockResolvedValue(ok(0))
  mocks.service.countAffectedOnDate.mockResolvedValue(ok(0))
  mocks.service.countAffectedInRange.mockResolvedValue(ok(0))
})

describe('acceso — SEC-001 (mensaje amable; la frontera es RLS)', () => {
  it.each([
    ['sin sesión', null],
    ['clienta', { user: { id: 'c-1' }, role: 'cliente' }],
  ])('%s: toda acción responde forbidden sin tocar el servicio', async (_label, session) => {
    mocks.getAuthSession.mockResolvedValue(session)
    const actions = [
      addWeeklyBlockAction(idle, form({ weekday: '1', start: '09:00', end: '12:00' })),
      removeWeeklyBlockAction(idle, form({ id: 'x' })),
      addClosedDateAction(idle, form({ date: '2026-12-25', kind: 'holiday' })),
      removeClosedDateAction(idle, form({ id: 'x' })),
      addManualBlockAction(idle, form({ date: '2026-10-20', start: '09:00', end: '10:00' })),
    ]
    for (const state of await Promise.all(actions)) expect(state.status).toBe('forbidden')
    for (const fn of Object.values(mocks.service)) expect(fn).not.toHaveBeenCalled()
  })
})

describe('addWeeklyBlockAction — criterio 1', () => {
  it('convierte el formulario y guarda', async () => {
    mocks.service.addWeeklyBlock.mockResolvedValue(ok({}))
    const state = await addWeeklyBlockAction(idle, form({ weekday: '1', start: '09:00', end: '12:00' }))
    expect(mocks.service.addWeeklyBlock).toHaveBeenCalledWith({ weekday: 1, startMin: 540, endMin: 720 })
    expect(state).toEqual({ status: 'ok', message: availabilityMessages.weekly.savedOk })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/citas/disponibilidad')
  })

  it('formato inválido no llega al servicio', async () => {
    const state = await addWeeklyBlockAction(idle, form({ weekday: '9', start: 'x', end: '12:00' }))
    expect(state.status).toBe('invalid')
    expect(mocks.service.addWeeklyBlock).not.toHaveBeenCalled()
  })

  it('inicio después del fin y solape tienen su mensaje', async () => {
    mocks.service.addWeeklyBlock.mockResolvedValueOnce(err(weeklyBlockInvalid(['x'])))
    expect(await addWeeklyBlockAction(idle, form({ weekday: '1', start: '12:00', end: '09:00' }))).toEqual({
      status: 'invalid',
      problems: [availabilityMessages.validation.startBeforeEnd],
    })
    mocks.service.addWeeklyBlock.mockResolvedValueOnce(err(weeklyBlockOverlap('a')))
    expect(await addWeeklyBlockAction(idle, form({ weekday: '1', start: '09:00', end: '12:00' }))).toEqual({
      status: 'conflict',
      message: availabilityMessages.weekly.overlap,
    })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('quitar un bloque que ya no existe avisa en vez de fallar', async () => {
    mocks.service.removeWeeklyBlock.mockResolvedValue(err(availabilityEntryNotFound('a')))
    expect(await removeWeeklyBlockAction(idle, form({ id: 'a' }))).toEqual({
      status: 'conflict',
      message: availabilityMessages.notFound,
    })
  })
})

describe('addClosedDateAction — criterio 2', () => {
  it('cierra un feriado con nombre', async () => {
    mocks.service.addClosedDate.mockResolvedValue(ok({}))
    const state = await addClosedDateAction(idle, form({ date: '2026-12-25', kind: 'holiday', label: 'Navidad' }))
    expect(mocks.service.addClosedDate).toHaveBeenCalledWith({ date: '2026-12-25', kind: 'holiday', label: 'Navidad' })
    expect(state).toEqual({ status: 'ok', message: availabilityMessages.closed.savedOk })
  })

  it('un día ya cerrado es conflicto', async () => {
    mocks.service.addClosedDate.mockResolvedValue(err(closedDateAlreadyExists('2026-12-25')))
    expect(await addClosedDateAction(idle, form({ date: '2026-12-25', kind: 'holiday' }))).toEqual({
      status: 'conflict',
      message: availabilityMessages.closed.alreadyClosed,
    })
  })

  it('reabrir un día guarda y revalida', async () => {
    mocks.service.removeClosedDate.mockResolvedValue(ok(undefined))
    expect(await removeClosedDateAction(idle, form({ id: 'c-1' }))).toEqual({
      status: 'ok',
      message: availabilityMessages.closed.removedOk,
    })
  })
})

describe('addManualBlockAction — criterio 3', () => {
  it('convierte la hora del estudio a UTC (DOM-003)', async () => {
    mocks.service.addManualBlock.mockResolvedValue(ok({}))
    await addManualBlockAction(idle, form({ date: '2026-10-20', start: '09:00', end: '11:00', reason: 'banco' }))
    const input = mocks.service.addManualBlock.mock.calls[0][0]
    expect(input.startsAt.toISOString()).toBe('2026-10-20T15:00:00.000Z')
    expect(input.endsAt.toISOString()).toBe('2026-10-20T17:00:00.000Z')
    expect(input.reason).toBe('banco')
  })

  it('un bloqueo que se cruza con otro es conflicto', async () => {
    mocks.service.addManualBlock.mockResolvedValue(err(manualBlockOverlap()))
    expect(await addManualBlockAction(idle, form({ date: '2026-10-20', start: '09:00', end: '11:00' }))).toEqual({
      status: 'conflict',
      message: availabilityMessages.blocks.overlap,
    })
  })

  it('un espacio con una cita no pide confirmación: avisa que hay que resolverla (US-AGE-07, criterio 4)', async () => {
    mocks.service.addManualBlock.mockResolvedValue(err(manualBlockHasAppointment()))
    const state = await addManualBlockAction(
      idle,
      form({ date: '2026-10-20', start: '09:00', end: '11:00', [CONFIRM_FIELD]: CONFIRM_VALUE }),
    )
    expect(state).toEqual({ status: 'conflict', message: availabilityMessages.blocks.hasAppointment })
    expect(mocks.service.countAffectedInRange).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('reducir la disponibilidad con citas agendadas — criterio 9', () => {
  const reductions = [
    {
      name: 'quitar un bloque semanal',
      run: (extra: Record<string, string> = {}) => removeWeeklyBlockAction(idle, form({ id: 'b-1', ...extra })),
      count: mocks.service.countAffectedByWeeklyBlock,
      apply: mocks.service.removeWeeklyBlock,
      fields: { id: 'b-1' },
    },
    {
      name: 'cerrar un día',
      run: (extra: Record<string, string> = {}) =>
        addClosedDateAction(idle, form({ date: '2026-12-25', kind: 'holiday', ...extra })),
      count: mocks.service.countAffectedOnDate,
      apply: mocks.service.addClosedDate,
      fields: { date: '2026-12-25', kind: 'holiday' },
    },
  ]

  it.each(reductions)('$name con citas afectadas: advierte con el número y no aplica nada', async ({ run, count, apply, fields }) => {
    count.mockResolvedValue(ok(3))
    expect(await run()).toEqual({
      status: 'needsConfirmation',
      message: availabilityMessages.affected.warning(3),
      affected: 3,
      fields,
    })
    expect(apply).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it.each(reductions)('$name confirmado: aplica sin volver a contar', async ({ run, count, apply }) => {
    count.mockResolvedValue(ok(3))
    apply.mockResolvedValue(ok({}))
    expect((await run({ [CONFIRM_FIELD]: CONFIRM_VALUE })).status).toBe('ok')
    expect(apply).toHaveBeenCalledTimes(1)
    expect(count).not.toHaveBeenCalled()
  })

  it.each(reductions)('$name sin citas afectadas: aplica sin pedir confirmación', async ({ run, apply }) => {
    apply.mockResolvedValue(ok({}))
    expect((await run()).status).toBe('ok')
    expect(apply).toHaveBeenCalledTimes(1)
  })

  it.each(reductions)('$name con el conteo caído: no aplica nada y lo dice', async ({ run, count, apply }) => {
    count.mockResolvedValue(err(storageFailed('sin conexión')))
    expect(await run()).toEqual({ status: 'conflict', message: availabilityMessages.affected.countFailed })
    expect(apply).not.toHaveBeenCalled()
  })

  it('el aviso usa singular cuando es una sola cita', () => {
    expect(availabilityMessages.affected.warning(1)).toContain('Hay 1 cita agendada')
    expect(availabilityMessages.affected.warning(2)).toContain('Hay 2 citas agendadas')
  })
})
