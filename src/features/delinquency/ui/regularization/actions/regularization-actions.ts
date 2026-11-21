'use server'

import { revalidatePath } from 'next/cache'
import { ACCOUNT_PATH, REGULARIZATION_FIELDS } from '../constants/regularization-strings'
import { regularizationService } from '../services/regularization-service'
import type { SubmitRegularizationResult } from '../types/regularization-results'

// Firma de useActionState: el estado anterior no se usa, cada envío es independiente.
export async function submitRegularizationAction(
  _previous: SubmitRegularizationResult | null,
  formData: FormData,
): Promise<SubmitRegularizationResult> {
  const result = await regularizationService.submit({
    caseId: formData.get(REGULARIZATION_FIELDS.caseId),
    declaredAmount: formData.get(REGULARIZATION_FIELDS.declaredAmount),
    reference: formData.get(REGULARIZATION_FIELDS.reference),
    receipt: formData.get(REGULARIZATION_FIELDS.receipt),
  })
  if (result.ok) revalidatePath(ACCOUNT_PATH)
  return result
}
