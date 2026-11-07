import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { schedulingMessages } from '../messages'

const selectTechniqueAction = vi.hoisted(() => vi.fn())
vi.mock('../actions', () => ({ selectTechniqueAction }))
import { TechniqueSelector } from '../TechniqueSelector'

afterEach(cleanup)

describe('TechniqueSelector — enlace al calendario de US-AGE-02', () => {
  it('el resultado enlaza al calendario con el servicio elegido: retoque usa su propia clave', async () => {
    selectTechniqueAction.mockResolvedValue({ status: 'ok', selection: { techniqueId: 't1', isFirstTime: false, totalDurationMin: 60 } })
    render(<TechniqueSelector techniques={[{ id: 't1', name: 'Volumen ruso', discountPercent: null }]} />)
    fireEvent.click(screen.getByLabelText('Volumen ruso'))
    fireEvent.click(screen.getByRole('button', { name: schedulingMessages.selector.submit }))
    const link = await screen.findByRole('link', { name: schedulingMessages.selector.seeSlots })
    expect(link.getAttribute('href')).toBe('/portal/citas/calendario?servicio=t1.retoque')
  })

  it('una técnica con promoción vigente muestra la insignia con el porcentaje; una sin promoción, no (US-PROM-02, criterio 2)', () => {
    render(
      <TechniqueSelector
        techniques={[
          { id: 't1', name: 'Volumen ruso', discountPercent: 20 },
          { id: 't2', name: 'Laminado de cejas', discountPercent: null },
        ]}
      />,
    )
    expect(screen.getAllByText(schedulingMessages.selector.techniqueDiscountBadge(20))).toHaveLength(1)
    expect(screen.getByLabelText(/Volumen ruso/).closest('label')?.textContent).toContain('20% de descuento')
    expect(screen.getByLabelText('Laminado de cejas').closest('label')?.textContent).not.toContain('descuento')
  })
})
