import { ok } from '@/shared/result'
import type { DelinquencyPort, DelinquentClientsPort } from './ports'

export const noDelinquencyYet: DelinquencyPort = {
  async hasActiveDelinquency() {
    return false
  },
}

export const noDelinquentClientsYet: DelinquentClientsPort = {
  async listWithActiveDelinquency() {
    return ok(new Set<string>())
  },
}
