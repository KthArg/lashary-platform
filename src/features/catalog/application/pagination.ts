export type Page<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

export const clampPage = (value: number | undefined): number =>
  Math.max(1, Math.trunc(value ?? 1) || 1)

export const clampPageSize = (value: number | undefined): number =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(value ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE))
