import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadAnticipationDays } from '@/features/notifications/application/reapplication-settings'
import { reapplicationSettingsRepository } from '@/features/notifications/db/reapplication-settings-repository'
import type { ReapplicationSettingsScreen } from '../types/reapplication-settings.types'

export const reapplicationSettingsService = {
  async load(): Promise<ReapplicationSettingsScreen> {
    await requireAdminSession()
    const result = await loadAnticipationDays(reapplicationSettingsRepository(await createClient()))()
    if (isErr(result)) return { status: 'error' }
    return { status: 'ready', anticipationDays: result.value }
  },
}
