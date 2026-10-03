import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PackagePagination } from '@/features/catalog/ui/packages/PackagePagination'

describe('PackagePagination', () => {
  it('no se muestra si todo cabe en una página', () => {
    const { container } = render(<PackagePagination page={1} pageSize={50} total={50} />)
    expect(container.innerHTML).toBe('')
  })

  it('en una página intermedia enlaza a la anterior y a la siguiente', () => {
    render(<PackagePagination page={2} pageSize={50} total={120} />)
    expect(screen.getByRole('link', { name: 'Anterior' }).getAttribute('href')).toBe(
      '/admin/catalog/packages?page=1',
    )
    expect(screen.getByRole('link', { name: 'Siguiente' }).getAttribute('href')).toBe(
      '/admin/catalog/packages?page=3',
    )
    expect(screen.getByText('Página 2 de 3')).toBeDefined()
  })

  it('en la última página no enlaza a una siguiente', () => {
    render(<PackagePagination page={3} pageSize={50} total={120} />)
    expect(screen.queryByRole('link', { name: 'Siguiente' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Anterior' })).toBeDefined()
  })
})
