import { createClient } from '@/shared/lib/supabase/server'
import { getDailyAgenda } from '@/features/scheduling/application/daily-agenda'
import { createSupabaseDailyAgendaRepository } from '@/features/scheduling/db/daily-agenda-repository'
import { toDailyAgendaViewModel } from '../utils/daily-agenda-format'
import type { ClientLinks, DailyAgendaViewModel } from '../types/daily-agenda.types'

export const dailyAgendaService = {
  async load(input: { date: string; today: string; clientLinks: ClientLinks }): Promise<DailyAgendaViewModel> {
    const repo = createSupabaseDailyAgendaRepository(await createClient())
    const agenda = await getDailyAgenda({ repo })(input.date)
    return toDailyAgendaViewModel({ ...input, agenda })
  },
}
