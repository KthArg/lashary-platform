import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientForm, EMPTY_CLIENT_FORM_VALUES, CLIENTS_ERROR_MESSAGES, CLIENTS_LABELS, CLIENTS_BUTTON_TEXTS } from '@/features/clients'

/**
 * US-CLI-05 criterio 1 — el resumen de errores debe desaparecer cuando ya no hay errores.
 * Defecto de la revision del PR: setErrors ponia la clave en undefined en vez de borrarla,
 * asi que Object.keys seguia contandola y el banner quedaba pegado con el formulario ya correcto.
 */
const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.save }))

const renderForm = () =>
  render(<ClientForm initialValues={EMPTY_CLIENT_FORM_VALUES} onSubmit={vi.fn()} onCancel={vi.fn()} onDirtyChange={vi.fn()} />)

describe('ClientForm — resumen de errores', () => {
  it('muestra el resumen al enviar con campos obligatorios vacios', () => {
    renderForm()
    submit()
    expect(screen.getByText(CLIENTS_ERROR_MESSAGES.formHasErrors)).toBeTruthy()
  })

  it('retira el resumen cuando la admin corrige todos los campos', () => {
    renderForm()
    submit()
    expect(screen.getByText(CLIENTS_ERROR_MESSAGES.formHasErrors)).toBeTruthy()

    fill(CLIENTS_LABELS.fullNameInput, 'Maria Fernandez Rojas')
    fill(CLIENTS_LABELS.phoneInput, '+506 8888 8888')
    fill(CLIENTS_LABELS.emailInput, 'maria@correo.com')

    expect(screen.queryByText(CLIENTS_ERROR_MESSAGES.formHasErrors)).toBeNull()
  })

  it('mantiene el resumen mientras quede al menos un campo invalido', () => {
    renderForm()
    submit()

    fill(CLIENTS_LABELS.fullNameInput, 'Maria Fernandez Rojas')
    fill(CLIENTS_LABELS.phoneInput, '+506 8888 8888')

    expect(screen.getByText(CLIENTS_ERROR_MESSAGES.formHasErrors)).toBeTruthy()
    expect(screen.getByText(CLIENTS_ERROR_MESSAGES.emailRequired)).toBeTruthy()
  })
})
