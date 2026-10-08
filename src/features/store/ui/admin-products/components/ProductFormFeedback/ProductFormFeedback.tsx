import type { ComponentType } from 'react'
import type { ProductActionState } from '../../types/product-action-state'
import { FeedbackIdle } from '../ProductFormFeedbackIdle/ProductFormFeedbackIdle'
import { FeedbackOk } from '../ProductFormFeedbackOk/ProductFormFeedbackOk'
import { FeedbackForbidden } from '../ProductFormFeedbackForbidden/ProductFormFeedbackForbidden'
import { FeedbackInvalido } from '../ProductFormFeedbackInvalid/ProductFormFeedbackInvalid'

const FEEDBACKS: Record<ProductActionState['status'], ComponentType<any>> = {
  idle: FeedbackIdle,
  ok: FeedbackOk,
  forbidden: FeedbackForbidden,
  invalid: FeedbackInvalido,
}

export function Feedback(estado: ProductActionState) {
  const Componente = FEEDBACKS[estado.status]
  return <Componente message={estado.message} problems={estado.problems} />
}
