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
    mockSearch.mockResolvedValue({ ok: true, clients: [] })
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(m.searchLabel), { target: { value: 'nadie' } })
    fireEvent.click(screen.getByRole('button', { name: m.searchLabel }))

    expect((await screen.findByText(m.noResults)).textContent).toBe(m.noResults)
    expect(mockSearch).toHaveBeenCalledWith('nadie')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('si la búsqueda falla, muestra un error distinto de "sin resultados"', async () => {
    mockSearch.mockResolvedValue({ ok: false })
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(m.searchLabel), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: m.searchLabel }))

    expect((await screen.findByRole('alert')).textContent).toBe(m.searchFailed)
    expect(screen.queryByText(m.noResults)).toBeNull()
  })

  it('tras exonerar con éxito, oculta la clienta seleccionada y el formulario de razón', async () => {
    mockSearch.mockResolvedValue({ ok: true, clients: [CLIENT] })
    mockExempt.mockResolvedValue({ status: 'ok', message: m.savedOk })
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(m.searchLabel), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: m.searchLabel }))
    fireEvent.click(await screen.findByRole('button', { name: /Ana Solís/ }))
    fireEvent.change(screen.getByLabelText(m.reasonLabel), { target: { value: 'caso especial' } })
    fireEvent.click(screen.getByRole('button', { name: m.submit }))

    expect((await screen.findByRole('status')).textContent).toBe(m.savedOk)
    expect(screen.queryByLabelText(m.reasonLabel)).toBeNull()
    expect(screen.queryByRole('button', { name: /Ana Solís/ })).toBeNull()
  })

  it('busca, selecciona un resultado y envía la exoneración con su id y la razón', async () => {
    mockSearch.mockResolvedValue({ ok: true, clients: [CLIENT] })
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

  it('el aviso de un envío anterior desaparece al buscar de nuevo', async () => {
    mockSearch.mockResolvedValue({ ok: true, clients: [CLIENT] })
    mockExempt.mockResolvedValue({ status: 'conflict', message: m.alreadyExempt })
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(m.searchLabel), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: m.searchLabel }))
    fireEvent.click(await screen.findByRole('button', { name: /Ana Solís/ }))
    fireEvent.change(screen.getByLabelText(m.reasonLabel), { target: { value: 'otra vez' } })
    fireEvent.click(screen.getByRole('button', { name: m.submit }))
    expect((await screen.findByRole('alert')).textContent).toBe(m.alreadyExempt)

    fireEvent.click(screen.getByRole('button', { name: m.searchLabel }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('sin clienta seleccionada, no muestra el formulario de razón', () => {
    render(<ExemptClientForm />)
    expect(screen.queryByLabelText(m.reasonLabel)).toBeNull()
  })
})
