import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { fixedClock } from '@/shared/testing/fixed-clock'
import type { DayAvailabilityRepository } from '../../../application/availability-ports'
import { SLOT_INTERVAL_MIN } from '../../../domain/day-slots'
import type { RescheduleQuote } from '../../../application/ports'
import { appointmentNotReschedulable, clientNotRegistered, storageFailed } from '../../../domain/errors'
import { loadReschedulePage, type ReschedulePageDeps } from '../utils/load-reschedule-page'

const RESOURCE = 'r-1'
const APPOINTMENT_ID = '00000000-0000-0000-0000-00000000ea01'
const OCCUPIED_MINUTES = 75
const OPEN_FROM_MIN = 540
const OPEN_UNTIL_MIN = 660
const quote: RescheduleQuote = {
  startsAtMs: Date.parse('2026-10-26T15:00:00Z'),
  endsAtMs: Date.parse('2026-10-26T16:00:00Z'),
  occupiedMinutes: OCCUPIED_MINUTES,
  techniqueName: 'Clásicas',
  status: 'approved',
  rescheduleCount: 0,
  maxReschedules: 1,
  windowHours: 48,
  blockedBy: null,
}

function createDeps(overrides: Partial<ReschedulePageDeps> = {}) {
  const busyCalls: unknown[][] = []
  const quoted: string[] = []
  const repo: DayAvailabilityRepository = {
    async listOpenHours() {
      return [{ startMin: OPEN_FROM_MIN, endMin: OPEN_UNTIL_MIN }]
    },
    async listBusyRanges(...args) {
      busyCalls.push(args)
      return []
    },
  }
  const deps: ReschedulePageDeps = {
    isClient: async () => true,
    quote: async (appointmentId) => (quoted.push(appointmentId), ok(quote)),
    repo,
    clock: fixedClock('2026-10-19T14:00:00Z'),
    resourceId: RESOURCE,
    ...overrides,
  }
  return { deps, busyCalls, quoted }
}

describe('loadReschedulePage', () => {
  it('sin sesión de clienta: forbidden, sin cotizar ni leer la agenda', async () => {
    const { deps, busyCalls, quoted } = createDeps({ isClient: async () => false })

    expect(await loadReschedulePage(APPOINTMENT_ID, {}, deps)).toEqual({ status: 'forbidden' })
    expect(quoted).toEqual([])
    expect(busyCalls).toEqual([])
  })

  it('una cita que no es un identificador no llega a la base', async () => {
    const { deps, quoted } = createDeps()

    expect(await loadReschedulePage('no-es-un-uuid', {}, deps)).toEqual({ status: 'notReschedulable' })
    expect(quoted).toEqual([])
  })

  it.each([
    [clientNotRegistered(), { status: 'forbidden' }],
    [appointmentNotReschedulable(APPOINTMENT_ID), { status: 'notReschedulable' }],
    [storageFailed('connection refused'), { status: 'failed' }],
  ])('el error %# de la cotización se traduce a su estado de pantalla', async (error, expected) => {
    const { deps } = createDeps({ quote: async () => err(error) })

    expect(await loadReschedulePage(APPOINTMENT_ID, {}, deps)).toEqual(expected)
  })

  it.each(['outside_window', 'limit_reached'] as const)(
    'una cita bloqueada (%s) muestra el motivo y no lee la agenda',
    async (blockedBy) => {
      const blocked = { ...quote, blockedBy }
      const { deps, busyCalls } = createDeps({ quote: async () => ok(blocked) })

      expect(await loadReschedulePage(APPOINTMENT_ID, {}, deps)).toEqual({ status: 'blocked', quote: blocked })
      expect(busyCalls).toEqual([])
    },
  )

  it('si se puede, calcula los espacios del día con lo que ocupa la cita, ignorando la propia cita', async () => {
    const { deps, busyCalls } = createDeps()
    const data = await loadReschedulePage(APPOINTMENT_ID, { fecha: '2026-10-26' }, deps)

    expect(busyCalls).toEqual([[RESOURCE, '2026-10-26', APPOINTMENT_ID]])
    expect(data).toMatchObject({ status: 'ready', date: '2026-10-26', today: '2026-10-19', quote })
    if (data.status === 'ready') {
      expect(data.slots.map((slot) => slot.startMin)).toEqual([OPEN_FROM_MIN, OPEN_FROM_MIN + SLOT_INTERVAL_MIN])
    }
  })

  it.each([
    ['sin fecha', {}],
    ['con una fecha pasada', { fecha: '2026-10-01' }],
    ['con una fecha inexistente', { fecha: '2026-02-30' }],
  ])('%s abre en hoy, en la fecha del estudio', async (_label, searchParams) => {
    const { deps } = createDeps()
    const data = await loadReschedulePage(APPOINTMENT_ID, searchParams, deps)

    expect(data).toMatchObject({ status: 'ready', date: '2026-10-19', today: '2026-10-19' })
  })

  it('si no se pueden calcular los espacios del día, invalid con la cita a la vista', async () => {
    const { deps } = createDeps({ quote: async () => ok({ ...quote, occupiedMinutes: 0 }) })

    expect(await loadReschedulePage(APPOINTMENT_ID, {}, deps)).toMatchObject({
      status: 'invalid',
      quote: { occupiedMinutes: 0 },
    })
  })
})
