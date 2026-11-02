import { describe, it, expect } from 'vitest'
import { fixedClock } from '@/shared/testing/fixed-clock'
import type { DayAvailabilityRepository } from '../../../application/availability-ports'
import { packageOptionKey, type NamedPackage, type NamedTechnique } from '../../../domain/service-option'
import { loadClientCalendar, type ClientCalendarDeps } from '../utils/load-client-calendar'

const RESOURCE = 'r-1'
const technique: NamedTechnique = {
  id: 't1',
  name: 'Volumen ruso',
  isActive: true,
  durationFirstTimeMin: 45,
  durationRetouchMin: null,
  bufferMin: 15,
}
const pkg: NamedPackage = { id: 'p1', name: 'Combo clásicas', isActive: true, durationTotalMin: 90 }

function deps(overrides: Partial<ClientCalendarDeps> = {}) {
  const calls: unknown[][] = []
  const repo: DayAvailabilityRepository = {
    async listOpenHours(...args) {
      calls.push(args)
      return [{ startMin: 540, endMin: 660 }]
    },
    async listBusyRanges() {
      return []
    },
  }
  const base: ClientCalendarDeps = {
    isClient: async () => true,
    listTechniques: async () => [technique],
    listPackages: async () => [],
    repo,
    clock: fixedClock('2026-10-19T14:00:00Z'),
    resourceId: RESOURCE,
  }
  return { deps: { ...base, ...overrides }, calls }
}

describe('loadClientCalendar — US-AGE-02', () => {
  it('sin sesión de clienta: forbidden, sin leer catálogo ni agenda (SEC-001, mensaje amable)', async () => {
    let catalogRead = false
    const { deps: d, calls } = deps({
      isClient: async () => false,
      listTechniques: async () => {
        catalogRead = true
        return [technique]
      },
    })
    expect(await loadClientCalendar({ servicio: 't1' }, d)).toEqual({ status: 'forbidden' })
    expect(catalogRead).toBe(false)
    expect(calls).toEqual([])
  })

  it('sin técnicas activas: noServices', async () => {
    const { deps: d } = deps({ listTechniques: async () => [] })
    expect(await loadClientCalendar({}, d)).toEqual({ status: 'noServices' })
  })

  it('sin servicio en la URL: chooseService con hoy en la fecha del estudio', async () => {
    const { deps: d, calls } = deps()
    const data = await loadClientCalendar({}, d)
    expect(data.status).toBe('chooseService')
    expect('date' in data && data.date).toBe('2026-10-19')
    expect(calls).toEqual([])
  })

  it('con servicio y fecha: calcula los espacios con servicio + limpieza (criterio 5)', async () => {
    const { deps: d, calls } = deps()
    const data = await loadClientCalendar({ servicio: 't1', fecha: '2026-10-20' }, d)
    expect(calls).toEqual([[RESOURCE, '2026-10-20']])
    expect(data.status === 'ready' && data.slots.map((slot) => [slot.startMin, slot.endMin])).toEqual([
      [540, 600],
      [570, 630],
      [600, 660],
    ])
  })

  it('una fecha pasada o inexistente se lee como hoy', async () => {
    for (const fecha of ['2026-10-18', '2026-02-30', 'mañana']) {
      const { deps: d } = deps()
      const data = await loadClientCalendar({ servicio: 't1', fecha }, d)
      expect('date' in data && data.date).toBe('2026-10-19')
    }
  })

  it('un servicio que no existe vuelve a pedir que se elija uno', async () => {
    const { deps: d } = deps()
    expect((await loadClientCalendar({ servicio: 'otro' }, d)).status).toBe('chooseService')
  })

  it('un servicio que no cabe en el día: invalid, sin leer la agenda', async () => {
    const tooLong: NamedTechnique = { ...technique, durationFirstTimeMin: 1440 }
    const { deps: d, calls } = deps({ listTechniques: async () => [tooLong] })
    const data = await loadClientCalendar({ servicio: 't1', fecha: '2026-10-19' }, d)
    expect(data.status).toBe('invalid')
    expect(calls).toEqual([])
  })

  it('un paquete se puede elegir igual que una técnica, con su propio tiempo total (US-AGE-04, criterio 1)', async () => {
    const { deps: d, calls } = deps({ listPackages: async () => [pkg] })
    const data = await loadClientCalendar({ servicio: packageOptionKey('p1'), fecha: '2026-10-20' }, d)
    expect(calls).toEqual([[RESOURCE, '2026-10-20']])
    expect(data.status === 'ready' && data.selected).toEqual({
      kind: 'package',
      key: 'pkg:p1',
      packageId: 'p1',
      name: 'Combo clásicas',
      durationMin: 90,
    })
  })
})
