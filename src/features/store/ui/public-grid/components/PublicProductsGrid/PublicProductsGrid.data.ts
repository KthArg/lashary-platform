import { sanitizeUrl } from '../../../../domain/product'

export type RetryButtonModel = { mode: 'active'; href: string } | { mode: 'inactive' }

export function getRetryButton(retryUrl?: string): RetryButtonModel {
  if (!retryUrl) return { mode: 'inactive' }
  const href = sanitizeUrl(retryUrl)
  if (!href) return { mode: 'inactive' }
  return { mode: 'active', href }
}
