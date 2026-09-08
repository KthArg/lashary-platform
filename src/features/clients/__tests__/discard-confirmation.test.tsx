import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { AddClientDialog, CLIENTS_CONFIRM_MESSAGES, CLIENTS_BUTTON_TEXTS, CLIENTS_LABELS } from '@/features/clients'
import { CONFIRM_DIALOG_TEXTS } from '@/shared/components'

afterEach(cleanup)

const openFormWithData = (value = 'Ana Solís') => {
  render(<AddClientDialog />)
  fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.addClient }))
  const nameInput = screen.getByLabelText(CLIENTS_LABELS.fullNameInput) as HTMLInputElement
  fireEvent.change(nameInput, { target: { value } })
  return nameInput
}

describe('US-CLI-05 · descarte confirmado del formulario en curso', () => {
  it('con datos escritos, Cancelar abre el diálogo propio del proyecto y no el del navegador', () => {
    const nativeConfirm = vi.fn()
    ;(window as unknown as { confirm: unknown }).confirm = nativeConfirm

    openFormWithData()
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.cancel }))

    expect(nativeConfirm).not.toHaveBeenCalled()
    const confirmDialog = screen.getByRole('alertdialog')
    expect(confirmDialog.textContent).toContain(CLIENTS_CONFIRM_MESSAGES.discardFormTitle)
    expect(confirmDialog.textContent).toContain(CLIENTS_CONFIRM_MESSAGES.discardForm)
  })

  it('"Seguir editando" conserva los datos ya escritos', () => {
    const nameInput = openFormWithData('Ana Solís')
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.cancel }))
    fireEvent.click(screen.getByRole('button', { name: CONFIRM_DIALOG_TEXTS.cancel }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(nameInput.value).toBe('Ana Solís')
  })

  it('"Descartar cambios" cierra el formulario y lo reabre vacío y escribible', () => {
    openFormWithData('Ana Solís')
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.cancel }))
    fireEvent.click(screen.getByRole('button', { name: CONFIRM_DIALOG_TEXTS.confirm }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.addClient }))
    const reopened = screen.getByLabelText(CLIENTS_LABELS.fullNameInput) as HTMLInputElement
    expect(reopened.value).toBe('')
    fireEvent.change(reopened, { target: { value: 'Beatriz' } })
    expect(reopened.value).toBe('Beatriz')
  })

  it('sin datos escritos, Cancelar cierra directo y no pregunta nada', () => {
    render(<AddClientDialog />)
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.addClient }))
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.cancel }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Escape con datos pregunta, y un segundo Escape vuelve al formulario sin perderlo', () => {
    const nameInput = openFormWithData('Ana Solís')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByRole('dialog')).not.toBeNull()
    expect(nameInput.value).toBe('Ana Solís')
  })

  it('el foco entra en la salida segura, no en la destructiva (UI-004)', () => {
    openFormWithData()
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.cancel }))

    expect(document.activeElement).toBe(screen.getByRole('button', { name: CONFIRM_DIALOG_TEXTS.cancel }))
  })
})
