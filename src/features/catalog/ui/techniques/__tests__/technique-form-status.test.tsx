import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/features/catalog/ui/techniques/actions/technique-actions', () => ({
  createTechniqueAction: vi.fn(),
  updateTechniqueAction: vi.fn(),
  checkTechniqueDeactivationAction: vi.fn(),
  deactivateTechniqueCascadeAction: vi.fn(),
  checkTechniqueReactivationAction: vi.fn(),
  reactivateTechniqueCascadeAction: vi.fn(),
}))

import { TechniqueForm } from '@/features/catalog/ui/techniques/components/TechniqueForm'
import { catalogMessages } from '@/features/catalog/ui/techniques/constants/technique-strings'
import { makeTechnique } from '@/features/catalog/application/techniques/__tests__/technique-fixture'
import { techniqueToView } from '@/features/catalog/domain/techniques/technique'

const deactivateMessages = catalogMessages.form.deactivate
const reactivateMessages = catalogMessages.form.reactivate

describe('estado de una técnica en su edición', () => {
  it('una técnica activa ofrece desactivar y no reactivar', () => {
    render(<TechniqueForm technique={techniqueToView(makeTechnique({ id: 't1', isActive: true }))} />)

    expect(screen.getByRole('button', { name: deactivateMessages.open })).toBeDefined()
    expect(screen.queryByRole('button', { name: reactivateMessages.open })).toBeNull()
  })

  it('una técnica desactivada ofrece reactivar y no desactivar', () => {
    render(<TechniqueForm technique={techniqueToView(makeTechnique({ id: 't1', isActive: false }))} />)

    expect(screen.getByRole('button', { name: reactivateMessages.open })).toBeDefined()
    expect(screen.queryByRole('button', { name: deactivateMessages.open })).toBeNull()
  })
})
