import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { TechniqueSelectionPageView } from '../TechniqueSelectionPageView'
import { schedulingMessages } from '../messages'

afterEach(cleanup)

describe('TechniqueSelectionPageView', () => {
  it('forbidden: muestra el mensaje de acceso denegado, sin lista ni formulario', () => {
    render(<TechniqueSelectionPageView data={{ status: 'forbidden' }} />)

    expect(screen.getByRole('alert').textContent).toBe(schedulingMessages.selector.accessDenied)
    expect(screen.queryByText(schedulingMessages.selector.chooseTechnique)).toBeNull()
  })

  it('ok sin técnicas: estado vacío (UI-003)', () => {
    render(<TechniqueSelectionPageView data={{ status: 'ok', techniques: [] }} />)

    expect(screen.getByText(schedulingMessages.page.empty)).toBeTruthy()
  })

  it('ok con técnicas: renderiza el selector', () => {
    render(
      <TechniqueSelectionPageView
        data={{ status: 'ok', techniques: [{ id: 't1', name: 'Volumen ruso' }] }}
      />,
    )

    expect(screen.getByText('Volumen ruso')).toBeTruthy()
  })
})
