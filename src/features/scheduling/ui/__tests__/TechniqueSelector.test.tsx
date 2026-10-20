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
    render(<TechniqueSelector techniques={[{ id: 't1', name: 'Volumen ruso' }]} />)
    fireEvent.click(screen.getByLabelText('Volumen ruso'))
    fireEvent.click(screen.getByRole('button', { name: schedulingMessages.selector.submit }))
    const link = await screen.findByRole('link', { name: schedulingMessages.selector.seeSlots })
    expect(link.getAttribute('href')).toBe('/portal/citas/calendario?servicio=t1.retoque')
  })
})
