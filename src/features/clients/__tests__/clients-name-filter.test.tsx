import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientsNameFilter, CLIENTS_FILTER_TEXTS, CLIENTS_LIST_LIMITS } from '@/features/clients'

const mockPush = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/clients',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

const searchField = () => screen.getByLabelText(CLIENTS_FILTER_TEXTS.nameLabel) as HTMLInputElement
const submit = () => fireEvent.click(screen.getByRole('button', { name: CLIENTS_FILTER_TEXTS.submit }))

describe('ClientsNameFilter', () => {
  beforeEach(() => {
    mockPush.mockClear()
    currentSearch = ''
  })

  it('busca escribiendo el nombre en la consulta', () => {
    render(<ClientsNameFilter />)
    fireEvent.change(searchField(), { target: { value: 'ana' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?name=ana')
  })

  it('vuelve a la primera pagina y conserva el tamano al filtrar', () => {
    currentSearch = 'page=3&pageSize=50'
    render(<ClientsNameFilter />)
    fireEvent.change(searchField(), { target: { value: 'ana' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?pageSize=50&name=ana')
  })

  it('muestra el filtro activo en el campo y lo quita sin dejar la consulta rota', () => {
    currentSearch = 'name=ana'
    render(<ClientsNameFilter name="ana" />)
    expect(searchField().value).toBe('ana')
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_FILTER_TEXTS.clear }))
    expect(mockPush).toHaveBeenCalledWith('/admin/clients')
  })

  it('sin filtro activo no ofrece quitarlo, y un texto en blanco no filtra', () => {
    render(<ClientsNameFilter />)
    expect(screen.queryByRole('button', { name: CLIENTS_FILTER_TEXTS.clear })).toBeNull()
    fireEvent.change(searchField(), { target: { value: '   ' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients')
  })

  it('no deja escribir mas de lo que la action acepta', () => {
    render(<ClientsNameFilter />)
    expect(searchField().maxLength).toBe(CLIENTS_LIST_LIMITS.nameFilterMaxLength)
  })
})
