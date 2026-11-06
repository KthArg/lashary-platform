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
          packages: [
            {
              id: 'p1',
              name: 'Combo clásicas',
              durationTotalMin: 110,
              techniqueNames: [],
              price: 20000,
              discountPercent: null,
              priceDiscounted: null,
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('Combo clásicas')).toBeTruthy()
    expect(screen.getByText(schedulingMessages.selector.packageDuration(110))).toBeTruthy()
    expect(
      screen.getByRole('link', { name: schedulingMessages.selector.seePackageSlots }).getAttribute('href'),
    ).toBe('/portal/citas/calendario?servicio=pkg%3Ap1')
  })

  it('un paquete activo muestra su precio y sus servicios incluidos (US-PROM-02, criterio 1)', () => {
    render(
      <TechniqueSelectionPageView
        data={{
          status: 'ok',
          techniques: [],
          packages: [
            {
              id: 'p1',
              name: 'Combo clásicas',
              durationTotalMin: 110,
              techniqueNames: ['Volumen ruso', 'Laminado de cejas'],
              price: 20000,
              discountPercent: null,
              priceDiscounted: null,
            },
          ],
        }}
      />,
    )

    expect(
      screen.getByText(schedulingMessages.selector.packageIncludes(['Volumen ruso', 'Laminado de cejas'])),
    ).toBeTruthy()
    expect(screen.getByText(/^₡20.000$/)).toBeTruthy()
    expect(screen.queryByText(schedulingMessages.selector.packagePromotionBadge)).toBeNull()
  })

  it('un paquete con promoción vigente destaca el descuento: insignia, precio anterior tachado y precio rebajado (US-PROM-02, criterio 2)', () => {
    render(
      <TechniqueSelectionPageView
        data={{
          status: 'ok',
          techniques: [],
          packages: [
            {
              id: 'p1',
              name: 'Combo clásicas',
              durationTotalMin: 110,
              techniqueNames: [],
              price: 20000,
              discountPercent: 10,
              priceDiscounted: 18000,
            },
          ],
        }}
      />,
    )

    expect(screen.getByText(schedulingMessages.selector.packagePromotionBadge)).toBeTruthy()
    expect(screen.getByText(/^₡20.000$/).closest('s')).not.toBeNull()
    expect(screen.getByText(/^₡18.000$/)).toBeTruthy()
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
