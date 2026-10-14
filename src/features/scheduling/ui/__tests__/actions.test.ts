import { beforeEach, describe, expect, it, vi } from 'vitest'

const isStaff = vi.fn()
const revalidatePath = vi.fn()
const saveWeeklyAvailability = vi.fn(async (block: unknown) => block)
const saveClosedDate = vi.fn()
const saveManualBlock = vi.fn(async (block: unknown) => block)

vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('../require-staff', () => ({ isStaff }))
vi.mock('../../db/supabase-scheduling-repository', () => ({
  supabaseSchedulingRepository: { saveWeeklyAvailability, saveClosedDate, saveManualBlock },
}))

const { defineClosedDateAction, defineManualBlockAction, defineWeeklyAvailabilityAction } = await import('../actions')
const { closedDateAlreadyExistsError } = await import('../../domain/errors')
const { initialActionState } = await import('../action-state')
const { schedulingMessages } = await import('../messages')

const form = (fields: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

const weekly = (overrides: Record<string, string> = {}) =>
  form({ resourceId: 'r1', dayOfWeek: '1', startTime: '09:00', endTime: '13:00', ...overrides })

describe('Server Actions del panel de disponibilidad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isStaff.mockResolvedValue(true)
  })

  it('sin rol de staff responde forbidden, sin guardar ni revalidar', async () => {
    isStaff.mockResolvedValue(false)
    const state = await defineWeeklyAvailabilityAction(initialActionState, weekly())
    expect(state).toEqual({ status: 'forbidden', message: schedulingMessages.shared.accessDenied })
    expect(saveWeeklyAvailability).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('un formulario inválido devuelve los mensajes de Zod en español y no guarda', async () => {
    const state = await defineWeeklyAvailabilityAction(initialActionState, weekly({ dayOfWeek: '', startTime: '' }))
    expect(state).toEqual({
      status: 'invalid',
      problems: [schedulingMessages.validation.dayOfWeek, schedulingMessages.validation.startTime],
    })
    expect(saveWeeklyAvailability).not.toHaveBeenCalled()
  })

  it('un error del dominio se muestra con el texto de schedulingMessages', async () => {
    const state = await defineWeeklyAvailabilityAction(initialActionState, weekly({ startTime: '13:00', endTime: '09:00' }))
    expect(state).toEqual({ status: 'invalid', problems: [schedulingMessages.errors.invalidTimeRange] })
    expect(saveWeeklyAvailability).not.toHaveBeenCalled()
  })

  it('un feriado repetido responde con el aviso y la fecha formateada, sin romper', async () => {
    saveClosedDate.mockRejectedValue(closedDateAlreadyExistsError('2026-12-25'))
    const state = await defineClosedDateAction(initialActionState, form({ resourceId: 'r1', closedDate: '2026-12-25' }))
    expect(state.status).toBe('invalid')
    expect(state.problems?.[0].replace(/\s/g, ' ')).toBe('Ya existe un día no laborable registrado para el 25 dic 2026.')
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('un guardado correcto revalida el panel y responde ok con su mensaje', async () => {
    const state = await defineWeeklyAvailabilityAction(initialActionState, weekly())
    expect(state).toEqual({ status: 'ok', message: schedulingMessages.weeklyAvailability.form.saved })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/citas')
    expect(saveWeeklyAvailability).toHaveBeenCalledOnce()
  })

  it('el bloqueo manual llega a la base con las horas ya convertidas a instantes de Costa Rica', async () => {
    const state = await defineManualBlockAction(
      initialActionState,
      form({ resourceId: 'r1', startsAt: '2026-10-01T14:00', endsAt: '2026-10-01T15:00' })
    )
    expect(state).toEqual({ status: 'ok', message: schedulingMessages.manualBlocks.form.saved })
    const saved = saveManualBlock.mock.calls[0][0] as { startsAt: Date; endsAt: Date }
    expect(saved.startsAt.toISOString()).toBe('2026-10-01T20:00:00.000Z')
    expect(saved.endsAt.toISOString()).toBe('2026-10-01T21:00:00.000Z')
  })
})
