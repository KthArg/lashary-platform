import type { CmsImage } from '../domain/landing-content'

export const field = (source: unknown, name: string): unknown =>
  typeof source === 'object' && source !== null
    ? (source as Record<string, unknown>)[name]
    : undefined

export const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed !== '' && trimmed.length <= max ? trimmed : null
}

const SAFE_LINK = /^(\/(?!\/)|#|\?|https?:\/\/|mailto:|tel:)/i
export const link = (value: unknown): string | null => {
  const candidate = text(value, 2048)
  return candidate !== null && SAFE_LINK.test(candidate) ? candidate : null
}

export const integer = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null

export const paragraphsOf = (value: string): string[] =>
  value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')

export const dimension = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined

export function image(value: unknown, mediaBaseUrl: string): CmsImage | null {
  const url = text(field(value, 'url'), 2048)
  const alt = text(field(value, 'alt'), 500)
  if (url === null || alt === null) return null
  const resolved =
    url.startsWith('/') && !url.startsWith('//')
      ? `${mediaBaseUrl}${url}`
      : /^https:\/\//i.test(url)
        ? url
        : null
  if (resolved === null) return null
  const width = dimension(field(value, 'width'))
  const height = dimension(field(value, 'height'))
  return { url: resolved, alt, ...(width ? { width } : {}), ...(height ? { height } : {}) }
}
