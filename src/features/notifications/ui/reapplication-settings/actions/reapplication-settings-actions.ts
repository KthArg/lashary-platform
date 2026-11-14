'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { changeAnticipationDays } from '@/features/notifications/application/reapplication-settings'
import { reapplicationSettingsRepository } from '@/features/notifications/db/reapplication-settings-repository'
import { isInvalidAnticipationDays } from '@/features/notifications/domain/errors'
import { anticipationDaysSchema } from '../validation/anticipation-days-schema'
import { reapplicationSettingsMessages as copy, REAPPLICATION_SETTINGS_PATH } from '../constants/reapplication-settings-strings'
import type { SetAnticipationDaysActionResult } from '../types/reapplication-settings.types'

export async function setAnticipationDaysAction(input: unknown): Promise<SetAnticipationDaysActionResult> {
  await requireAdminSession()

  const parsed = anticipationDaysSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: copy.invalid }

  const result = await changeAnticipationDays(reapplicationSettingsRepository(await createClient()))(parsed.data.anticipationDays)
  if (isErr(result)) {
    if (isInvalidAnticipationDays(result.error)) return { ok: false, error: copy.invalid }
    return { ok: false, error: copy.saveFailed }
  }

  revalidatePath(REAPPLICATION_SETTINGS_PATH)
  return { ok: true, anticipationDays: result.value }
}
