import { listTechniques } from '@/features/catalog'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { listUnclosedAppointments } from '@/features/scheduling/application/list-unclosed-appointments'
import { getConfirmationDeadline } from '@/features/scheduling/application/confirm-appointment'
import { getDailyAgenda } from '@/features/scheduling/application/daily-agenda'
import { createSupabaseConfirmationPolicyRepository } from '@/features/scheduling/db/appointment-confirmation-repository'
import { createSupabaseDailyAgendaRepository } from '@/features/scheduling/db/daily-agenda-repository'
import { createSupabaseDelinquentClientsPort } from '@/features/scheduling/db/delinquent-clients-repository'
import { createSupabaseUnclosedAppointmentsRepository } from '@/features/scheduling/db/unclosed-appointments-repository'
import { MAX_CONFIRM_SERVICES } from '../../booking-confirm/constants/booking-confirm-strings'
import {
  toDailyAgendaViewModel,
  toUnclosedSectionView,
  type AgendaConfirmationRule,
} from '../utils/daily-agenda-format'
import type { ClientLinks, DailyAgendaViewModel, UnclosedSectionView } from '../types/daily-agenda.types'

export const dailyAgendaService = {
  async load(input: {
    date: string
    today: string
    nowMs: number
    clientLinks: ClientLinks
  }): Promise<DailyAgendaViewModel> {
    const db = await createClient()
    const [agenda, deadline] = await Promise.all([
      getDailyAgenda({
        repo: createSupabaseDailyAgendaRepository(db),
        delinquency: createSupabaseDelinquentClientsPort(db),
      })(input.date),
      getConfirmationDeadline(createSupabaseConfirmationPolicyRepository(db))(),
    ])
    const confirmation: AgendaConfirmationRule = isErr(deadline)
      ? { status: 'unavailable', nowMs: input.nowMs }
      : { status: 'ready', deadlineHours: deadline.value, nowMs: input.nowMs }
    return toDailyAgendaViewModel({ ...input, agenda, confirmation })
  },
  async loadUnclosed(nowMs: number): Promise<UnclosedSectionView | null> {
    const unclosed = createSupabaseUnclosedAppointmentsRepository(await createClient())
    const unclosedAppointments = await listUnclosedAppointments(unclosed)(nowMs)
    const services = (await listTechniques({ activeOnly: true, pageSize: MAX_CONFIRM_SERVICES })).items
    return toUnclosedSectionView(unclosedAppointments, nowMs, services)
  },
}
