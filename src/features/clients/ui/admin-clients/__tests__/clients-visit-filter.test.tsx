import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientsVisitFilter, CLIENTS_VISIT_FILTER_TEXTS } from '@/features/clients'

const mockPush = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/clients',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

const fromField = () => screen.getByLabelText(CLIENTS_VISIT_FILTER_TEXTS.fromLabel) as HTMLInputElement
const toField = () => screen.getByLabelText(CLIENTS_VISIT_FILTER_TEXTS.toLabel) as HTMLInputElement
const submit = () => fireEvent.click(screen.getByRole('button', { name: CLIENTS_VISIT_FILTER_TEXTS.submit }))

describe('ClientsVisitFilter', () => {
  beforeEach(() => {
    mockPush.mockClear()
    currentSearch = ''
  })

  it('criterio 2: filtra por rango de fechas de ultima visita con dos campos de fecha', () => {
    render(<ClientsVisitFilter />)
    expect(fromField().type).toBe('date')
    expect(toField().type).toBe('date')
    fireEvent.change(fromField(), { target: { value: '2026-04-01' } })
    fireEvent.change(toField(), { target: { value: '2026-06-30' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?visitFrom=2026-04-01&visitTo=2026-06-30')
  })

  it('con un solo extremo deja el otro fuera de la consulta', () => {
    render(<ClientsVisitFilter />)
    fireEvent.change(toField(), { target: { value: '2026-06-30' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?visitTo=2026-06-30')
  })

  it('conserva el filtro por nombre y vuelve a la primera pagina', () => {
    currentSearch = 'name=ana&page=3'
    render(<ClientsVisitFilter />)
    fireEvent.change(fromField(), { target: { value: '2026-04-01' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?name=ana&visitFrom=2026-04-01')
  })

  it('muestra el rango activo y lo quita sin tocar el nombre', () => {
    currentSearch = 'name=ana&visitFrom=2026-04-01&visitTo=2026-06-30'
    render(<ClientsVisitFilter visitFrom="2026-04-01" visitTo="2026-06-30" />)
    expect(fromField().value).toBe('2026-04-01')
    expect(toField().value).toBe('2026-06-30')
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_VISIT_FILTER_TEXTS.clear }))
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?name=ana')
  })

  it('sin rango activo no ofrece quitarlo', () => {
    render(<ClientsVisitFilter />)
    expect(screen.queryByRole('button', { name: CLIENTS_VISIT_FILTER_TEXTS.clear })).toBeNull()
  })
})
