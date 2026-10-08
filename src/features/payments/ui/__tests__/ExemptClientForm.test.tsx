import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExemptClientForm } from '../ExemptClientForm'
import { paymentsMessages } from '../messages'

const m = paymentsMessages.exemption

const mockSearch = vi.fn()
const mockExempt = vi.fn()
vi.mock('../actions', () => ({
  searchClientsAction: (...args: unknown[]) => mockSearch(...args),
  exemptClientAction: (...args: unknown[]) => mockExempt(...args),
}))

const CLIENT = { id: 'c-1', fullName: 'Ana Solís', phone: '8888 7777', email: '', notes: '' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ExemptClientForm', () => {
  it('busca, muestra "sin resultados" cuando no hay coincidencias', async () => {
    mockSearch.mockResolvedValue([])
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(m.searchLabel), { target: { value: 'nadie' } })
    fireEvent.click(screen.getByRole('button', { name: m.searchLabel }))

    expect((await screen.findByText(m.noResults)).textContent).toBe(m.noResults)
    expect(mockSearch).toHaveBeenCalledWith('nadie')
  })

  it('busca, selecciona un resultado y envía la exoneración con su id y la razón', async () => {
    mockSearch.mockResolvedValue([CLIENT])
    mockExempt.mockResolvedValue({ status: 'ok', message: m.savedOk })
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(m.searchLabel), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: m.searchLabel }))

    const result = await screen.findByRole('button', { name: /Ana Solís/ })
    fireEvent.click(result)

    fireEvent.change(screen.getByLabelText(m.reasonLabel), { target: { value: 'caso especial' } })
    fireEvent.click(screen.getByRole('button', { name: m.submit }))

    await waitFor(() => expect(mockExempt).toHaveBeenCalled())
    const formData = mockExempt.mock.calls[0][1] as FormData
    expect(formData.get('clientId')).toBe(CLIENT.id)
    expect(formData.get('reason')).toBe('caso especial')
  })

  it('sin clienta seleccionada, no muestra el formulario de razón', () => {
    render(<ExemptClientForm />)
    expect(screen.queryByLabelText(m.reasonLabel)).toBeNull()
  })
})
