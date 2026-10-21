import { isErr, ok, err, type Result } from '@/shared/result'
import { buildAgenda, studioDayRange, type AgendaEntry } from '../domain/daily-agenda'
import type { DailyAgendaInvalid } from '../domain/availability-errors'
import type { StorageFailed } from '../domain/errors'
import type { DailyAgendaRepository } from './ports'

export type DailyAgendaDeps = {
  repo: DailyAgendaRepository
}

export type DailyAgenda = {
  date: string
  entries: AgendaEntry[]
}

export const getDailyAgenda =
  (deps: DailyAgendaDeps) =>
  async (date: string): Promise<Result<DailyAgenda, DailyAgendaInvalid | StorageFailed>> => {
    const range = studioDayRange(date)
    if (isErr(range)) return range

    const appointments = await deps.repo.listBetween(range.value.fromMs, range.value.untilMs)
    if (isErr(appointments)) return err(appointments.error)

    return ok({ date, entries: buildAgenda(appointments.value) })
  }
