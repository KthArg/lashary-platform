import { createClient } from '@/shared/lib/supabase/server'
import { createSupabaseAlertsRepository } from '../../../db/alerts-repository'
import { ALERTS_LIMIT } from '../constants/alerts-strings'
import { toAlertsViewModel } from '../utils/alerts-format'
import type { AlertsViewModel } from '../types/alerts.types'

export const alertsService = {
  async load(): Promise<AlertsViewModel> {
    const alerts = await createSupabaseAlertsRepository(await createClient()).listRecent(ALERTS_LIMIT)
    return toAlertsViewModel(alerts)
  },
}
