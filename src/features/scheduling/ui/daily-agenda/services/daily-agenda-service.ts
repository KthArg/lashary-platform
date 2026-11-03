import { listTechniques } from '@/features/catalog'
import { createClient } from '@/shared/lib/supabase/server'
import { listUnclosedAppointments } from '@/features/scheduling/application/list-unclosed-appointments'
import { getDailyAgenda } from '@/features/scheduling/application/daily-agenda'
import { noDelinquentClientsYet } from '@/features/scheduling/application/no-delinquency'
import { createSupabaseDailyAgendaRepository } from '@/features/scheduling/db/daily-agenda-repository'
import { createSupabaseUnclosedAppointmentsRepository } from '@/features/scheduling/db/unclosed-appointments-repository'
import { MAX_CONFIRM_SERVICES } from '../../booking-confirm/constants/booking-confirm-strings'
import { toDailyAgendaViewModel, toUnclosedSectionView } from '../utils/daily-agenda-format'
import type { ClientLinks, DailyAgendaViewModel, UnclosedSectionView } from '../types/daily-agenda.types'

export const dailyAgendaService = {
  async load(input: { date: string; today: string; clientLinks: ClientLinks }): Promise<DailyAgendaViewModel> {
    const repo = createSupabaseDailyAgendaRepository(await createClient())
    const agenda = await getDailyAgenda({ repo, delinquency: noDelinquentClientsYet })(input.date)
    return toDailyAgendaViewModel({ ...input, agenda })
  },
  async loadUnclosed(nowMs: number): Promise<UnclosedSectionView | null> {
    const unclosed = createSupabaseUnclosedAppointmentsRepository(await createClient())
    const unclosedAppointments = await listUnclosedAppointments(unclosed)(nowMs)
    const services = (await listTechniques({ activeOnly: true, pageSize: MAX_CONFIRM_SERVICES })).items
    return toUnclosedSectionView(unclosedAppointments, nowMs, services)
  },
}
