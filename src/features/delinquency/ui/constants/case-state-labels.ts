import type { DisplayedState } from '@/features/delinquency/domain/case-history'

export const CASE_STATE_LABELS = {
  pending_review: 'Por confirmar',
  active: 'Activa',
  pending_approval: 'Pendiente de aprobación',
  settled: 'Saldada',
  forgiven: 'Condonada',
  dismissed: 'Descartada',
  lifted: 'Levantada',
} as const satisfies Record<DisplayedState, string>
