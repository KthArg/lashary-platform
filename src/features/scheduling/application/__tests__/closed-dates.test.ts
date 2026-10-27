import { describe, it, expect } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { fixedClock } from '@/shared/testing/fixed-clock'
import { addClosedDate, listUpcomingClosedDates, removeClosedDate } from '../closed-dates'
import { MAX_CLOSED_DATES, type ClosedDateRepository } from '../availability-ports'
import type { ClosedDate } from '../../domain/closed-dates'
import {
  closedDateAlreadyExists,
  isAvailabilityEntryNotFound,
  isClosedDateAlreadyExists,
  isClosedDateHasAppointment,
  closedDateHasAppointment,
  isClosedDateInvalid,
} from '../../domain/availability-errors'

const RESOURCE = 'r-1'

// Imita la base: un cierre por día y recurso (UNIQUE).
function createFakeClosedDateRepository(initial: ClosedDate[] = []) {
  const dates = [...initial]
  const listCalls: Array<{ fromDate: string; limit: number }> = []
  const repo: ClosedDateRepository = {
    async listFrom(resourceId, fromDate, limit) {
      listCalls.push({ fromDate, limit })
      return dates
        .filter((stored) => stored.resourceId === resourceId && stored.date >= fromDate)
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(0, limit)
    },
    async insert(closedDate) {
      if (dates.some((stored) => stored.resourceId === closedDate.resourceId && stored.date === closedDate.date)) {
        return err(closedDateAlreadyExists(closedDate.date))
      }
      dates.push(closedDate)
      return ok(undefined)
    },
    async remove(id) {
      const index = dates.findIndex((stored) => stored.id === id)
      if (index === -1) return false
      dates.splice(index, 1)
      return true
    },
  }
  return { repo, dates, listCalls }
}

const closed = (id: string, date: string): ClosedDate => ({
  id,
  resourceId: RESOURCE,
  date,
  kind: 'holiday',
  label: null,
})

const deps = (repo: ClosedDateRepository) => ({
  repo,
  newId: () => 'new-1',
  // 2026-10-15 03:00 UTC: en el estudio todavía es 14 de octubre.
  clock: fixedClock('2026-10-15T03:00:00Z'),
})

describe('addClosedDate — US-AGE-01, criterio 2', () => {
  it('guarda un feriado', async () => {
    const { repo, dates } = createFakeClosedDateRepository()
    const result = await addClosedDate(deps(repo))({
      resourceId: RESOURCE,
      date: '2026-12-25',
      kind: 'holiday',
      label: 'Navidad',
    })
    expect(isOk(result) && result.value).toEqual({ ...closed('new-1', '2026-12-25'), label: 'Navidad' })
    expect(dates).toHaveLength(1)
  })

  it('rechaza un día inválido sin escribir', async () => {
    const { repo, dates } = createFakeClosedDateRepository()
    const result = await addClosedDate(deps(repo))({ resourceId: RESOURCE, date: 'mañana', kind: 'holiday' })
    expect(isErr(result) && isClosedDateInvalid(result.error)).toBe(true)
    expect(dates).toHaveLength(0)
  })

  it('rechaza cerrar dos veces el mismo día', async () => {
    const { repo } = createFakeClosedDateRepository([closed('a', '2026-12-25')])
    const result = await addClosedDate(deps(repo))({
      resourceId: RESOURCE,
      date: '2026-12-25',
      kind: 'non_working',
    })
    expect(isErr(result) && isClosedDateAlreadyExists(result.error)).toBe(true)
  })

  it('si la base lo rechaza por una cita activa, lo devuelve tipado y no guarda nada', async () => {
    const { repo, dates } = createFakeClosedDateRepository()
    const rejecting = { ...repo, insert: async () => err(closedDateHasAppointment()) }
    const result = await addClosedDate(deps(rejecting))({ resourceId: RESOURCE, date: '2026-12-25', kind: 'holiday' })
    expect(isErr(result) && isClosedDateHasAppointment(result.error)).toBe(true)
    expect(dates).toHaveLength(0)
  })
})

describe('listUpcomingClosedDates', () => {
  it('lista desde hoy en la fecha del estudio, con tope de PERF-002', async () => {
    const { repo, listCalls } = createFakeClosedDateRepository([
      closed('pasado', '2026-10-13'),
      closed('hoy', '2026-10-14'),
      closed('futuro', '2026-12-25'),
    ])
    const dates = await listUpcomingClosedDates(deps(repo))(RESOURCE)
    expect(dates.map((closedDate) => closedDate.id)).toEqual(['hoy', 'futuro'])
    expect(listCalls).toEqual([{ fromDate: '2026-10-14', limit: MAX_CLOSED_DATES }])
  })
})

describe('removeClosedDate', () => {
  it('reabre un día cerrado', async () => {
    const { repo, dates } = createFakeClosedDateRepository([closed('a', '2026-12-25')])
    expect(isOk(await removeClosedDate(deps(repo))('a'))).toBe(true)
    expect(dates).toHaveLength(0)
  })

  it('reporta no encontrado', async () => {
    const { repo } = createFakeClosedDateRepository()
    const result = await removeClosedDate(deps(repo))('nope')
    expect(isErr(result) && isAvailabilityEntryNotFound(result.error)).toBe(true)
  })
})
