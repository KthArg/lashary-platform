import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { REAPPLICATION_SETTINGS_PATH, reapplicationSettingsMessages as copy } from '../constants/reapplication-settings-strings'
import { ReapplicationSettingsView } from '../components/ReapplicationSettingsView'

vi.mock('../actions/reapplication-settings-actions', () => ({
  setAnticipationDaysAction: vi.fn(),
}))

afterEach(cleanup)

describe('ReapplicationSettingsView', () => {
  it('con la configuración cargada muestra el título y el formulario con los días vigentes', () => {
    render(<ReapplicationSettingsView view={{ status: 'ready', anticipationDays: 7 }} />)

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
    const input = screen.getByLabelText(copy.label) as HTMLInputElement
    expect(input.value).toBe('7')
    expect(screen.getByRole('button', { name: copy.save })).toBeTruthy()
  })

  it('si falló la carga avisa con role=alert y ofrece reintentar, sin formulario (UI-003)', () => {
    render(<ReapplicationSettingsView view={{ status: 'error' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.loadFailed)
    expect(screen.getByRole('link', { name: copy.reload }).getAttribute('href')).toBe(REAPPLICATION_SETTINGS_PATH)
    expect(screen.queryByLabelText(copy.label)).toBeNull()
  })
})
