import { createClient } from '@/shared/lib/supabase/server'
import { getDailyAgenda } from '@/features/scheduling/application/daily-agenda'
import { noDelinquentClientsYet } from '@/features/scheduling/application/no-delinquency'
import { createSupabaseDailyAgendaRepository } from '@/features/scheduling/db/daily-agenda-repository'
import { toDailyAgendaViewModel } from '../utils/daily-agenda-format'
import type { ClientLinks, DailyAgendaViewModel } from '../types/daily-agenda.types'

export const dailyAgendaService = {
  async load(input: { date: string; today: string; clientLinks: ClientLinks }): Promise<DailyAgendaViewModel> {
    const repo = createSupabaseDailyAgendaRepository(await createClient())
    // Hasta US-MOR-02 ninguna clienta aparece morosa: esa historia cambia solo este adaptador.
    const agenda = await getDailyAgenda({ repo, delinquency: noDelinquentClientsYet })(input.date)
    return toDailyAgendaViewModel({ ...input, agenda })
  },
}
