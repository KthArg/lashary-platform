import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { moneyFromColones, formatMoney } from '@/shared/money'
import { packageNotAvailable, techniqueNotAvailable } from '../../../domain/errors'
import { packageOptionKey } from '../../../domain/service-option'
import { bookingConfirmMessages } from '../constants/booking-confirm-strings'
import { loadBookingConfirm, type BookingConfirmDeps } from '../utils/load-booking-confirm'
import { readConfirmParams } from '../utils/read-confirm-params'
import { toBookingConfirmView } from '../utils/booking-confirm-format'
import type { BookingQuote, PackageBookingQuote, QuoteBookingInput } from '../../../application/ports'

const TODAY = '2026-10-19'
const NOW = new Date('2026-10-19T15:00:00Z')
const TECHNIQUE = {
  id: 't1',
  name: 'Clásicas',
  isActive: true,
  durationFirstTimeMin: 60,
  durationRetouchMin: 45,
  bufferMin: 15,
}
const PACKAGE = { id: 'p1', name: 'Combo clásicas', isActive: true, durationTotalMin: 90 }
const QUOTE: BookingQuote = {
  techniqueName: 'Clásicas',
  servicePrice: 35000,
  durationMin: 60,
  bufferMin: 15,
  depositDue: 10000,
}
const PACKAGE_QUOTE: PackageBookingQuote = {
  packageName: 'Combo clásicas',
  servicePrice: 45000,
  durationMin: 90,
  bufferMin: 20,
  depositDue: 12000,
}
const validParams = { servicio: 't1', fecha: '2026-10-20', espacio: '540' }

function createDeps(overrides: Partial<BookingConfirmDeps> = {}) {
  const quoted: QuoteBookingInput[] = []
  const deps: BookingConfirmDeps = {
    isClient: async () => true,
    listTechniques: async () => [TECHNIQUE],
    listPackages: async () => [PACKAGE],
    quoteTechnique: async (input) => {
      quoted.push(input)
      return ok(QUOTE)
    },
    quotePackage: async () => ok(PACKAGE_QUOTE),
    clock: () => NOW,
    ...overrides,
  }
  return { deps, quoted }
}

describe('readConfirmParams', () => {
  it('lee servicio, fecha y espacio', () => {
    expect(readConfirmParams(validParams, TODAY)).toEqual({ serviceKey: 't1', date: '2026-10-20', startMin: 540 })
  })

  it.each([
    ['sin servicio', { ...validParams, servicio: undefined }],
    ['sin espacio', { ...validParams, espacio: undefined }],
    ['espacio que no es un número', { ...validParams, espacio: 'abc' }],
    ['espacio fuera del día', { ...validParams, espacio: '1440' }],
    ['fecha inexistente', { ...validParams, fecha: '2026-02-30' }],
    ['fecha pasada', { ...validParams, fecha: '2026-10-18' }],
  ])('rechaza %s', (_name, searchParams) => {
    expect(readConfirmParams(searchParams, TODAY)).toBeNull()
  })
})

describe('loadBookingConfirm', () => {
  it('con todo en orden, pide la cotización de la técnica elegida y devuelve el resumen', async () => {
    const { deps, quoted } = createDeps()
    const data = await loadBookingConfirm(validParams, deps)

    expect(data).toMatchObject({ status: 'ready', serviceName: 'Clásicas', isFirstTime: true, quote: QUOTE })
    expect(quoted).toEqual([{ techniqueId: 't1', isFirstTime: true }])
  })

  it('un retoque se cotiza como retoque', async () => {
    const { deps, quoted } = createDeps()
    await loadBookingConfirm({ ...validParams, servicio: 't1.retoque' }, deps)
    expect(quoted).toEqual([{ techniqueId: 't1', isFirstTime: false }])
  })

  it('quien no es clienta no ve nada y no se cotiza', async () => {
    const { deps, quoted } = createDeps({ isClient: async () => false })
    expect(await loadBookingConfirm(validParams, deps)).toEqual({ status: 'forbidden' })
    expect(quoted).toHaveLength(0)
  })

  it('parámetros inválidos devuelven al calendario sin cotizar', async () => {
    const { deps, quoted } = createDeps()
    const data = await loadBookingConfirm({ ...validParams, espacio: 'abc' }, deps)
    expect(data).toMatchObject({ status: 'invalid', backHref: '/portal/citas/calendario' })
    expect(quoted).toHaveLength(0)
  })

  it('un servicio que ya no existe devuelve al calendario con el servicio y la fecha', async () => {
    const { deps } = createDeps({ listTechniques: async () => [] })
    expect(await loadBookingConfirm(validParams, deps)).toEqual({
      status: 'unavailable',
      backHref: '/portal/citas/calendario?servicio=t1&fecha=2026-10-20',
    })
  })

  it('si la cotización falla, el servicio no está disponible', async () => {
    const { deps } = createDeps({ quoteTechnique: async () => err(techniqueNotAvailable('t1')) })
    expect(await loadBookingConfirm(validParams, deps)).toMatchObject({ status: 'unavailable' })
  })
})

describe('loadBookingConfirm — paquetes (US-AGE-04, criterios 2 y 3)', () => {
  const packageParams = { servicio: packageOptionKey('p1'), fecha: '2026-10-20', espacio: '540' }

  it('pide la cotización del paquete elegido, sin primera vez ni retoque', async () => {
    const quotedPackages: string[] = []
    const { deps } = createDeps({
      quotePackage: async (input) => {
        quotedPackages.push(input.packageId)
        return ok(PACKAGE_QUOTE)
      },
    })
    const data = await loadBookingConfirm(packageParams, deps)
    expect(data).toMatchObject({ status: 'ready', serviceName: 'Combo clásicas', isFirstTime: null, quote: PACKAGE_QUOTE })
    expect(quotedPackages).toEqual(['p1'])
  })

  it('un paquete desactivado o inexistente no está disponible', async () => {
    const { deps } = createDeps({ quotePackage: async () => err(packageNotAvailable('p1')) })
    expect(await loadBookingConfirm(packageParams, deps)).toMatchObject({ status: 'unavailable' })
  })
})

describe('toBookingConfirmView — criterio 7', () => {
  const ready = async (quote: BookingQuote) => {
    const { deps } = createDeps({ quoteTechnique: async () => ok(quote) })
    return toBookingConfirmView(await loadBookingConfirm(validParams, deps))
  }

  it('muestra el anticipo con la advertencia de que puede perderse si cancela o no asiste', async () => {
    const view = await ready(QUOTE)
    expect(view).toMatchObject({
      status: 'ready',
      summary: {
        service: 'Clásicas — primera vez',
        duration: '60 min',
        price: formatMoney(moneyFromColones(QUOTE.servicePrice)),
        deposit: formatMoney(moneyFromColones(QUOTE.depositDue)),
        depositNotice: bookingConfirmMessages.depositNotice,
      },
    })
    if (view.status === 'ready') expect(view.summary.when).toContain('09:00–10:00')
  })

  it('un paquete se muestra con su propio precio y tiempo, sin primera vez ni retoque (US-AGE-04, criterios 2 y 3)', async () => {
    const { deps } = createDeps({ quotePackage: async () => ok(PACKAGE_QUOTE) })
    const view = toBookingConfirmView(
      await loadBookingConfirm({ servicio: packageOptionKey('p1'), fecha: '2026-10-20', espacio: '540' }, deps),
    )
    expect(view).toMatchObject({
      status: 'ready',
      summary: {
        service: 'Combo clásicas — paquete',
        duration: '90 min',
        price: formatMoney(moneyFromColones(PACKAGE_QUOTE.servicePrice)),
        deposit: formatMoney(moneyFromColones(PACKAGE_QUOTE.depositDue)),
      },
    })
  })

  it('una clienta exonerada ve «sin anticipo» y ninguna advertencia', async () => {
    const view = await ready({ ...QUOTE, depositDue: 0 })
    expect(view).toMatchObject({
      status: 'ready',
      summary: { deposit: bookingConfirmMessages.noDeposit, depositNotice: null },
    })
  })
})
