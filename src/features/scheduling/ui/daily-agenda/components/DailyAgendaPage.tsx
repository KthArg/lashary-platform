import { requireAdminSession } from '@/features/auth'
import { systemClock } from '@/shared/clock'
import { studioDateOf } from '@/shared/studio-time'
import { dailyAgendaService } from '../services/daily-agenda-service'
import { readAgendaDate } from '../utils/agenda-date'
import type { ClientLinks, DailyAgendaSearchParams } from '../types/daily-agenda.types'
import { DailyAgendaView } from './DailyAgendaView'

export async function DailyAgendaPage({
  searchParams,
  clientLinks,
}: {
  searchParams: DailyAgendaSearchParams
  clientLinks: ClientLinks
}) {
  await requireAdminSession()
  const now = systemClock()
  const today = studioDateOf(now)
  const date = readAgendaDate(searchParams, today)
  const [view, unclosed] = await Promise.all([
    dailyAgendaService.load({ date, today, nowMs: now.getTime(), clientLinks }),
    dailyAgendaService.loadUnclosed(now.getTime()),
  ])
  return <DailyAgendaView view={view} unclosed={unclosed} />
}
