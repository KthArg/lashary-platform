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
  techniquesUnavailable: 'No se pudieron cargar las técnicas del catálogo.',
  categoriesUnavailable: 'No se pudieron cargar las categorías de antecedentes.',
  imageMissing: 'Elige una imagen para subir.',
  imageEmpty: 'La imagen está vacía.',
  imageTooLarge: 'La imagen pesa más de 1 MB.',
  imageTypeNotAllowed: 'Solo se aceptan imágenes JPEG, PNG o WebP.',
} as const

export const PRECAUTION_FORM_LABELS = {
  addButton: 'Agregar',
  emptyHint: 'Pulsa «Agregar» para crear uno.',
  recordsCount: (count: number) => (count === 1 ? '1 registro' : `${count} registros`),
  category: 'Categoría',
  chooseCategory: 'Elige una categoría',
  description: 'Descripción',
  save: 'Guardar',
  saving: 'Guardando…',
  cancel: 'Cancelar',
  remove: 'Quitar',
  removeButton: (category: string, description: string) => `Quitar ${category}: ${description}`,
  confirmTitle: '¿Quitar este antecedente?',
  confirmMessage: (category: string, description: string) =>
    `${category}: ${description}. Sale del expediente vigente, pero sigue en el historial.`,
} as const

export const PRECAUTION_CATEGORY_TITLES: Readonly<Record<string, string>> = {
  Alergia: 'Alergias',
  Sensibilidad: 'Sensibilidades',
  'Condición relevante': 'Condiciones relevantes',
}

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

export const RECORD_LABELS = {
  studyHeading: 'Estudio de la clienta',
  initialRecordOn: (date: string) => `Registro inicial · ${date}`,
  initialStudyHeading: 'Estudio inicial',
  recommendedTechnique: 'Técnica recomendada',
  noRecommendedTechnique: 'Sin técnica recomendada',
  precautionsHeading: 'Antecedentes y precauciones',
  noPrecautions: 'Sin antecedentes registrados.',
  imagesHeading: 'Imágenes',
  noImages: 'Sin imágenes todavía.',
  historyHeading: 'Historial de cambios',
  emptyRecord: 'Esta clienta todavía no tiene expediente.',
  loading: 'Cargando expediente…',
  unexpectedError: 'No se pudo cargar el expediente.',
  retry: 'Reintentar',
} as const

export const RECORD_CHANGE_TEXTS = {
  initial: 'Registro inicial',
  precautionAdded: (category: string, description: string) => `Se agregó ${category.toLowerCase()}: ${description}`,
  precautionRemoved: (category: string, description: string) => `Se quitó ${category.toLowerCase()}: ${description}`,
  somePrecautionAdded: 'Se agregó un antecedente',
  somePrecautionRemoved: 'Se quitó un antecedente',
  studyEdited: 'Se editó el estudio',
  imageAdded: 'Se agregó una imagen',
} as const

export const STUDY_FORM_LABELS = {
  createButton: 'Registrar estudio inicial',
  editButton: 'Editar estudio',
  studyText: 'Estudio',
  technique: 'Técnica recomendada',
  noTechniqueOption: 'Sin técnica recomendada',
  save: 'Guardar',
  saving: 'Guardando…',
  cancel: 'Cancelar',
} as const

export const IMAGES_LABELS = {
  imageAlt: (position: number) => `Imagen ${position} del expediente`,
  unavailable: 'Imagen no disponible',
  addPhoto: 'Agregar foto',
  addPhotoHint: 'JPEG, PNG o WebP, hasta 1 MB',
  accept: 'image/jpeg,image/png,image/webp',
  uploading: 'Subiendo…',
  open: (position: number) => `Ampliar imagen ${position}`,
  close: 'Cerrar',
  previous: 'Imagen anterior',
  next: 'Imagen siguiente',
} as const
