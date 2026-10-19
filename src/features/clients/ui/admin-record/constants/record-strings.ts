import type { RecordProblem } from '../../../domain/record/record-errors'

export const RECORD_ERROR_MESSAGES = {
  clientNotFound: 'No encontramos a esta clienta.',
  auditFailed: 'No se pudo registrar el acceso al expediente, así que no se muestra. Intenta de nuevo.',
  invalid: 'Revisa los datos del expediente.',
  recordMissing: 'Esta clienta todavía no tiene registro inicial.',
  recordExists: 'Esta clienta ya tiene registro inicial.',
  versionConflict: 'Alguien actualizó este expediente mientras lo editabas. Recarga para ver los cambios.',
  techniqueNotFound: 'La técnica elegida ya no está disponible en el catálogo.',
  categoryNotFound: 'La categoría elegida no existe.',
  precautionNotFound: 'Ese antecedente ya no está en el expediente.',
  unchanged: 'No hay cambios para guardar.',
} as const

export const RECORD_PROBLEM_MESSAGES: Record<RecordProblem, string> = {
  'study-text-empty': 'Escribe el estudio de la clienta.',
  'study-text-too-long': 'El estudio es demasiado largo.',
  'technique-name-empty': 'La técnica recomendada no tiene nombre.',
  'technique-name-too-long': 'El nombre de la técnica es demasiado largo.',
  'too-many-precautions': 'El expediente llegó al máximo de antecedentes.',
  'precaution-category-empty': 'Elige la categoría del antecedente.',
  'precaution-description-empty': 'Describe el antecedente.',
  'precaution-description-too-long': 'La descripción del antecedente es demasiado larga.',
  'duplicate-precaution': 'Ese antecedente ya está en el expediente.',
  'too-many-images': 'El expediente llegó al máximo de imágenes.',
  'image-path-empty': 'La imagen no tiene ruta.',
  'duplicate-image': 'Esa imagen ya está en el expediente.',
}
