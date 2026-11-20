import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientsAppointmentFilter, CLIENTS_APPOINTMENT_FILTER_TEXTS } from '@/features/clients'

const mockPush = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/clients',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

const fromField = () => screen.getByLabelText(CLIENTS_APPOINTMENT_FILTER_TEXTS.fromLabel) as HTMLInputElement
const toField = () => screen.getByLabelText(CLIENTS_APPOINTMENT_FILTER_TEXTS.toLabel) as HTMLInputElement
const submit = () => fireEvent.click(screen.getByRole('button', { name: CLIENTS_APPOINTMENT_FILTER_TEXTS.submit }))

describe('ClientsAppointmentFilter', () => {
  beforeEach(() => {
    mockPush.mockClear()
    currentSearch = ''
  })

  it('criterio 2: filtra por rango de fechas de ultima visita con dos campos de fecha', () => {
    render(<ClientsAppointmentFilter />)
    expect(fromField().type).toBe('date')
    expect(toField().type).toBe('date')
    fireEvent.change(fromField(), { target: { value: '2026-04-01' } })
    fireEvent.change(toField(), { target: { value: '2026-06-30' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?appointmentFrom=2026-04-01&appointmentTo=2026-06-30')
  })

  it('con un solo extremo deja el otro fuera de la consulta', () => {
    render(<ClientsAppointmentFilter />)
    fireEvent.change(toField(), { target: { value: '2026-06-30' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?appointmentTo=2026-06-30')
  })

  it('conserva el filtro por nombre y vuelve a la primera pagina', () => {
    currentSearch = 'name=ana&page=3'
    render(<ClientsAppointmentFilter />)
    fireEvent.change(fromField(), { target: { value: '2026-04-01' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?name=ana&appointmentFrom=2026-04-01')
  })

  it('muestra el rango activo y lo quita sin tocar el nombre', () => {
    currentSearch = 'name=ana&appointmentFrom=2026-04-01&appointmentTo=2026-06-30'
    render(<ClientsAppointmentFilter appointmentFrom="2026-04-01" appointmentTo="2026-06-30" />)
    expect(fromField().value).toBe('2026-04-01')
    expect(toField().value).toBe('2026-06-30')
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_APPOINTMENT_FILTER_TEXTS.clear }))
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?name=ana')
  })

  it('sin rango activo no ofrece quitarlo', () => {
    render(<ClientsAppointmentFilter />)
    expect(screen.queryByRole('button', { name: CLIENTS_APPOINTMENT_FILTER_TEXTS.clear })).toBeNull()
  })
})
