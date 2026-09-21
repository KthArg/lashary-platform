import { err, ok, type Result } from '@/shared/result'
import type { CmsUnavailable } from '../domain/errors'
import {
  LOYALTY_KEY,
  LOYALTY_LEVELS_KEY,
  MAX_LOYALTY_LEVELS,
  type LoyaltyContent,
  type LoyaltyLevel,
} from '../domain/loyalty'
import { field, integer, paragraphsOf, text } from './cms-values'
import type { CmsReader } from './ports'

// Lo que devolvió el CMS por cada tipo de la fidelidad, sin validar.
export type RawLoyaltyContent = {
  program: unknown
  levels: unknown[]
}

export const EMPTY_LOYALTY: LoyaltyContent = { paragraphs: [], note: null, levels: [] }

// Lee los dos tipos en paralelo. Si uno falla, falla la lectura entera.
export async function readRawLoyalty(
  reader: CmsReader,
): Promise<Result<RawLoyaltyContent, CmsUnavailable>> {
  const [program, levels] = await Promise.all([
    reader.readSingleton(LOYALTY_KEY),
    reader.readCollection(LOYALTY_LEVELS_KEY),
  ])
  if (!program.ok) return err(program.error)
  if (!levels.ok) return err(levels.error)
  return ok({ program: program.value, levels: levels.value })
}

// Ordenados por visita, no por el orden del editor: la mecánica se lee de la primera visita a
// la última. De dos niveles con la misma visita vale el primero del editor.
function toLevels(items: unknown[]): LoyaltyLevel[] {
  const byVisit = new Map<number, LoyaltyLevel>()
  for (const item of items) {
    const visit = integer(field(item, 'visita'), 1, 50)
    const benefit = text(field(item, 'beneficio'), 80)
    if (visit === null || benefit === null || byVisit.has(visit)) continue
    byVisit.set(visit, { visit, benefit, detail: text(field(item, 'detalle'), 160) })
  }
  return [...byVisit.values()].sort((a, b) => a.visit - b.visit).slice(0, MAX_LOYALTY_LEVELS)
}

// Valida contra el contrato. Sin respaldo: con `raw` null o sin nada publicado, todo vacío, y
// la sección muestra su estado vacío. Nunca lanza.
export function toLoyaltyContent(raw: RawLoyaltyContent | null): LoyaltyContent {
  if (raw === null) return EMPTY_LOYALTY
  const body = text(field(raw.program, 'texto'), 400)
  return {
    paragraphs: body === null ? [] : paragraphsOf(body),
    note: text(field(raw.program, 'nota'), 200),
    levels: toLevels(raw.levels),
  }
}
