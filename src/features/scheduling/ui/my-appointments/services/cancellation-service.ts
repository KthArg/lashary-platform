import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { cancelAppointment, quoteCancellation } from '../../../application/cancel-appointment'
import { createSupabaseCancellationRepository } from '../../../db/cancellation-repository'
import { performCancelAppointment, performQuoteCancellation, type CancellationDeps } from '../utils/perform-cancellation'
import type { CancelAppointmentResult, QuoteCancellationResult } from '../types/cancellation-results'

async function createDeps(): Promise<CancellationDeps> {
  const cancellations = createSupabaseCancellationRepository(await createClient())
  return {
    isClient: async () => {
      const session = await getAuthSession()
      return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
    },
    quote: quoteCancellation(cancellations),
    cancel: cancelAppointment(cancellations),
  }
}

export const cancellationService = {
  async quote(appointmentId: unknown): Promise<QuoteCancellationResult> {
    return performQuoteCancellation(appointmentId, await createDeps())
  },

  async cancel(appointmentId: unknown, expectedForfeitedDeposit: unknown): Promise<CancelAppointmentResult> {
    return performCancelAppointment(appointmentId, expectedForfeitedDeposit, await createDeps())
  },
}
