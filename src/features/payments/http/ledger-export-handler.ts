import { getAuthSession, isStaffRole } from '@/features/auth'
import { logError } from '@/shared/logger'
import { exportLedger } from '../application/export-ledger'
import { ledgerExportRepository } from '../db/ledger-export-repository'
import { isInvalidLedgerRange, isLedgerExportTooLarge } from '../domain/errors'
import { LEDGER_EXPORT_QUERY } from '../domain/ledger-export-range'
import {
  LEDGER_EXPORT_ERROR_PARAM,
  LEDGER_EXPORT_RETURN_PATH,
  type LedgerExportErrorReason,
} from '../ui/admin-ledger-export/constants/ledger-export-strings'

export const LEDGER_EXPORT_CONTENT_TYPE = 'text/csv; charset=utf-8'

export const LEDGER_EXPORT_ERRORS = {
  unauthenticated: 'inicie sesión como administradora',
  forbidden: 'no tiene permisos para exportar el ledger',
} as const

const backToFormWith = (request: Request, reason: LedgerExportErrorReason): Response => {
  const target = new URL(LEDGER_EXPORT_RETURN_PATH, request.url)
  target.searchParams.set(LEDGER_EXPORT_ERROR_PARAM, reason)
  return Response.redirect(target, 303)
}

export async function receiveLedgerExportRequest(request: Request): Promise<Response> {
  try {
    const session = await getAuthSession()
    if (session === null) {
      return Response.json({ error: LEDGER_EXPORT_ERRORS.unauthenticated }, { status: 401 })
    }
    if (!isStaffRole(session.role)) {
      return Response.json({ error: LEDGER_EXPORT_ERRORS.forbidden }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const result = await exportLedger({ repo: await ledgerExportRepository() })({
      fromDate: searchParams.get(LEDGER_EXPORT_QUERY.from),
      toDate: searchParams.get(LEDGER_EXPORT_QUERY.to),
    })

    if (result.ok) {
      return new Response(result.value.csv, {
        headers: {
          'Content-Type': LEDGER_EXPORT_CONTENT_TYPE,
          'Content-Disposition': `attachment; filename="${result.value.filename}"`,
        },
      })
    }
    if (isInvalidLedgerRange(result.error)) return backToFormWith(request, 'range')
    if (isLedgerExportTooLarge(result.error)) return backToFormWith(request, 'tooLarge')
    logError('payments', 'el export del ledger falló', result.error.message)
  } catch (cause) {
    logError('payments', 'el export del ledger lanzó', cause instanceof Error ? cause.message : String(cause))
  }
  return backToFormWith(request, 'unavailable')
}
