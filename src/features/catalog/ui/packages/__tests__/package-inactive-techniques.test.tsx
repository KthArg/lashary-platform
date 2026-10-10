import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { makeTechnique } from '@/features/catalog/application/techniques/__tests__/technique-fixture'

vi.mock('@/features/catalog/ui/packages/actions/package-actions', () => ({
  createPackageAction: vi.fn(),
  updatePackageAction: vi.fn(),
  deactivatePackageAction: vi.fn(),
}))

import { PackageForm } from '@/features/catalog/ui/packages/components/PackageForm'
import { PackageTable } from '@/features/catalog/ui/packages/components/PackageTable'
import { packageMessages } from '@/features/catalog/ui/packages/constants/package-strings'
import type { PackageListItem } from '@/features/catalog/application/packages/queries'

const active = makeTechnique({ id: 't1', name: 'Set clásico', isActive: true }).toView()
const inactive = makeTechnique({ id: 't2', name: 'Henna', isActive: false }).toView()

const pkg: PackageListItem = {
  id: 'p1',
  name: 'Cejas express',
  techniqueIds: ['t1', 't2'],
  price: 17000,
  deposit: 0,
  isActive: true,
  durationTotalMin: 90,
}

describe('paquetes con técnicas desactivadas', () => {
  it('el formulario de edición muestra la técnica desactivada marcada y avisa que hay que quitarla', () => {
    render(<PackageForm pkg={pkg} techniques={[active, inactive]} />)

    const henna = screen.getByRole('checkbox', { name: /Henna/ }) as HTMLInputElement
    expect(henna.checked).toBe(true)
    expect(screen.getByText(packageMessages.form.inactiveTechnique)).toBeDefined()
    expect(screen.getByText(packageMessages.form.inactiveHint)).toBeDefined()
  })

  it('sin técnicas desactivadas seleccionadas no hay aviso', () => {
    render(<PackageForm techniques={[active]} />)

    expect(screen.queryByText(packageMessages.form.inactiveHint)).toBeNull()
  })

  it('la tabla marca la técnica desactivada junto a su nombre', () => {
    render(
      <PackageTable
        items={[pkg]}
        techniqueNameById={new Map([['t1', 'Set clásico'], ['t2', 'Henna']])}
        inactiveTechniqueIds={new Set(['t2'])}
      />,
    )

    expect(
      screen.getByText(`Set clásico, Henna ${packageMessages.admin.inactiveTechnique}`),
    ).toBeDefined()
  })
})
