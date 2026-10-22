import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { Money } from '@/shared/money'
import { storageFailed } from '../../../domain/errors'
import type { MyAppointment } from '../../../application/ports'
import { APPOINTMENT_DISPLAY_CHOICE } from '../../appointment-display/constants/appointment-display.constants'
import { formatAppointmentSlot } from '../../appointment-display/utils/format-appointment-slot'
import { myAppointmentsMessages } from '../constants/my-appointments-strings'
import { loadMyAppointments, type MyAppointmentsDeps } from '../utils/load-my-appointments'
import { toMyAppointmentsView, toMyAppointmentView } from '../utils/my-appointments-format'

const STARTS_AT_MS = Date.parse('2027-09-10T15:00:00Z')
const ENDS_AT_MS = Date.parse('2027-09-10T16:00:00Z')
const price = (colones: number) => Money.fromColones(colones).toString()
const appointment: MyAppointment = {
  id: 'cita-1',
  startsAtMs: STARTS_AT_MS,
  endsAtMs: ENDS_AT_MS,
  techniqueName: 'Clásicas',
  status: 'approved',
  isFirstTime: true,
  servicePrice: 35000,
  depositRequired: 10000,
}

function createDeps(overrides: Partial<MyAppointmentsDeps> = {}): MyAppointmentsDeps {
  return { isClient: async () => true, list: async () => ok([appointment]), ...overrides }
}

describe('loadMyAppointments', () => {
  it('quien no es clienta no ve citas y ni siquiera se consultan', async () => {
    let consulted = false
    const data = await loadMyAppointments(
      createDeps({ isClient: async () => false, list: async () => ((consulted = true), ok([])) }),
    )

    expect(data).toEqual({ status: 'forbidden' })
    expect(consulted).toBe(false)
  })

  it('devuelve las citas de la clienta', async () => {
    expect(await loadMyAppointments(createDeps())).toEqual({ status: 'ready', appointments: [appointment] })
  })

  it('un fallo de la base es un error, nunca «sin citas»', async () => {
    const data = await loadMyAppointments(createDeps({ list: async () => err(storageFailed('connection refused')) }))

    expect(data).toEqual({ status: 'error' })
  })
})

describe('toMyAppointmentView', () => {
  it('muestra servicio, si es primera vez, horario en la hora del estudio, estado y montos', () => {
    const view = toMyAppointmentView(appointment)

    expect(view).toEqual({
      id: 'cita-1',
      service: 'Clásicas',
      kind: APPOINTMENT_DISPLAY_CHOICE.firstTime,
      slot: formatAppointmentSlot(STARTS_AT_MS, ENDS_AT_MS),
      status: myAppointmentsMessages.status.approved,
      amounts: APPOINTMENT_DISPLAY_CHOICE.priceAndDeposit(price(35000), price(10000)),
    })
    expect(view.slot).toContain('9:00')
  })

  it('un retoque sin anticipo se rotula así y dice «sin anticipo»', () => {
    const view = toMyAppointmentView({ ...appointment, isFirstTime: false, depositRequired: 0, status: 'pending_approval' })

    expect(view.kind).toBe(APPOINTMENT_DISPLAY_CHOICE.retouch)
    expect(view.amounts).toBe(APPOINTMENT_DISPLAY_CHOICE.priceNoDeposit(price(35000)))
    expect(view.status).toBe(myAppointmentsMessages.status.pending_approval)
  })
})

describe('toMyAppointmentsView', () => {
  it('sin citas es el estado vacío', () => {
    expect(toMyAppointmentsView({ status: 'ready', appointments: [] })).toEqual({ status: 'empty' })
  })

  it('los estados sin lista pasan tal cual', () => {
    expect(toMyAppointmentsView({ status: 'forbidden' })).toEqual({ status: 'forbidden' })
    expect(toMyAppointmentsView({ status: 'error' })).toEqual({ status: 'error' })
  })

  it('con citas devuelve una vista por cita, en el mismo orden', () => {
    const second = { ...appointment, id: 'cita-2' }
    const view = toMyAppointmentsView({ status: 'ready', appointments: [appointment, second] })

    expect(view.status === 'ready' && view.appointments.map((item) => item.id)).toEqual(['cita-1', 'cita-2'])
  })
})
