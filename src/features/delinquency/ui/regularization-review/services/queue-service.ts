import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadRegularizationQueue, type RegularizationQueue } from '@/features/delinquency/application/load-regularization-queue'
import { clientNames } from '@/features/delinquency/db/client-names'
import { receiptLinks } from '@/features/delinquency/db/receipt-storage'
import { regularizationQueueRepository } from '@/features/delinquency/db/regularization-queue-repository'
import { QUEUE_LIMIT } from '../constants/queue-strings'

export type QueueViewModel = { status: 'error' } | { status: 'ready'; queue: RegularizationQueue }

// Con la sesión de la administradora (la página ya la exige): la RLS y el bucket solo dejan leer a staff.
export const regularizationQueueService = {
  async load(): Promise<QueueViewModel> {
    const db = await createClient()
    const result = await loadRegularizationQueue({
      requests: regularizationQueueRepository(db),
      names: clientNames(db),
      receipts: receiptLinks(db),
    })(QUEUE_LIMIT)
    return isErr(result) ? { status: 'error' } : { status: 'ready', queue: result.value }
  },
}
