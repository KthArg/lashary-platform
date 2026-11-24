import { AUTH_LABELS } from '@/features/auth'
import { checkoutMessages } from '@/features/store'

export { CheckoutPage as default } from '@/features/store'

export const metadata = {
  title: `${checkoutMessages.title} | ${AUTH_LABELS.clientPortalTitle} LASHARY`,
}
