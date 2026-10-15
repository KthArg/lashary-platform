import type { ComponentType } from 'react'
import Link from 'next/link'
import { CLIENT_PORTAL_ROUTES } from '@/features/auth'
import { PUBLIC_DETAIL_STRINGS } from '../../constants/public-detail-strings'
import { publicDetailRoutes } from '../../constants/public-detail-routes'
import { AddToCartForm } from '../AddToCartForm'
import { SignInToBuyForm } from '../SignInToBuyForm'
import { SoldOutButton } from '../SoldOutButton'
import { toProductDetailView } from './ProductDetail.data'
import { productDetailStyles as STYLES } from './ProductDetail.styles'
import type { ProductDetailProps, PurchaseActionProps, PurchaseMode } from './ProductDetail.types'

const AVAILABILITY_ID = 'product-availability'

const PURCHASE_ACTIONS: Record<PurchaseMode, ComponentType<PurchaseActionProps>> = {
  customer: AddToCartForm,
  guest: SignInToBuyForm,
  soldOut: SoldOutButton,
}

export function ProductDetail({ detail, purchaseAccess }: ProductDetailProps) {
  const view = toProductDetailView(detail, purchaseAccess)
  const PurchaseAction = PURCHASE_ACTIONS[view.purchaseMode]

  return (
    <div className={STYLES.wrapper}>
      <Link href={publicDetailRoutes.catalog} className={STYLES.backButton}>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={STYLES.backIcon}
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        {PUBLIC_DETAIL_STRINGS.backToCatalog}
      </Link>
      <article className={STYLES.article}>
        <figure className={STYLES.figure}>
          <img src={view.imageUrl} alt={view.imageAlt} className={STYLES.image} />
        </figure>
        <div className={STYLES.body}>
          <h1 className={STYLES.title}>{view.name}</h1>
          <p className={STYLES.price}>{view.priceLabel}</p>
          <p id={AVAILABILITY_ID} className={STYLES.availability}>
            <span className={view.availabilityClass}>{view.availabilityText}</span>
          </p>
          <p className={STYLES.description}>{view.description}</p>
          <div className={STYLES.actions}>
            <PurchaseAction
              productId={view.id}
              describedBy={AVAILABILITY_ID}
              cartHref={CLIENT_PORTAL_ROUTES.carrito}
            />
          </div>
        </div>
      </article>
    </div>
  )
}
