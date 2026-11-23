import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { UNSUBSCRIBE_FIELDS, UNSUBSCRIBE_INTENTS, unsubscribeMessages as copy } from '../constants/unsubscribe-strings'
import { UnsubscribePage } from '../components/UnsubscribePage'

vi.mock('../actions/unsubscribe-actions', () => ({ changeSubscriptionAction: vi.fn() }))

afterEach(cleanup)

const SAMPLE_UUID = '3f2b8c1e-9d4a-4c6b-8e2f-1a7b5c9d0e3f'

describe('UnsubscribePage', () => {
  it('con un enlace válido pregunta antes de dar de baja: abrir el enlace no basta (criterio 4)', async () => {
    render(await UnsubscribePage({ params: Promise.resolve({ token: SAMPLE_UUID }) }))

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
    expect(screen.getByText(copy.question)).toBeTruthy()
    const button = screen.getByRole('button', { name: copy.unsubscribe }) as HTMLButtonElement
    const form = button.closest('form') as HTMLFormElement
    expect((form.elements.namedItem(UNSUBSCRIBE_FIELDS.token) as HTMLInputElement).value).toBe(SAMPLE_UUID)
    expect((form.elements.namedItem(UNSUBSCRIBE_FIELDS.intent) as HTMLInputElement).value).toBe(UNSUBSCRIBE_INTENTS.unsubscribe)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('con un enlace roto avisa y no ofrece el formulario', async () => {
    render(await UnsubscribePage({ params: Promise.resolve({ token: 'no-es-un-token' }) }))

    expect(screen.getByRole('alert').textContent).toContain(copy.invalid)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
