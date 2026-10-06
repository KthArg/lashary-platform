'use client'

import { useInactivityTimeout } from '../../hooks/useInactivityTimeout'
import type { InactivityTimeoutProps } from './InactivityTimeout.types'

export function InactivityTimeout({ timeoutMs, enabled = true }: InactivityTimeoutProps) {
  useInactivityTimeout({ timeoutMs, enabled })
  return null
}
