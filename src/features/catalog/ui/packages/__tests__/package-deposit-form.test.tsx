import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTechnique } from '@/features/catalog/application/__tests__/technique-fixture'
import { PackageForm } from '../components/PackageForm'
import { PackageTable } from '../components/PackageTable'

const mocks = vi.hoisted(() => ({ crear: vi.fn(), editar: vi.fn(), desactivar: vi.fn() }))
vi.mock('../actions/package-actions', () => ({
  createPackageAction: (...args: unknown[]) => mocks.crear(...args),
  updatePackageAction: (...args: unknown[]) => mocks.editar(...args),
  deactivatePackageAction: (...args: unknown[]) => mocks.desactivar(...args),
}))
const techniques = ['t1', 't2'].map((id) => makeTechnique({ id }).toView())
const pkg = {
  id: 'p1', name: 'Paquete con anticipo', techniqueIds: ['t1', 't2'],
  price: 30000, deposit: 9000, isActive: true, durationTotalMin: 60,
}

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.crear.mockResolvedValue({ status: 'ok' })
  mocks.editar.mockResolvedValue({ status: 'ok' })
})

describe('anticipo en el panel de paquetes', () => {
  it('crear muestra anticipo cero y envía el monto elegido', async () => {
    render(<PackageForm techniques={techniques} />)
    const input = screen.getByLabelText('Anticipo requerido (colones)') as HTMLInputElement
    expect(input.value).toBe('0')
    expect(input.required).toBe(true)
    expect(input.min).toBe('0')
    expect(input.step).toBe('1')
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: pkg.name } })
    fireEvent.change(screen.getByLabelText('Precio del paquete (colones)'), { target: { value: '30000' } })
    screen.getAllByRole('checkbox').forEach((checkbox) => fireEvent.click(checkbox))
    fireEvent.change(input, { target: { value: '9000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear paquete' }))
    await waitFor(() => expect(mocks.crear).toHaveBeenCalled())
    expect((mocks.crear.mock.calls[0][1] as FormData).get('deposit')).toBe('9000')
  })

  it('editar carga el anticipo guardado y envía el nuevo monto', async () => {
    render(<PackageForm pkg={pkg} techniques={techniques} />)
    const input = screen.getByLabelText('Anticipo requerido (colones)') as HTMLInputElement
    expect(input.value).toBe('9000')
    fireEvent.change(input, { target: { value: '11000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(mocks.editar).toHaveBeenCalled())
    expect((mocks.editar.mock.calls[0][1] as FormData).get('deposit')).toBe('11000')
  })

  it('el listado muestra el anticipo propio del paquete', () => {
    render(<PackageTable items={[pkg]} techniqueNameById={new Map()} />)
    expect(screen.getByRole('columnheader', { name: 'Anticipo' })).toBeDefined()
    expect(screen.getByText(/9[.,\s]000/)).toBeDefined()
  })
})
