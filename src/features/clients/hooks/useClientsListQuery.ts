'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { buildClientsListUrl } from '../urls/clients-list-url'
import type { ClientsListUrlChanges } from '../types/clients-list-url.types'

export function useClientsListQuery() {
  const router = useRouter()
  const pathname = usePathname()
  const currentQuery = useSearchParams().toString()

  const urlWith = useCallback(
    (changes: ClientsListUrlChanges) => buildClientsListUrl(pathname, currentQuery, changes),
    [pathname, currentQuery],
  )

  const navigateWith = useCallback(
    (changes: ClientsListUrlChanges) => router.push(urlWith(changes)),
    [router, urlWith],
  )

  return { urlWith, navigateWith }
}
