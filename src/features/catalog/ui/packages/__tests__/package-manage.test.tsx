import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/features/catalog/ui/packages/actions/package-actions', () => ({
  setPackageActiveAction: vi.fn(),
  deletePackageAction: vi.fn(),
}))

import { PackageStatusToggle } from '@/features/catalog/ui/packages/components/PackageStatusToggle'
import { DeletePackageDialog } from '@/features/catalog/ui/packages/components/DeletePackageDialog'
import { packageMessages } from '@/features/catalog/ui/packages/constants/package-strings'

const formMessages = packageMessages.form

describe('gestión de un paquete', () => {
  it('el interruptor refleja el estado y envía el estado contrario', () => {
    const { container } = render(<PackageStatusToggle packageId="p1" isActive={true} />)

    const toggle = screen.getByRole('switch', { name: formMessages.status.label }) as HTMLInputElement
    expect(toggle.checked).toBe(true)
    expect(screen.getByText(formMessages.status.active)).toBeDefined()
    expect(container.querySelector('input[name="active"]')?.getAttribute('value')).toBe('false')
  })

  it('un paquete desactivado muestra el interruptor apagado', () => {
    render(<PackageStatusToggle packageId="p1" isActive={false} />)

    expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(false)
    expect(screen.getByText(formMessages.status.inactive)).toBeDefined()
  })

  it('eliminar pide confirmación antes de borrar', () => {
    render(<DeletePackageDialog packageId="p1" packageName="Cejas express" />)

    expect(screen.getByRole('button', { name: formMessages.remove.open })).toBeDefined()
    expect(screen.getByText(formMessages.remove.body)).toBeDefined()
    expect(screen.getByRole('button', { name: formMessages.remove.confirm, hidden: true })).toBeDefined()
  })

  it('cada diálogo de eliminar se nombra con su propio título, aunque haya varios paquetes en pantalla', () => {
    const { container } = render(
      <>
        <DeletePackageDialog packageId="p1" packageName="Cejas express" />
        <DeletePackageDialog packageId="p2" packageName="Pestañas clásicas" />
      </>,
    )

    const dialogs = Array.from(container.querySelectorAll('dialog'))
    const titleIds = dialogs.map((dialog) => dialog.getAttribute('aria-labelledby'))

    expect(new Set(titleIds).size).toBe(2)
    for (const dialog of dialogs) {
      const titleId = dialog.getAttribute('aria-labelledby') ?? ''
      expect(dialog.querySelector(`[id="${titleId}"]`)?.textContent).toBe(formMessages.remove.title)
    }
  })
})
