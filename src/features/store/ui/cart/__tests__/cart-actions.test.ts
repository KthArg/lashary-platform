import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createFakeCartRepository,
  makeCartProduct,
  type FakeCartRepository,
} from '@/features/store/application/cart/__tests__/fake-cart-repository'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  revalidatePath: vi.fn(),
  repo: null as FakeCartRepository | null,
}))

vi.mock('@/features/auth', () => ({
  getAuthSession: mocks.getAuthSession,
  CLIENT_PORTAL_ROUTES: { carrito: '/portal/carrito' },
}))
vi.mock('@/features/store/db/cart-repository', () => ({
  cartRepository: vi.fn(async () => mocks.repo),
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import {
  addToCartAction,
  removeFromCartAction,
  updateCartQuantityAction,
} from '@/features/store/ui/cart/actions/cart-actions'
import { initialCartActionState } from '@/features/store/ui/cart/types/cart-action-state'
import { CART_STRINGS } from '@/features/store/ui/cart/constants/cart-strings'

const CUSTOMER_ID = '6f1c2b7e-0d6a-4c1e-9a55-1b2c3d4e5f60'
const OTHER_CUSTOMER_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
const SERUM_ID = '2d4f6a8c-1b3e-4d5f-8a7c-9e0b1c2d3e4f'
const RETIRED_ID = '7e9a1c3b-5d7f-4e9a-8b1c-3d5e7f9a1b2c'

function form(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return formData
}

function signedIn(userId: string = CUSTOMER_ID) {
  mocks.getAuthSession.mockResolvedValue({ user: { id: userId }, role: 'cliente', profile: null })
}

describe('acciones del carrito', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.repo = createFakeCartRepository([
      makeCartProduct({ id: SERUM_ID }),
      makeCartProduct({ id: RETIRED_ID, isActive: false }),
    ])
    signedIn()
  })

  it('sin sesión no toca el carrito y pide iniciar sesión', async () => {
    mocks.getAuthSession.mockResolvedValue(null)

    const state = await addToCartAction(initialCartActionState, form({ productId: SERUM_ID }))

    expect(state).toEqual({ status: 'unauthenticated', message: CART_STRINGS.unauthenticated })
    expect(mocks.repo?.saveCalls).toBe(0)
  })

  it('agrega una unidad al carrito de la clienta de la sesión y refresca la página del carrito', async () => {
    const state = await addToCartAction(initialCartActionState, form({ productId: SERUM_ID }))

    expect(state).toEqual({ status: 'ok', message: CART_STRINGS.added })
    expect(await mocks.repo?.findQuantity(CUSTOMER_ID, SERUM_ID)).toBe(1)
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/portal/carrito')
  })

  it('ignora un userId que llegue en el formulario: escribe en el carrito de la sesión', async () => {
    await addToCartAction(
      initialCartActionState,
      form({ productId: SERUM_ID, userId: OTHER_CUSTOMER_ID }),
    )

    expect(await mocks.repo?.findQuantity(OTHER_CUSTOMER_ID, SERUM_ID)).toBeNull()
    expect(await mocks.repo?.findQuantity(CUSTOMER_ID, SERUM_ID)).toBe(1)
  })

  it('rechaza un productId que no es un uuid sin tocar el carrito', async () => {
    const state = await addToCartAction(initialCartActionState, form({ productId: 'serum' }))

    expect(state).toEqual({ status: 'invalid', message: CART_STRINGS.invalidRequest })
    expect(mocks.repo?.saveCalls).toBe(0)
  })

  it('avisa que un producto desactivado ya no está disponible', async () => {
    const state = await addToCartAction(initialCartActionState, form({ productId: RETIRED_ID }))

    expect(state).toEqual({ status: 'unavailable', message: CART_STRINGS.unavailable })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('cambia la cantidad de una línea del carrito', async () => {
    await addToCartAction(initialCartActionState, form({ productId: SERUM_ID }))

    const state = await updateCartQuantityAction(
      initialCartActionState,
      form({ productId: SERUM_ID, quantity: '4' }),
    )

    expect(state).toEqual({ status: 'ok', message: CART_STRINGS.updated })
    expect(await mocks.repo?.findQuantity(CUSTOMER_ID, SERUM_ID)).toBe(4)
  })

  it('rechaza una cantidad fuera de 1 a 99 con el mensaje del rango', async () => {
    await addToCartAction(initialCartActionState, form({ productId: SERUM_ID }))

    const state = await updateCartQuantityAction(
      initialCartActionState,
      form({ productId: SERUM_ID, quantity: '100' }),
    )

    expect(state).toEqual({ status: 'invalid', message: CART_STRINGS.invalidQuantity })
    expect(await mocks.repo?.findQuantity(CUSTOMER_ID, SERUM_ID)).toBe(1)
  })

  it('rechaza una cantidad que no es un número entero', async () => {
    const state = await updateCartQuantityAction(
      initialCartActionState,
      form({ productId: SERUM_ID, quantity: '2.5' }),
    )

    expect(state).toEqual({ status: 'invalid', message: CART_STRINGS.invalidRequest })
  })

  it('avisa si se cambia la cantidad de un producto que ya no está en el carrito', async () => {
    const state = await updateCartQuantityAction(
      initialCartActionState,
      form({ productId: SERUM_ID, quantity: '2' }),
    )

    expect(state).toEqual({ status: 'unavailable', message: CART_STRINGS.lineNotFound })
  })

  it('quita una línea del carrito de la clienta', async () => {
    await addToCartAction(initialCartActionState, form({ productId: SERUM_ID }))

    const state = await removeFromCartAction(initialCartActionState, form({ productId: SERUM_ID }))

    expect(state).toEqual({ status: 'ok', message: CART_STRINGS.removed })
    expect(await mocks.repo?.findQuantity(CUSTOMER_ID, SERUM_ID)).toBeNull()
  })

  it('quitar sin sesión no borra nada', async () => {
    await addToCartAction(initialCartActionState, form({ productId: SERUM_ID }))
    mocks.getAuthSession.mockResolvedValue(null)

    const state = await removeFromCartAction(initialCartActionState, form({ productId: SERUM_ID }))

    expect(state.status).toBe('unauthenticated')
    expect(await mocks.repo?.findQuantity(CUSTOMER_ID, SERUM_ID)).toBe(1)
  })
})
