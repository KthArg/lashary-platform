import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ClientsDelinquencyFilter, CLIENTS_DELINQUENCY_FILTER_TEXTS, DELINQUENCY_FILTER_VALUES } from '@/features/clients'

const mockPush = vi.fn()
let currentSearch = ''

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/admin/clients',
  useSearchParams: () => new URLSearchParams(currentSearch),
}))

const [ACTIVE, PENDING_REVIEW, NONE] = DELINQUENCY_FILTER_VALUES

const select = () => screen.getByLabelText(CLIENTS_DELINQUENCY_FILTER_TEXTS.selectLabel) as HTMLSelectElement
const submit = () => fireEvent.click(screen.getByRole('button', { name: CLIENTS_DELINQUENCY_FILTER_TEXTS.submit }))

describe('ClientsDelinquencyFilter', () => {
  beforeEach(() => {
    mockPush.mockClear()
    currentSearch = ''
  })

  it('criterio 2: ofrece Todas, Activa, Por revisar y Sin morosidad en un selector con su etiqueta', () => {
    render(<ClientsDelinquencyFilter />)
    const labels = within(select()).getAllByRole('option').map((option) => option.textContent)
    expect(labels).toEqual([
      CLIENTS_DELINQUENCY_FILTER_TEXTS.allOption,
      CLIENTS_DELINQUENCY_FILTER_TEXTS.options[ACTIVE],
      CLIENTS_DELINQUENCY_FILTER_TEXTS.options[PENDING_REVIEW],
      CLIENTS_DELINQUENCY_FILTER_TEXTS.options[NONE],
    ])
    expect(screen.getByRole('search', { name: CLIENTS_DELINQUENCY_FILTER_TEXTS.formLabel })).toBeTruthy()
  })

  it('criterio 2: al enviar escribe el estado elegido en la URL', () => {
    render(<ClientsDelinquencyFilter />)
    fireEvent.change(select(), { target: { value: PENDING_REVIEW } })
    submit()
    expect(mockPush).toHaveBeenCalledWith(`/admin/clients?delinquency=${PENDING_REVIEW}`)
  })

  it('no filtra al elegir: solo al enviar con su boton', () => {
    render(<ClientsDelinquencyFilter />)
    fireEvent.change(select(), { target: { value: ACTIVE } })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('conserva nombre y fechas y vuelve a la primera pagina', () => {
    currentSearch = 'name=ana&appointmentFrom=2026-04-01&appointmentTo=2026-06-30&page=3'
    render(<ClientsDelinquencyFilter />)
    fireEvent.change(select(), { target: { value: NONE } })
    submit()
    expect(mockPush).toHaveBeenCalledWith(
      `/admin/clients?name=ana&appointmentFrom=2026-04-01&appointmentTo=2026-06-30&delinquency=${NONE}`,
    )
  })

  it('muestra el estado activo y Todas lo quita sin tocar el resto', () => {
    currentSearch = `name=ana&delinquency=${ACTIVE}`
    render(<ClientsDelinquencyFilter delinquency={ACTIVE} />)
    expect(select().value).toBe(ACTIVE)
    fireEvent.change(select(), { target: { value: '' } })
    submit()
    expect(mockPush).toHaveBeenCalledWith('/admin/clients?name=ana')
  })
})
