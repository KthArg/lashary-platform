import type { ClientsListUrlChanges } from '../types/clients-list-url.types'


export function buildClientsListUrl(
  pathname: string,
  currentQuery: string,
  changes: ClientsListUrlChanges,
): string {
  const params = new URLSearchParams(currentQuery)

  if (changes.name !== undefined) {
    const trimmed = changes.name?.trim() ?? ''
    if (trimmed) params.set('name', trimmed)
    else params.delete('name')
  }

  if (changes.pageSize !== undefined) {
    if (changes.pageSize === null) params.delete('pageSize')
    else params.set('pageSize', String(changes.pageSize))
  }

  if (changes.page !== undefined) {
    if (changes.page === null) params.delete('page')
    else params.set('page', String(changes.page))
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
