import type { ComponentType } from 'react'
import type { ProductActionState } from '../../types/product-action-state'
import { ProductFormFeedbackIdle } from '../ProductFormFeedbackIdle'
import { ProductFormFeedbackOk } from '../ProductFormFeedbackOk'
import { ProductFormFeedbackForbidden } from '../ProductFormFeedbackForbidden'
import { ProductFormFeedbackInvalid } from '../ProductFormFeedbackInvalid'
import type { ProductFormFeedbackProps } from './ProductFormFeedback.types'

const FEEDBACKS: Record<ProductActionState['status'], ComponentType<any>> = {
  idle: ProductFormFeedbackIdle,
  ok: ProductFormFeedbackOk,
  forbidden: ProductFormFeedbackForbidden,
  invalid: ProductFormFeedbackInvalid,
}

export function ProductFormFeedback(state: ProductFormFeedbackProps) {
  const Feedback = FEEDBACKS[state.status]
  return <Feedback message={state.message} problems={state.problems} />
}
