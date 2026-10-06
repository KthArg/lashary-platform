export type TechniqueNotSelectableReason = 'inactive' | 'no_retouch'

export interface TechniqueNotSelectable {
  readonly code: 'SCHEDULING_TECHNIQUE_NOT_SELECTABLE'
  readonly techniqueId: string
  readonly reason: TechniqueNotSelectableReason
  readonly message: string
}

export interface TechniqueNotAvailable {
  readonly code: 'SCHEDULING_TECHNIQUE_NOT_AVAILABLE'
  readonly techniqueId: string
  readonly message: string
}

export type SchedulingError = TechniqueNotSelectable | TechniqueNotAvailable

export const techniqueNotSelectable = (
  techniqueId: string,
  reason: TechniqueNotSelectableReason,
): TechniqueNotSelectable => ({
  code: 'SCHEDULING_TECHNIQUE_NOT_SELECTABLE',
  techniqueId,
  reason,
  message:
    reason === 'inactive'
      ? `la técnica ${techniqueId} no está activa para nuevas reservas`
      : `la técnica ${techniqueId} no ofrece retoque para re-aplicación`,
})

export const techniqueNotAvailable = (techniqueId: string): TechniqueNotAvailable => ({
  code: 'SCHEDULING_TECHNIQUE_NOT_AVAILABLE',
  techniqueId,
  message: `no existe la técnica ${techniqueId} en el catálogo`,
})
