import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import {
  ClientsList,
  CLIENTS_ARIA_LABELS, CLIENTS_BUTTON_TEXTS, CLIENTS_CONFIRM_MESSAGES, CLIENTS_LABELS,
} from '@/features/clients'
import { TEST_CLIENTS } from './fixtures/clients'

/**
 * US-CLI-05 criterio 2 — editar una clienta existente.
 * La prueba clave es la tercera: `isDirty` media antes "hay algo escrito", y como el formulario
 * de edicion nace lleno, cancelar sin tocar nada disparaba la confirmacion de descarte.
 */
const [first, second] = TEST_CLIENTS

const openEditorFor = (fullName: string) =>
  fireEvent.click(screen.getByRole('button', { name: CLIENTS_ARIA_LABELS.editClient(fullName) }))

const pencilFor = (fullName: string) =>
  screen.getByRole('button', { name: CLIENTS_ARIA_LABELS.editClient(fullName) })

const cancel = () => fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.cancel }))

afterEach(cleanup)

describe('EditClientDialog', () => {
  it('abre el modal de edicion con los datos de la clienta ya cargados', () => {
    render(<ClientsList clients={TEST_CLIENTS} />)
    openEditorFor(first.fullName)

    expect(screen.getByText(CLIENTS_LABELS.editClientTitle)).toBeTruthy()
    expect((screen.getByLabelText(CLIENTS_LABELS.fullNameInput) as HTMLInputElement).value).toBe(first.fullName)
    expect((screen.getByLabelText(CLIENTS_LABELS.phoneInput) as HTMLInputElement).value).toBe(first.phone)
    expect((screen.getByLabelText(CLIENTS_LABELS.emailInput) as HTMLInputElement).value).toBe(first.email)
  })

  it('carga los datos de la segunda clienta y no los de la primera', () => {
    render(<ClientsList clients={TEST_CLIENTS} />)
    openEditorFor(first.fullName)
    cancel()
    openEditorFor(second.fullName)

    expect((screen.getByLabelText(CLIENTS_LABELS.fullNameInput) as HTMLInputElement).value).toBe(second.fullName)
  })

  it('cierra sin preguntar nada cuando se cancela sin tocar ningun campo', () => {
    render(<ClientsList clients={TEST_CLIENTS} />)
    openEditorFor(first.fullName)
    cancel()

    expect(screen.queryByText(CLIENTS_CONFIRM_MESSAGES.discardEdits)).toBeNull()
    expect(screen.queryByText(CLIENTS_LABELS.editClientTitle)).toBeNull()
  })

  it('pide confirmacion al salir despues de cambiar un campo', () => {
    render(<ClientsList clients={TEST_CLIENTS} />)
    openEditorFor(first.fullName)
    fireEvent.change(screen.getByLabelText(CLIENTS_LABELS.fullNameInput), { target: { value: 'Otro nombre' } })
    cancel()

    expect(screen.getByText(CLIENTS_CONFIRM_MESSAGES.discardEdits)).toBeTruthy()
  })

  it('mantiene el modal abierto si se elige seguir editando', () => {
    render(<ClientsList clients={TEST_CLIENTS} />)
    openEditorFor(first.fullName)
    fireEvent.change(screen.getByLabelText(CLIENTS_LABELS.phoneInput), { target: { value: '+506 1111 2222' } })
    cancel()
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_CONFIRM_MESSAGES.discardCancel }))

    expect(screen.queryByText(CLIENTS_CONFIRM_MESSAGES.discardEdits)).toBeNull()
    expect(screen.getByText(CLIENTS_LABELS.editClientTitle)).toBeTruthy()
  })

  it('devuelve el foco al lapiz de esa fila al cerrar, no al primero de la lista', () => {
    render(<ClientsList clients={TEST_CLIENTS} />)
    openEditorFor(second.fullName)
    cancel()

    expect(document.activeElement).toBe(pencilFor(second.fullName))
  })

  it('reporta los datos editados al guardar y cierra el modal', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    render(<ClientsList clients={TEST_CLIENTS} />)
    openEditorFor(first.fullName)
    fireEvent.change(screen.getByLabelText(CLIENTS_LABELS.fullNameInput), { target: { value: 'Maria Fernandez Rojas' } })
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.save }))

    expect(log).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ fullName: 'Maria Fernandez Rojas' }))
    expect(screen.queryByText(CLIENTS_LABELS.editClientTitle)).toBeNull()
    log.mockRestore()
  })
})
