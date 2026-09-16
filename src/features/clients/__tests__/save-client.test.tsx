import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddClientDialog, CLIENTS_BUTTON_TEXTS, CLIENTS_ERROR_MESSAGES, CLIENTS_LABELS } from '@/features/clients'

/** US-CLI-05 criterio 1 en la pantalla: el alta guarda por el server action, no en consola. */
const mockCreate = vi.fn()
vi.mock('../actions/clients-actions', () => ({ createClientAction: (...args: unknown[]) => mockCreate(...args) }))

const typeInto = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const clickSave = () => fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.save }))
const openFilledAddForm = () => {
  render(<AddClientDialog />)
  fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.addClient }))
  typeInto(CLIENTS_LABELS.fullNameInput, 'Ana Solís')
  typeInto(CLIENTS_LABELS.phoneInput, '8888 7777')
  typeInto(CLIENTS_LABELS.emailInput, 'ana@correo.com')
}

beforeEach(() => { vi.clearAllMocks() })

describe('AddClientDialog · guardar', () => {
  it('criterio 1: llama a createClientAction con lo escrito y cierra el modal', async () => {
    mockCreate.mockResolvedValue({ ok: true, client: { id: 'c-1' } })
    openFilledAddForm()
    clickSave()
    expect(mockCreate).toHaveBeenCalledWith({ fullName: 'Ana Solís', phone: '8888 7777', email: 'ana@correo.com', notes: '' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('si el servidor rechaza, el modal sigue abierto con su mensaje y lo escrito', async () => {
    mockCreate.mockResolvedValue({ ok: false, error: CLIENTS_ERROR_MESSAGES.saveFailed })
    openFilledAddForm()
    clickSave()
    expect((await screen.findByRole('alert')).textContent).toBe(CLIENTS_ERROR_MESSAGES.saveFailed)
    expect((screen.getByLabelText(CLIENTS_LABELS.fullNameInput) as HTMLInputElement).value).toBe('Ana Solís')
  })

  it('un fallo de red se muestra como error de guardado, sin excepcion sin atrapar', async () => {
    mockCreate.mockRejectedValue(new Error('network'))
    openFilledAddForm()
    clickSave()
    expect((await screen.findByRole('alert')).textContent).toBe(CLIENTS_ERROR_MESSAGES.saveFailed)
  })

  it('mientras guarda, el boton se deshabilita y Cancelar no cierra a medias', () => {
    mockCreate.mockReturnValue(new Promise(() => {}))
    openFilledAddForm()
    clickSave()
    const saving = screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.saving }) as HTMLButtonElement
    expect(saving.disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.cancel }))
    expect(screen.queryByRole('dialog')).not.toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
