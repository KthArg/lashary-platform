import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { fixedClock } from '@/shared/testing/fixed-clock'
import { storageFailed } from '../../domain/errors'
import { listMyAppointments } from '../list-my-appointments'
import type { MyAppointment, MyAppointmentsRepository } from '../ports'

const NOW_ISO = '2027-09-01T12:00:00Z'
const NOW_MS = Date.parse(NOW_ISO)
const clock = fixedClock(NOW_ISO)
const appointment: MyAppointment = {
  id: 'cita-1',
  startsAtMs: Date.parse('2027-09-10T15:00:00Z'),
  endsAtMs: Date.parse('2027-09-10T16:00:00Z'),
  techniqueName: 'Clásicas',
  status: 'approved',
  isFirstTime: true,
  servicePrice: 35000,
  depositRequired: 10000,
  heldSchedule: null,
}

describe('listMyAppointments', () => {
  it('pide las citas que no empezaron con la hora del reloj inyectado', async () => {
    const requestedAt: number[] = []
    const appointments: MyAppointmentsRepository = {
      listUpcoming: async (nowMs) => (requestedAt.push(nowMs), ok([appointment])),
    }
    const result = await listMyAppointments({ appointments, clock })

    expect(isOk(result) && result.value).toEqual([appointment])
    expect(requestedAt).toEqual([NOW_MS])
  })

  it('devuelve el error del repositorio tal cual, sin lanzar', async () => {
    const appointments: MyAppointmentsRepository = {
      listUpcoming: async () => err(storageFailed('connection refused')),
    }
    const result = await listMyAppointments({ appointments, clock })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
