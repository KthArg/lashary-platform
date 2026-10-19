export const CONTENT_ERROR_CODES = {
  cmsUnavailable: 'CMS_UNAVAILABLE',
} as const

export interface CmsUnavailable {
  readonly code: typeof CONTENT_ERROR_CODES.cmsUnavailable
  readonly message: string
  readonly key: string
  readonly reason: string
}

export function cmsUnavailable(key: string, reason: string): CmsUnavailable {
  return {
    code: CONTENT_ERROR_CODES.cmsUnavailable,
    message: `CMS no disponible para '${key}': ${reason}`,
    key,
    reason,
  }
}

export const isCmsUnavailable = (error: unknown): error is CmsUnavailable =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === CONTENT_ERROR_CODES.cmsUnavailable
