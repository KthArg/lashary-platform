import { ALLERGY, SENSITIVITY } from '../../../domain/record/__tests__/record-fixtures'
import type { RecordVersionView } from '../types/record-action-results'

export const INITIAL_VIEW: RecordVersionView = {
  id: 'version-1',
  previousVersionId: null,
  changeKind: 'initial',
  studyText: 'Pestaña natural fina y corta',
  recommendedTechnique: { id: 'technique-classic', name: 'Clásicas' },
  precautions: [ALLERGY],
  images: [],
  createdBy: 'admin-1',
  createdAt: '2026-10-17T15:00:00.000Z',
}

export const ADDED_VIEW: RecordVersionView = {
  ...INITIAL_VIEW,
  id: 'version-2',
  previousVersionId: 'version-1',
  changeKind: 'precaution_added',
  precautions: [ALLERGY, SENSITIVITY],
  createdAt: '2026-11-02T15:00:00.000Z',
}

export const REMOVED_VIEW: RecordVersionView = {
  ...ADDED_VIEW,
  id: 'version-3',
  previousVersionId: 'version-2',
  changeKind: 'precaution_removed',
  precautions: [SENSITIVITY],
  createdAt: '2026-11-20T15:00:00.000Z',
}
