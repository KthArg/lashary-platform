import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientsPagination, CLIENTS_LIST_LIMITS, CLIENTS_PAGINATION_TEXTS } from '@/features/clients'

const mockPush = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/clients',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const hrefOf = (name: string) => screen.getByRole('link', { name }).getAttribute('href')

describe('ClientsPagination', () => {
  beforeEach(() => {
    mockPush.mockClear()
    currentSearch = ''
  })

  it('anuncia la pagina actual, el total de paginas y cuantas clientas hay', () => {
    render(<ClientsPagination page={1} pageSize={25} total={80} />)
    const status = screen.getByRole('navigation', { name: CLIENTS_PAGINATION_TEXTS.navLabel }).textContent
    expect(status).toContain(CLIENTS_PAGINATION_TEXTS.pageStatus(2, 4))
    expect(status).toContain(CLIENTS_PAGINATION_TEXTS.totalCount(80))
  })

  it('en la primera pagina no hay enlace Anterior y Siguiente lleva a la pagina 1', () => {
    render(<ClientsPagination page={0} pageSize={25} total={80} />)
    expect(screen.queryByRole('link', { name: CLIENTS_PAGINATION_TEXTS.previous })).toBeNull()
    expect(hrefOf(CLIENTS_PAGINATION_TEXTS.next)).toBe('/admin/clients?page=1')
  })

  it('en la ultima pagina no hay enlace Siguiente', () => {
    render(<ClientsPagination page={3} pageSize={25} total={80} />)
    expect(screen.queryByRole('link', { name: CLIENTS_PAGINATION_TEXTS.next })).toBeNull()
    expect(hrefOf(CLIENTS_PAGINATION_TEXTS.previous)).toBe('/admin/clients?page=2')
  })

  it('conserva el resto de la consulta al cambiar de pagina', () => {
    currentSearch = 'name=ana&pageSize=10'
    render(<ClientsPagination page={0} pageSize={10} total={30} />)
    expect(hrefOf(CLIENTS_PAGINATION_TEXTS.next)).toBe('/admin/clients?name=ana&pageSize=10&page=1')
  })

  it('ofrece solo los tamanos permitidos y al cambiarlo vuelve a la primera pagina', () => {
    currentSearch = 'page=3'
    render(<ClientsPagination page={3} pageSize={25} total={80} />)
    const select = screen.getByLabelText(CLIENTS_PAGINATION_TEXTS.pageSizeLabel) as HTMLSelectElement
    expect([...select.options].map((option) => Number(option.value))).toEqual([...CLIENTS_LIST_LIMITS.pageSizes])
    fireEvent.change(select, { target: { value: '50' } })
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?pageSize=50')
  })
})
