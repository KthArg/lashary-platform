import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { systemClock } from '@/shared/clock'
import { isErr } from '@/shared/result'
import { loadInactiveClients } from '@/features/notifications/application/inactive-clients'
import { inactiveClientsRepository } from '@/features/notifications/db/inactive-clients-repository'
import { readInactiveClientsLocation } from '../utils/inactive-clients-url'
import type { InactiveClientsScreen, InactiveClientsSearchParams } from '../types/inactive-clients.types'

export const inactiveClientsService = {
  async load(params: InactiveClientsSearchParams): Promise<InactiveClientsScreen> {
    await requireAdminSession()
    const location = readInactiveClientsLocation(params)
    const result = await loadInactiveClients({
      repository: inactiveClientsRepository(await createClient()),
      clock: systemClock,
    })(location)
    if (isErr(result)) return { status: 'error', ...location }
    return { status: 'ready', view: result.value }
  },
}
