import { describe, expect, it } from 'vitest'
import { closedDateFormSchema, manualBlockFormSchema, weeklyAvailabilityFormSchema } from '../schema'
import { schedulingMessages } from '../messages'

const v = schedulingMessages.validation

const problemsOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.message)

describe('esquemas del panel', () => {
  it('responde en español cuando faltan los campos, incluido el recurso oculto', () => {
    expect(problemsOf(weeklyAvailabilityFormSchema.safeParse({}))).toEqual([
      v.resourceId,
      v.dayOfWeek,
      v.startTime,
      v.endTime,
    ])
  })

  it('rechaza un día que no es número con el mensaje propio', () => {
    const result = weeklyAvailabilityFormSchema.safeParse({
      resourceId: 'r1',
      dayOfWeek: 'lunes',
      startTime: '09:00',
      endTime: '10:00',
    })
    expect(problemsOf(result)).toEqual([v.dayOfWeek])
  })

  it('convierte el motivo vacío en undefined', () => {
    const result = closedDateFormSchema.safeParse({ resourceId: 'r1', closedDate: '2026-12-25', reason: '  ' })
    expect(result.success && result.data.reason).toBeUndefined()
  })

  it('convierte las fechas del bloqueo a instantes de Costa Rica y rechaza las inválidas', () => {
    const ok = manualBlockFormSchema.safeParse({
      resourceId: 'r1',
      startsAt: '2026-10-01T14:00',
      endsAt: '2026-10-01T15:00',
    })
    expect(ok.success && ok.data.startsAt.toISOString()).toBe('2026-10-01T20:00:00.000Z')

    const bad = manualBlockFormSchema.safeParse({ resourceId: 'r1', startsAt: 'mañana', endsAt: '2026-10-01T15:00' })
    expect(problemsOf(bad)).toEqual([v.startsAt])
  })
})
