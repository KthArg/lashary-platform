import { isOk } from '@/shared/result'
import { buildRecordContent, type RecordContent } from '../record-content'
import type { Precaution, RecordContentInput } from '../record.types'

export const ALLERGY: Precaution = {
  id: 'precaution-1',
  categoryId: 'category-allergy',
  categoryName: 'Alergia',
  description: 'Cianoacrilato estándar',
}

export const SENSITIVITY: Precaution = {
  id: 'precaution-2',
  categoryId: 'category-sensitivity',
  categoryName: 'Sensibilidad',
  description: 'Piel sensible en el párpado',
}

export const validContentInput = (): RecordContentInput => ({
  studyText: 'Pestaña natural fina y corta',
  recommendedTechnique: { id: 'technique-classic', name: 'Clásicas' },
  precautions: [ALLERGY],
  images: [],
})

export function validContent(input: RecordContentInput = validContentInput()): RecordContent {
  const result = buildRecordContent(input)
  if (!isOk(result)) throw new Error('el contenido de prueba debería ser válido')
  return result.value
}
