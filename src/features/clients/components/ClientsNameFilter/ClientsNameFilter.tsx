'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CLIENTS_FILTER_TEXTS } from '../../constants/clients-strings'
import { CLIENTS_LIST_LIMITS } from '../../constants/client-form'
import { clientsNameFilterStyles as STYLES } from './ClientsNameFilter.styles'
import type { ClientsNameFilterProps } from './ClientsNameFilter.types'

export function ClientsNameFilter({ name = '' }: ClientsNameFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const applyName = (nextName: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const trimmed = nextName.trim()
    if (trimmed) params.set('name', trimmed)
    else params.delete('name')
    params.delete('page')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const field = new FormData(event.currentTarget).get('name')
    applyName(typeof field === 'string' ? field : '')
  }

  return (
    <form className={STYLES.form} onSubmit={onSubmit} role="search" aria-label={CLIENTS_FILTER_TEXTS.formLabel}>
      <div className={STYLES.field}>
        <label className={STYLES.label} htmlFor="clients-name-filter">
          {CLIENTS_FILTER_TEXTS.nameLabel}
        </label>
        <input
          id="clients-name-filter"
          name="name"
          type="search"
          defaultValue={name}
          key={name}
          maxLength={CLIENTS_LIST_LIMITS.nameFilterMaxLength}
          placeholder={CLIENTS_FILTER_TEXTS.namePlaceholder}
          className={STYLES.input}
        />
      </div>
      <button type="submit" className={STYLES.submitButton}>{CLIENTS_FILTER_TEXTS.submit}</button>
      {name ? (
        <button type="button" className={STYLES.clearButton} onClick={() => applyName('')}>
          {CLIENTS_FILTER_TEXTS.clear}
        </button>
      ) : null}
    </form>
  )
}
