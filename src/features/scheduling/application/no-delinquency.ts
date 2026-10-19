import type { DelinquencyPort } from './ports'

export const noDelinquencyYet: DelinquencyPort = {
  async hasActiveDelinquency() {
    return false
  },
}
