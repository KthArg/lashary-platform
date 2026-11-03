import { describe, it, expect } from 'vitest'
import { ok } from '@/shared/result'
import { formatMoney, moneyFromColones } from '@/shared/money'
import type { UnclosedAppointment } from '@/features/scheduling/application/closing-ports'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { toUnclosedSectionView } from '../utils/daily-agenda-format'

const NOW_MS = Date.parse('2027-03-10T18:00:00Z')
const SERVICE_PRICE = 15000
const DEPOSIT = 5000

const money = (colones: number): string => formatMoney(moneyFromColones(colones))

const unclosed = (overrides: Partial<UnclosedAppointment>): UnclosedAppointment => ({
  id: 'cita-1',
  status: 'approved',
  startsAtMs: Date.parse('2027-03-08T16:00:00Z'),
  endsAtMs: Date.parse('2027-03-08T17:00:00Z'),
  clientId: 'perfil-ana',
  clientName: 'Ana Mora',
  techniqueId: 'tecnica-1',
  isFirstTime: true,
  techniqueName: 'Clásicas',
  servicePrice: SERVICE_PRICE,
  depositRegistered: DEPOSIT,
  ...overrides,
})

const services = [
  { id: 'tecnica-1', name: 'Clásicas', priceFirstTime: 15000, priceRetouch: 12000 },
  { id: 'tecnica-2', name: 'Henna', priceFirstTime: 20000, priceRetouch: null },
  { id: 'tecnica-3', name: 'Cejas', priceFirstTime: 9000, priceRetouch: 7000 },
]

const serviceChoicesOf = (appointment: UnclosedAppointment) => {
  const section = toUnclosedSectionView(ok({ appointments: [appointment], isTruncated: false }), NOW_MS, services)
  return section?.status === 'ready' ? section.items[0].serviceChoices : []
}

const optionsOf = (appointment: UnclosedAppointment) => {
  const section = toUnclosedSectionView(ok({ appointments: [appointment], isTruncated: false }), NOW_MS)
  return section?.status === 'ready' ? section.items[0].options : []
}

describe('opciones de cierre con su aviso previo — US-AGE-12 criterios 1, 3, 4 y 7', () => {
  it('ofrece atendida, con el cargo, el anticipo descontado y lo que queda por pagar, y ausencia, con el anticipo que se pierde', () => {
    expect(optionsOf(unclosed({}))).toEqual([
      {
        outcome: 'completed',
        label: COPY.close.completedLabel,
        summary: COPY.close.completedSummary(money(SERVICE_PRICE), money(DEPOSIT), money(SERVICE_PRICE - DEPOSIT)),
      },
      { outcome: 'no_show', label: COPY.close.noShowLabel, summary: COPY.close.noShowSummary(money(DEPOSIT)) },
    ])
  })

  it('sin anticipo registrado, la ausencia dice que no hay nada que perder', () => {
    const [, noShow] = optionsOf(unclosed({ depositRegistered: 0 }))

    expect(noShow.summary).toBe(COPY.close.noShowWithoutDeposit)
  })

  it('si el anticipo supera el cargo, dice cuánto queda a favor de la clienta', () => {
    const [completed] = optionsOf(unclosed({ servicePrice: 3000 }))

    expect(completed.summary).toBe(COPY.close.completedCreditSummary(money(3000), money(DEPOSIT), money(DEPOSIT - 3000)))
  })

  it.each([
    ['sin clienta', { clientId: null, clientName: null }],
    ['sin precio', { servicePrice: null }],
  ])('una cita %s solo se puede cerrar como ausencia', (_description, overrides) => {
    expect(optionsOf(unclosed(overrides)).map((option) => option.outcome)).toEqual(['no_show'])
  })
})

describe('servicio prestado distinto del reservado — US-AGE-12 criterio 2', () => {
  it('ofrece los demás servicios del catálogo, con el cargo a su precio y el anticipo descontado', () => {
    const choices = serviceChoicesOf(unclosed({}))

    expect(choices.map((choice) => choice.techniqueId)).toEqual(['tecnica-2', 'tecnica-3'])
    expect(choices[1].summary).toBe(COPY.close.completedSummary(money(9000), money(DEPOSIT), money(9000 - DEPOSIT)))
  })

  it('en un retoque usa el precio de retoque y no ofrece los servicios que no lo tienen', () => {
    const choices = serviceChoicesOf(unclosed({ isFirstTime: false }))

    expect(choices.map((choice) => choice.techniqueId)).toEqual(['tecnica-3'])
    expect(choices[0].summary).toBe(COPY.close.completedSummary(money(7000), money(DEPOSIT), money(7000 - DEPOSIT)))
  })

  it('una cita sin clienta o sin precio no ofrece otro servicio, porque no se puede completar', () => {
    expect(serviceChoicesOf(unclosed({ clientId: null, clientName: null }))).toEqual([])
    expect(serviceChoicesOf(unclosed({ servicePrice: null }))).toEqual([])
  })
})
