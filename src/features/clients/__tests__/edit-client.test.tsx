import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  ClientsList, CLIENTS_ARIA_LABELS, CLIENTS_BUTTON_TEXTS, CLIENTS_CONFIRM_MESSAGES, CLIENTS_ERROR_MESSAGES, CLIENTS_LABELS,
} from '@/features/clients'
import { CLIENT_FIXTURES } from './client-fixtures'

const mockUpdate = vi.fn()
vi.mock('../actions/clients-actions', () => ({
  updateClientAction: (...args: unknown[]) => mockUpdate(...args),
  createClientAction: vi.fn(),
  listClientsAction: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

/** US-CLI-05 criterio 2 — editar una clienta existente desde el lapiz de la lista. */
const [first, second] = CLIENT_FIXTURES
const pencilFor = (fullName: string) => screen.getByRole('button', { name: CLIENTS_ARIA_LABELS.editClient(fullName) })
const inputValue = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value
const openEditorFor = (fullName: string) => fireEvent.click(pencilFor(fullName))
const cancel = () => fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.cancel }))
const renderAndOpen = (fullName: string) => {
  render(<ClientsList clients={CLIENT_FIXTURES} />)
  openEditorFor(fullName)
}

beforeEach(() => { vi.clearAllMocks() })

describe('EditClientDialog', () => {
  it('abre con los datos de la clienta elegida, y no con los de la anterior al cambiar', () => {
    renderAndOpen(first.fullName)
    expect(screen.getByText(CLIENTS_LABELS.editClientTitle)).toBeTruthy()
    expect(inputValue(CLIENTS_LABELS.fullNameInput)).toBe(first.fullName)
    expect(inputValue(CLIENTS_LABELS.phoneInput)).toBe(first.phone)
    expect(inputValue(CLIENTS_LABELS.emailInput)).toBe(first.email)
    cancel()
    openEditorFor(second.fullName)
    expect(inputValue(CLIENTS_LABELS.fullNameInput)).toBe(second.fullName)
  })

  // `isDirty` media "hay algo escrito": el formulario de edicion nace lleno y cancelar preguntaba igual.
  it('cierra sin preguntar si no se toco nada, y devuelve el foco al lapiz de esa fila', () => {
    renderAndOpen(second.fullName)
    cancel()
    expect(screen.queryByText(CLIENTS_CONFIRM_MESSAGES.discardEdits)).toBeNull()
    expect(screen.queryByText(CLIENTS_LABELS.editClientTitle)).toBeNull()
    expect(document.activeElement).toBe(pencilFor(second.fullName))
  })

  it('pide confirmacion al salir con cambios, y seguir editando mantiene el modal', () => {
    renderAndOpen(first.fullName)
    fireEvent.change(screen.getByLabelText(CLIENTS_LABELS.fullNameInput), { target: { value: 'Otro nombre' } })
    cancel()
    expect(screen.getByText(CLIENTS_CONFIRM_MESSAGES.discardEdits)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_CONFIRM_MESSAGES.discardCancel }))
    expect(screen.queryByText(CLIENTS_CONFIRM_MESSAGES.discardEdits)).toBeNull()
    expect(screen.getByText(CLIENTS_LABELS.editClientTitle)).toBeTruthy()
  })

  it('criterio 2: guarda con updateClientAction usando el id de esa clienta y cierra', async () => {
    mockUpdate.mockResolvedValue({ ok: true, client: first })
    renderAndOpen(first.fullName)
    fireEvent.change(screen.getByLabelText(CLIENTS_LABELS.notesInput), { target: { value: 'Nueva nota' } })
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.save }))
    expect(mockUpdate).toHaveBeenCalledWith(first.id, expect.objectContaining({ notes: 'Nueva nota' }))
    await waitFor(() => expect(screen.queryByText(CLIENTS_LABELS.editClientTitle)).toBeNull())
  })

  it('si el servidor rechaza, el modal sigue abierto con su mensaje', async () => {
    mockUpdate.mockResolvedValue({ ok: false, error: CLIENTS_ERROR_MESSAGES.phoneTaken })
    renderAndOpen(first.fullName)
    fireEvent.change(screen.getByLabelText(CLIENTS_LABELS.phoneInput), { target: { value: '7012 5566' } })
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.save }))
    expect((await screen.findByRole('alert')).textContent).toBe(CLIENTS_ERROR_MESSAGES.phoneTaken)
    expect(screen.getByText(CLIENTS_LABELS.editClientTitle)).toBeTruthy()
  })
})
