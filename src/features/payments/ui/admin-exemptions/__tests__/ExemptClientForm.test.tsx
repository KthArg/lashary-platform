import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExemptClientForm } from '../components/ExemptClientForm'
import { exemptionMessages } from '../constants/exemption-strings'

const mockSearch = vi.fn()
const mockExempt = vi.fn()
vi.mock('../actions/exemption-actions', () => ({
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

    fireEvent.change(screen.getByLabelText(exemptionMessages.searchLabel), { target: { value: 'nadie' } })
    fireEvent.click(screen.getByRole('button', { name: exemptionMessages.searchLabel }))

    expect((await screen.findByText(exemptionMessages.noResults)).textContent).toBe(exemptionMessages.noResults)
    expect(mockSearch).toHaveBeenCalledWith('nadie')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('si la búsqueda falla, muestra un error distinto de "sin resultados"', async () => {
    mockSearch.mockResolvedValue({ ok: false })
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(exemptionMessages.searchLabel), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: exemptionMessages.searchLabel }))

    expect((await screen.findByRole('alert')).textContent).toBe(exemptionMessages.searchFailed)
    expect(screen.queryByText(exemptionMessages.noResults)).toBeNull()
  })

  it('tras exonerar con éxito, oculta la clienta seleccionada y el formulario de razón', async () => {
    mockSearch.mockResolvedValue({ ok: true, clients: [CLIENT] })
    mockExempt.mockResolvedValue({ status: 'ok', message: exemptionMessages.savedOk })
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(exemptionMessages.searchLabel), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: exemptionMessages.searchLabel }))
    fireEvent.click(await screen.findByRole('button', { name: /Ana Solís/ }))
    fireEvent.change(screen.getByLabelText(exemptionMessages.reasonLabel), { target: { value: 'caso especial' } })
    fireEvent.click(screen.getByRole('button', { name: exemptionMessages.submit }))

    expect((await screen.findByRole('status')).textContent).toBe(exemptionMessages.savedOk)
    expect(screen.queryByLabelText(exemptionMessages.reasonLabel)).toBeNull()
    expect(screen.queryByRole('button', { name: /Ana Solís/ })).toBeNull()
  })

  it('busca, selecciona un resultado y envía la exoneración con su id y la razón', async () => {
    mockSearch.mockResolvedValue({ ok: true, clients: [CLIENT] })
    mockExempt.mockResolvedValue({ status: 'ok', message: exemptionMessages.savedOk })
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(exemptionMessages.searchLabel), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: exemptionMessages.searchLabel }))

    const result = await screen.findByRole('button', { name: /Ana Solís/ })
    fireEvent.click(result)

    fireEvent.change(screen.getByLabelText(exemptionMessages.reasonLabel), { target: { value: 'caso especial' } })
    fireEvent.click(screen.getByRole('button', { name: exemptionMessages.submit }))

    await waitFor(() => expect(mockExempt).toHaveBeenCalled())
    const formData = mockExempt.mock.calls[0][1] as FormData
    expect(formData.get('clientId')).toBe(CLIENT.id)
    expect(formData.get('reason')).toBe('caso especial')
  })

  it('el aviso de un envío anterior desaparece al buscar de nuevo', async () => {
    mockSearch.mockResolvedValue({ ok: true, clients: [CLIENT] })
    mockExempt.mockResolvedValue({ status: 'conflict', message: exemptionMessages.alreadyExempt })
    render(<ExemptClientForm />)

    fireEvent.change(screen.getByLabelText(exemptionMessages.searchLabel), { target: { value: 'ana' } })
    fireEvent.click(screen.getByRole('button', { name: exemptionMessages.searchLabel }))
    fireEvent.click(await screen.findByRole('button', { name: /Ana Solís/ }))
    fireEvent.change(screen.getByLabelText(exemptionMessages.reasonLabel), { target: { value: 'otra vez' } })
    fireEvent.click(screen.getByRole('button', { name: exemptionMessages.submit }))
    expect((await screen.findByRole('alert')).textContent).toBe(exemptionMessages.alreadyExempt)

    fireEvent.click(screen.getByRole('button', { name: exemptionMessages.searchLabel }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('sin clienta seleccionada, no muestra el formulario de razón', () => {
    render(<ExemptClientForm />)
    expect(screen.queryByLabelText(exemptionMessages.reasonLabel)).toBeNull()
  })
})
