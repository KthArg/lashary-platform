import { ok } from '@/shared/result'
import type { DelinquencyPort, DelinquentClientsPort } from './ports'

// Una clienta que nunca está bloqueada: para las pruebas que ejercen la reserva sin morosidad. La reserva real usa
// `createSupabaseDelinquencyPort` (db/delinquency-block-repository.ts).
export const noDelinquencyYet: DelinquencyPort = {
  async activeBlock() {
    return ok(null)
  },
}

export const noDelinquentClientsYet: DelinquentClientsPort = {
  async listWithActiveDelinquency() {
    return ok(new Set<string>())
  },
}
