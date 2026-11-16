import { ok } from '@/shared/result'
import type { DelinquencyPort, DelinquentClientsPort } from './ports'

// Una clienta que nunca está bloqueada: para las pruebas que ejercen la reserva sin morosidad. La reserva real usa
// `createSupabaseDelinquencyPort` (db/delinquency-block-repository.ts).
export const noDelinquencyYet: DelinquencyPort = {
  async activeBlock() {
    return ok(null)
  },
}

// Una agenda sin clientas morosas: para las pruebas. La agenda real usa `createSupabaseDelinquentClientsPort`
// (db/delinquent-clients-repository.ts).
export const noDelinquentClientsYet: DelinquentClientsPort = {
  async listWithActiveDelinquency() {
    return ok(new Set<string>())
  },
}
