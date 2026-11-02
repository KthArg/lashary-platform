import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MAX_RESCHEDULE_LIMIT } from '../../../domain/reschedule-limit.constants'
import { ReschedulePolicyLoading } from '../components/ReschedulePolicyLoading'
import { ReschedulePolicyView } from '../components/ReschedulePolicyView'
import { RESCHEDULE_POLICY_PATH, reschedulePolicyMessages } from '../constants/reschedule-policy-strings'

const copy = reschedulePolicyMessages
const CURRENT_MAX = 1

const mockChange = vi.fn()
vi.mock('../actions/reschedule-policy-actions', () => ({
  changeRescheduleLimitAction: (previous: unknown, formData: FormData) => mockChange(previous, formData),
}))

beforeEach(() => {
  mockChange.mockReset()
})
afterEach(cleanup)

describe('ReschedulePolicyView', () => {
  it('con el tope cargado muestra el título y el formulario con la cifra vigente', () => {
    render(<ReschedulePolicyView view={{ status: 'ready', max: CURRENT_MAX }} />)

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
    expect((screen.getByLabelText(copy.limitLabel) as HTMLInputElement).value).toBe(String(CURRENT_MAX))
    expect(screen.getByRole('button', { name: copy.submit })).toBeTruthy()
  })

  it('explica qué significa la cifra vigente y la liga al campo', () => {
    render(<ReschedulePolicyView view={{ status: 'ready', max: 2 }} />)

    expect(screen.getByText(copy.limitHint(2))).toBeTruthy()
    expect(screen.getByLabelText(copy.limitLabel).getAttribute('aria-describedby')).toBeTruthy()
  })

  it('con cero dice que reagendar está desactivado', () => {
    render(<ReschedulePolicyView view={{ status: 'ready', max: 0 }} />)

    expect(screen.getByText(copy.limitHint(0))).toBeTruthy()
  })

  it('el campo solo admite enteros dentro del rango', () => {
    render(<ReschedulePolicyView view={{ status: 'ready', max: CURRENT_MAX }} />)
    const input = screen.getByLabelText(copy.limitLabel) as HTMLInputElement

    expect(input.min).toBe('0')
    expect(input.max).toBe(String(MAX_RESCHEDULE_LIMIT))
    expect(input.step).toBe('1')
  })

  it('si falló la carga avisa con role=alert y ofrece reintentar, sin formulario (UI-003)', () => {
    render(<ReschedulePolicyView view={{ status: 'error' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.loadFailed)
    expect(screen.getByRole('link', { name: copy.reload }).getAttribute('href')).toBe(RESCHEDULE_POLICY_PATH)
    expect(screen.queryByLabelText(copy.limitLabel)).toBeNull()
  })

  it('al guardar muestra el aviso de éxito', async () => {
    mockChange.mockResolvedValue({ status: 'ok', message: copy.saved(3) })
    render(<ReschedulePolicyView view={{ status: 'ready', max: CURRENT_MAX }} />)
    fireEvent.change(screen.getByLabelText(copy.limitLabel), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: copy.submit }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(copy.saved(3)))
  })

  it('si la acción rechaza la cifra muestra el error con role=alert', async () => {
    mockChange.mockResolvedValue({ status: 'invalid', message: copy.invalid(MAX_RESCHEDULE_LIMIT) })
    render(<ReschedulePolicyView view={{ status: 'ready', max: CURRENT_MAX }} />)
    fireEvent.click(screen.getByRole('button', { name: copy.submit }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(copy.invalid(MAX_RESCHEDULE_LIMIT)))
  })
})

describe('ReschedulePolicyLoading', () => {
  it('muestra el título y un estado de carga accesible', () => {
    render(<ReschedulePolicyLoading />)

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain(copy.loading)
  })
})
