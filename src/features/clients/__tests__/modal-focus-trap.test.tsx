import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { AddClientDialog, CLIENTS_BUTTON_TEXTS, CLIENTS_LABELS } from '@/features/clients'

afterEach(cleanup)

/**
 * UI-004 — hallazgo de la revision del PR: el modal declaraba role="dialog" aria-modal
 * pero el Tab se escapaba de la tarjeta al resto de la pagina.
 */
const openModal = () => {
  render(<AddClientDialog />)
  const trigger = screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.addClient })
  trigger.focus()
  fireEvent.click(trigger)
  return trigger
}

const card = () => screen.getByRole('dialog').querySelector('div') as HTMLElement

describe('US-CLI-05 · el modal de alta atrapa el foco (UI-004)', () => {
  it('al abrir, el foco entra en el primer control del dialogo', () => {
    openModal()
    expect(card().contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(screen.getByLabelText(CLIENTS_LABELS.fullNameInput))
  })

  it('Tab desde el ultimo control vuelve al primero, no se sale de la tarjeta', () => {
    openModal()
    const save = screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.save })
    save.focus()

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(document.activeElement).toBe(screen.getByLabelText(CLIENTS_LABELS.fullNameInput))
  })

  it('Shift+Tab desde el primer control salta al ultimo, sin pasar por la pagina', () => {
    openModal()
    const firstField = screen.getByLabelText(CLIENTS_LABELS.fullNameInput)
    firstField.focus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    expect(document.activeElement).toBe(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.save }))
  })

  it('si el foco se escapo de la tarjeta, el siguiente Tab lo devuelve adentro', () => {
    const trigger = openModal()
    trigger.focus()
    expect(card().contains(document.activeElement)).toBe(false)

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(card().contains(document.activeElement)).toBe(true)
  })

  it('al cerrar sin datos, el foco vuelve al boton Agregar', () => {
    const trigger = openModal()

    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.cancel }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
