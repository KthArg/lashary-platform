import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { uploadReceipt } from '@/features/delinquency/application/upload-receipt'
import { loadMyAccount, submitRegularization } from '@/features/delinquency/application/submit-regularization'
import { regularizationRepository } from '@/features/delinquency/db/regularization-repository'
import { currentClient, receiptStorage } from '@/features/delinquency/db/receipt-storage'
import { performLoadMyAccount, performSubmitRegularization, type RegularizationDeps } from '../utils/perform-regularization'
import type { LoadMyAccountResult, SubmitRegularizationResult } from '../types/regularization-results'

// Todo con la sesión de la clienta: la base y el bucket deciden qué puede hacer (SEC-001); nunca la service-role key.
async function createDeps(): Promise<RegularizationDeps> {
  const db = await createClient()
  const requests = regularizationRepository(db)
  return {
    isClient: async () => {
      const session = await getAuthSession()
      return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
    },
    submit: submitRegularization({
      upload: uploadReceipt({ storage: receiptStorage(db), currentClient: currentClient(db), newId: () => crypto.randomUUID() }),
      requests,
    }),
    loadMyAccount: loadMyAccount(requests),
  }
}

export const regularizationService = {
  async submit(fields: { caseId: unknown; declaredAmount: unknown; reference: unknown; receipt: unknown }): Promise<SubmitRegularizationResult> {
    return performSubmitRegularization(fields, await createDeps())
  },

  async loadMyAccount(): Promise<LoadMyAccountResult> {
    return performLoadMyAccount(await createDeps())
  },
}
