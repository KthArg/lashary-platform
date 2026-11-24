export const LEDGER_EXPORT_ROUTE = '/api/admin/ledger-export'

export const LEDGER_EXPORT_RETURN_PATH = '/admin/payments'

export const LEDGER_EXPORT_ERROR_PARAM = 'exportError'

export const LEDGER_EXPORT_ERROR_REASONS = ['range', 'tooLarge', 'unavailable'] as const
export type LedgerExportErrorReason = (typeof LEDGER_EXPORT_ERROR_REASONS)[number]

export const isLedgerExportErrorReason = (value: unknown): value is LedgerExportErrorReason =>
  LEDGER_EXPORT_ERROR_REASONS.some((reason) => reason === value)

export const ledgerExportMessages = {
  title: 'Exportar asientos del ledger',
  subtitle: 'Descarga un CSV con los asientos del rango, en hora del estudio. El rango máximo es de un año.',
  fromLabel: 'Desde',
  toLabel: 'Hasta',
  submit: 'Descargar CSV',
  errors: {
    range: 'Revise las fechas: «desde» no puede ser posterior a «hasta» y el rango no puede pasar de un año.',
    tooLarge: 'El rango tiene demasiados asientos para un solo archivo. Acote las fechas e intente de nuevo.',
    unavailable: 'No se pudo generar el CSV. Intente de nuevo en unos minutos.',
  } satisfies Record<LedgerExportErrorReason, string>,
}
