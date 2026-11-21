import Link from 'next/link'
import { CLIENTS_PATH } from '../../../client-routes'
import { CLIENTS_CLEAR_FILTERS_TEXTS } from '../../constants/client-strings'
import { clientsClearFiltersStyles as STYLES } from './ClientsClearFilters.styles'
import type { ClientsClearFiltersProps } from './ClientsClearFilters.types'

export function ClientsClearFilters({ hasActiveFilters }: ClientsClearFiltersProps) {
  if (!hasActiveFilters) return null

  return (
    <Link href={CLIENTS_PATH} className={STYLES.link}>
      {CLIENTS_CLEAR_FILTERS_TEXTS.link}
    </Link>
  )
}
