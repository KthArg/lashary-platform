import { describe, expect, it, vi } from 'vitest'
import { productRoutes } from '@/features/store/client'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

import AdminStoreRedirect from './page'

describe('/admin/store', () => {
  it('redirige a la pestaña Productos del catálogo', () => {
    AdminStoreRedirect()

    expect(mocks.redirect).toHaveBeenCalledWith(productRoutes.admin)
  })
})
