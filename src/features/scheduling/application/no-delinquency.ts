import type { DelinquencyPort, DelinquentClientsPort } from './ports'

export const noDelinquencyYet: DelinquencyPort = {
  async hasActiveDelinquency() {
    return false
  },
}

export const noDelinquentClientsYet: DelinquentClientsPort = {
  async listWithActiveDelinquency() {
    return new Set<string>()
  },
}
