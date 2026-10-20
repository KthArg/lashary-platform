import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  getClientAction: vi.fn(),
  pathname: '',
}))

vi.mock('@/features/auth', () => ({ requireAdminSession: mocks.requireAdminSession }))
vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))
vi.mock('@/features/clients', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/clients')>()),
  getClientAction: mocks.getClientAction,
}))

import ClientProfileLayout from './layout'
import { CLIENT_PROFILE_LABELS, CLIENTS_PATH, clientRecordPath } from '@/features/clients'

const renderLayout = async () =>
  render(await ClientProfileLayout({ children: <div>contenido</div>, params: Promise.resolve({ id: CLIENT_ID }) }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminSession.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
  mocks.pathname = clientRecordPath(CLIENT_ID)
  mocks.getClientAction.mockResolvedValue({
    ok: true,
    client: { id: CLIENT_ID, fullName: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: '' },
  })
})

describe('/admin/clients/<id>: la ficha de la clienta', () => {
  it('muestra el nombre y el teléfono de la clienta, y el regreso al listado', async () => {
    await renderLayout()
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Solís' })).toBeTruthy()
    expect(screen.getByText('+50688887777')).toBeTruthy()
    expect(screen.getByRole('link', { name: CLIENT_PROFILE_LABELS.backToClients }).getAttribute('href')).toBe(CLIENTS_PATH)
    expect(screen.getByText('contenido')).toBeTruthy()
  })

  it('la pestaña Expediente apunta al expediente y se marca activa en su ruta', async () => {
    await renderLayout()
    const nav = screen.getByRole('navigation', { name: CLIENT_PROFILE_LABELS.tabsLabel })
    const tab = screen.getByRole('link', { name: CLIENT_PROFILE_LABELS.recordTab })
    expect(nav.contains(tab)).toBe(true)
    expect(tab.getAttribute('href')).toBe(clientRecordPath(CLIENT_ID))
    expect(tab.getAttribute('aria-current')).toBe('page')
  })

  it('una clienta que no existe lleva a la página de no encontrada', async () => {
    mocks.getClientAction.mockResolvedValue({ ok: false, reason: 'not-found', error: 'no existe' })
    await expect(renderLayout()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('si los datos de la clienta no cargan, lo avisa y deja ver la pestaña', async () => {
    mocks.getClientAction.mockResolvedValue({ ok: false, reason: 'failed', error: 'no cargó' })
    await renderLayout()
    expect(screen.getByRole('alert').textContent).toBe('no cargó')
    expect(screen.getByText('contenido')).toBeTruthy()
  })

  it('propaga el redirect cuando no hay sesión de administradora', async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error('NEXT_REDIRECT:/admin'))
    await expect(renderLayout()).rejects.toThrow('NEXT_REDIRECT:/admin')
    expect(mocks.getClientAction).not.toHaveBeenCalled()
  })
})
