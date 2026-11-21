import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientsClearFilters, CLIENTS_CLEAR_FILTERS_TEXTS, CLIENTS_PATH } from '@/features/clients'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

describe('ClientsClearFilters', () => {
  it('con algún filtro aplicado lleva al listado sin ningún parámetro en la URL', () => {
    render(<ClientsClearFilters hasActiveFilters />)
    const link = screen.getByRole('link', { name: CLIENTS_CLEAR_FILTERS_TEXTS.link })
    expect(link.getAttribute('href')).toBe(CLIENTS_PATH)
  })

  it('sin filtros aplicados no se muestra', () => {
    render(<ClientsClearFilters hasActiveFilters={false} />)
    expect(screen.queryByRole('link', { name: CLIENTS_CLEAR_FILTERS_TEXTS.link })).toBeNull()
  })
})
