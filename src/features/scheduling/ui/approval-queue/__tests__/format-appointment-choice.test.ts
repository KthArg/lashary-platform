import { describe, it, expect } from 'vitest'
import { Money } from '@/shared/money'
import { APPROVAL_QUEUE_CHOICE } from '../constants/approval-queue.labels'
import { formatAppointmentChoice } from '../utils/format-appointment-choice'

const CHOICE = {
  techniqueName: 'Clásicas',
  isFirstTime: true,
  detectedFirstTime: true,
  servicePrice: 35000,
  depositRequired: 10000,
}
const price = (colones: number) => Money.fromColones(colones).toString()

describe('formatAppointmentChoice', () => {
  it('muestra el servicio, que es primera vez, y el precio con el anticipo', () => {
    expect(formatAppointmentChoice(CHOICE)).toEqual({
      service: 'Clásicas',
      kind: APPROVAL_QUEUE_CHOICE.firstTime,
      amounts: APPROVAL_QUEUE_CHOICE.priceAndDeposit(price(35000), price(10000)),
      warning: null,
    })
  })

  it('un retoque se rotula como retoque, para que la administradora vea si la clienta se equivocó', () => {
    expect(formatAppointmentChoice({ ...CHOICE, isFirstTime: false, detectedFirstTime: false, servicePrice: 25000 })).toMatchObject({
      kind: APPROVAL_QUEUE_CHOICE.retouch,
      amounts: APPROVAL_QUEUE_CHOICE.priceAndDeposit(price(25000), price(10000)),
    })
  })

  it('sin anticipo lo dice en vez de mostrar cero colones', () => {
    expect(formatAppointmentChoice({ ...CHOICE, depositRequired: 0 }).amounts).toBe(
      APPROVAL_QUEUE_CHOICE.priceNoDeposit(price(35000)),
    )
  })

  it('una cita sin elección guardada dice que el servicio no está registrado', () => {
    expect(formatAppointmentChoice(null)).toEqual({
      service: APPROVAL_QUEUE_CHOICE.noService,
      kind: null,
      amounts: null,
      warning: null,
    })
  })

  it('avisa cuando eligió retoque y el sistema no encuentra una cita anterior con esa técnica', () => {
    expect(formatAppointmentChoice({ ...CHOICE, isFirstTime: false, servicePrice: 25000 }).warning).toBe(
      APPROVAL_QUEUE_CHOICE.chose.retouchButDetectedFirstTime,
    )
  })

  it('avisa cuando eligió primera vez y el sistema encontró una cita anterior con esa técnica', () => {
    expect(formatAppointmentChoice({ ...CHOICE, detectedFirstTime: false }).warning).toBe(
      APPROVAL_QUEUE_CHOICE.chose.firstTimeButDetectedRetouch,
    )
  })

  it('no avisa cuando lo elegido coincide con lo detectado ni cuando no hay dato detectado', () => {
    expect(formatAppointmentChoice({ ...CHOICE, isFirstTime: false, detectedFirstTime: false }).warning).toBeNull()
    expect(formatAppointmentChoice({ ...CHOICE, detectedFirstTime: null }).warning).toBeNull()
  })
})
