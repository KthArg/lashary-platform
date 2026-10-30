import { isErr, ok, err, type Result } from '@/shared/result'
import { agendaClientIds, limitAgenda, markDelinquent, studioDayRange, type AgendaEntry } from '../domain/daily-agenda'
import type { DailyAgendaInvalid } from '../domain/availability-errors'
import type { StorageFailed } from '../domain/errors'
import type { DailyAgendaRepository, DelinquentClientsPort } from './ports'

export type DailyAgendaDeps = {
  repo: DailyAgendaRepository
  delinquency: DelinquentClientsPort
}

export type DailyAgenda = {
  date: string
  entries: AgendaEntry[]
  isTruncated: boolean
}

export const getDailyAgenda =
  (deps: DailyAgendaDeps) =>
  async (date: string): Promise<Result<DailyAgenda, DailyAgendaInvalid | StorageFailed>> => {
    const range = studioDayRange(date)
    if (isErr(range)) return range

    const appointments = await deps.repo.listBetween(range.value.fromMs, range.value.untilMs)
    if (isErr(appointments)) return err(appointments.error)

    const { entries, isTruncated } = limitAgenda(appointments.value)
    const clientIds = agendaClientIds(entries)
    // Una sola consulta por día, solo con las clientas que la agenda pinta (PERF-005).
    const delinquent = clientIds.length > 0 ? await deps.delinquency.listWithActiveDelinquency(clientIds) : new Set<string>()
    return ok({ date, entries: markDelinquent(entries, delinquent), isTruncated })
  }
