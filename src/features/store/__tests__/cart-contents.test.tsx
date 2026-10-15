import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
} from '@testing-library/react'
import type { CartActionState } from '@/features/store/ui/cart/types/cart-action-state'
import type { CartLineView } from '@/features/store/ui/cart/types/cart-page-view'

const mocks = vi.hoisted(() => ({
  updateCartQuantityAction: vi.fn(),
  removeFromCartAction: vi.fn(),
}))

vi.mock('@/features/store/ui/cart/actions/cart-actions', () => mocks)

import { CartContents } from '@/features/store/ui/cart/components/CartContents'
import {
  REMOVED_QUANTITY,
  applyCartLineChange,
  cartSubtotalLabel,
} from '@/features/store/ui/cart/components/CartContents/CartContents.data'
import { CART_PAGE_STRINGS } from '@/features/store/ui/cart/constants/cart-page-strings'
import { CART_STRINGS } from '@/features/store/ui/cart/constants/cart-strings'
import { MAX_CART_QUANTITY } from '@/features/store/domain/cart'
import { formatPriceCrc } from '@/features/store/domain/product'

const SERUM_PRICE = 18000
const BRUSH_PRICE = 12000

function makeLine(overrides: Partial<CartLineView>): CartLineView {
  return {
    productId: 'producto-serum',
    name: 'Serum nutritivo Lashary',
    href: '/productos/serum-nutritivo-lashary',
    imageUrl: '/productos/serum-nutritivo.jpg',
    imageAlt: 'Producto: Serum nutritivo Lashary',
    unitPriceLabel: formatPriceCrc(SERUM_PRICE),
    unitPriceColones: SERUM_PRICE,
    quantity: 1,
    ...overrides,
  }
}

const serum = makeLine({})
const brush = makeLine({
  productId: 'producto-cepillo',
  name: 'Cepillo limpiador Lashary',
  unitPriceColones: BRUSH_PRICE,
})

const SETTLED_STATE: CartActionState = { status: 'idle' }
let settlePendingAction: (value: CartActionState) => void = () => {}

function pendingAction() {
  const pending = new Promise<CartActionState>((resolve) => {
    settlePendingAction = resolve
  })
  mocks.updateCartQuantityAction.mockReturnValue(pending)
  mocks.removeFromCartAction.mockReturnValue(pending)
}

const keepSpaces = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) }

function displayed(text: string) {
  return screen.getByText(text, keepSpaces)
}

async function click(buttonName: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: buttonName }))
  })
}

beforeEach(() => vi.clearAllMocks())
afterEach(async () => {
  await act(async () => settlePendingAction(SETTLED_STATE))
  cleanup()
})

describe('US-SHOP-01: cambiar el carrito desde la página', () => {
  it('criterio 2: al sumar una unidad, la cantidad, el total y el subtotal cambian sin esperar al servidor', async () => {
    pendingAction()
    render(<CartContents lines={[serum, brush]} />)
    expect(displayed(formatPriceCrc(SERUM_PRICE + BRUSH_PRICE))).toBeDefined()

    await click(CART_PAGE_STRINGS.increaseLabel(serum.name))

    expect(screen.getByText(CART_PAGE_STRINGS.quantity(2))).toBeDefined()
    expect(displayed(formatPriceCrc(SERUM_PRICE * 2))).toBeDefined()
    expect(displayed(formatPriceCrc(SERUM_PRICE * 2 + BRUSH_PRICE))).toBeDefined()
  })

  it('criterio 1: restar envía la cantidad nueva del producto', async () => {
    pendingAction()
    render(<CartContents lines={[makeLine({ quantity: 3 })]} />)

    await click(CART_PAGE_STRINGS.decreaseLabel(serum.name))

    const form: FormData = mocks.updateCartQuantityAction.mock.calls[0][1]
    expect(form.get('productId')).toBe(serum.productId)
    expect(form.get('quantity')).toBe('2')
  })

  it('criterio 1: quitar la única línea muestra el carrito vacío', async () => {
    pendingAction()
    render(<CartContents lines={[serum]} />)

    await click(CART_PAGE_STRINGS.removeLabel(serum.name))

    const form: FormData = mocks.removeFromCartAction.mock.calls[0][1]
    expect(form.get('productId')).toBe(serum.productId)
    expect(screen.getByText(CART_PAGE_STRINGS.emptyTitle)).toBeDefined()
  })

  it('si el servidor rechaza el cambio, vuelve a la cantidad anterior y avisa', async () => {
    pendingAction()
    render(<CartContents lines={[serum]} />)
    await click(CART_PAGE_STRINGS.increaseLabel(serum.name))

    await act(async () => {
      settlePendingAction({ status: 'unavailable', message: CART_STRINGS.unavailable })
    })

    expect(screen.getByText(CART_PAGE_STRINGS.quantity(1))).toBeDefined()
    expect(screen.getByRole('status').textContent).toBe(CART_STRINGS.unavailable)
  })

  it('restar se deshabilita en 1 unidad y sumar en el máximo', () => {
    render(<CartContents lines={[serum, makeLine({ ...brush, quantity: MAX_CART_QUANTITY })]} />)

    const decrease = screen.getByRole('button', { name: CART_PAGE_STRINGS.decreaseLabel(serum.name) })
    const increase = screen.getByRole('button', { name: CART_PAGE_STRINGS.increaseLabel(brush.name) })
    expect((decrease as HTMLButtonElement).disabled).toBe(true)
    expect((increase as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('cálculos del carrito en la página', () => {
  it('applyCartLineChange cambia solo la línea indicada y quita la línea marcada como quitada', () => {
    const changed = applyCartLineChange([serum, brush], { productId: serum.productId, quantity: 4 })
    expect(changed.map((line) => line.quantity)).toEqual([4, 1])

    const removed = applyCartLineChange([serum, brush], {
      productId: serum.productId,
      quantity: REMOVED_QUANTITY,
    })
    expect(removed.map((line) => line.productId)).toEqual([brush.productId])
  })

  it('cartSubtotalLabel suma precio por cantidad de cada línea', () => {
    expect(cartSubtotalLabel([makeLine({ quantity: 2 }), brush])).toBe(
      formatPriceCrc(SERUM_PRICE * 2 + BRUSH_PRICE),
    )
  })
})
