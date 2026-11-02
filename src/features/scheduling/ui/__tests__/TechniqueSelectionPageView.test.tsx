import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { TechniqueSelectionPageView } from '../TechniqueSelectionPageView'
import { schedulingMessages } from '../messages'
import { MY_APPOINTMENTS_PATH } from '../my-appointments/constants/my-appointments-strings'

afterEach(cleanup)

describe('TechniqueSelectionPageView', () => {
  it('forbidden: muestra el mensaje de acceso denegado, sin lista ni formulario', () => {
    render(<TechniqueSelectionPageView data={{ status: 'forbidden' }} />)

    expect(screen.getByRole('alert').textContent).toBe(schedulingMessages.selector.accessDenied)
    expect(screen.queryByText(schedulingMessages.selector.chooseTechnique)).toBeNull()
  })

  it('forbidden: no ofrece el enlace a mis citas', () => {
    render(<TechniqueSelectionPageView data={{ status: 'forbidden' }} />)

    expect(screen.queryByRole('link', { name: schedulingMessages.page.myAppointments })).toBeNull()
  })

  it('ok: ofrece un enlace a mis citas, con técnicas o sin ellas, para llegar a cancelar sin escribir la URL', () => {
    const { unmount } = render(
      <TechniqueSelectionPageView data={{ status: 'ok', techniques: [], packages: [] }} />,
    )
    expect(screen.getByRole('link', { name: schedulingMessages.page.myAppointments }).getAttribute('href')).toBe(
      MY_APPOINTMENTS_PATH,
    )
    unmount()

    render(
      <TechniqueSelectionPageView
        data={{ status: 'ok', techniques: [{ id: 't1', name: 'Volumen ruso' }], packages: [] }}
      />,
    )
    expect(screen.getByRole('link', { name: schedulingMessages.page.myAppointments }).getAttribute('href')).toBe(
      MY_APPOINTMENTS_PATH,
    )
  })

  it('ok sin técnicas: estado vacío (UI-003)', () => {
    render(<TechniqueSelectionPageView data={{ status: 'ok', techniques: [], packages: [] }} />)

    expect(screen.getByText(schedulingMessages.page.empty)).toBeTruthy()
  })

  it('ok con técnicas: renderiza el selector', () => {
    render(
      <TechniqueSelectionPageView
        data={{ status: 'ok', techniques: [{ id: 't1', name: 'Volumen ruso' }], packages: [] }}
      />,
    )

    expect(screen.getByText('Volumen ruso')).toBeTruthy()
  })

  it('ok con paquetes: el cliente puede elegir un paquete en vez de una técnica (US-AGE-04, criterio 1)', () => {
    render(
      <TechniqueSelectionPageView
        data={{
          status: 'ok',
          techniques: [{ id: 't1', name: 'Volumen ruso' }],
          packages: [{ id: 'p1', name: 'Combo clásicas', isActive: true, durationTotalMin: 110 }],
        }}
      />,
    )

    expect(screen.getByText('Combo clásicas')).toBeTruthy()
    expect(screen.getByText(schedulingMessages.selector.packageDuration(110))).toBeTruthy()
    expect(
      screen.getByRole('link', { name: schedulingMessages.selector.seePackageSlots }).getAttribute('href'),
    ).toBe('/portal/citas/calendario?servicio=pkg%3Ap1')
  })

  it('sin paquetes activos, la sección de paquetes no se muestra', () => {
    render(
      <TechniqueSelectionPageView
        data={{ status: 'ok', techniques: [{ id: 't1', name: 'Volumen ruso' }], packages: [] }}
      />,
    )

    expect(screen.queryByText(schedulingMessages.selector.choosePackage)).toBeNull()
  })
})
