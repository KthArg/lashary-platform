import { describe, it, expect } from 'vitest'
import { describeVersion, formatRecordDate } from '../record-history'
import { RECORD_CHANGE_TEXTS } from '../constants/record-strings'
import { ALLERGY, SENSITIVITY } from '@/features/clients/domain/record/__tests__/record-fixtures'
import { ADDED_VIEW, INITIAL_VIEW, REMOVED_VIEW } from './record-view-fixtures'

describe('describeVersion — el texto de cada línea del historial (criterio 4)', () => {
  it('el registro inicial se nombra como tal', () => {
    expect(describeVersion(INITIAL_VIEW, undefined)).toBe(RECORD_CHANGE_TEXTS.initial)
  })

  it('nombra el antecedente que se agregó, comparando con la versión anterior', () => {
    expect(describeVersion(ADDED_VIEW, INITIAL_VIEW)).toBe(
      RECORD_CHANGE_TEXTS.precautionAdded(SENSITIVITY.categoryName, SENSITIVITY.description),
    )
  })

  it('nombra el antecedente que se quitó', () => {
    expect(describeVersion(REMOVED_VIEW, ADDED_VIEW)).toBe(
      RECORD_CHANGE_TEXTS.precautionRemoved(ALLERGY.categoryName, ALLERGY.description),
    )
  })

  it('sin la versión anterior a la vista, lo agregado es el último antecedente', () => {
    expect(describeVersion(ADDED_VIEW, undefined)).toBe(
      RECORD_CHANGE_TEXTS.precautionAdded(SENSITIVITY.categoryName, SENSITIVITY.description),
    )
  })

  it('sin la versión anterior a la vista, no inventa qué antecedente se quitó', () => {
    expect(describeVersion(REMOVED_VIEW, undefined)).toBe(RECORD_CHANGE_TEXTS.somePrecautionRemoved)
  })

  it('editar el estudio y agregar una imagen tienen su propio texto', () => {
    expect(describeVersion({ ...ADDED_VIEW, changeKind: 'study_edited' }, INITIAL_VIEW)).toBe(RECORD_CHANGE_TEXTS.studyEdited)
    expect(describeVersion({ ...ADDED_VIEW, changeKind: 'image_added' }, INITIAL_VIEW)).toBe(RECORD_CHANGE_TEXTS.imageAdded)
  })
})

describe('formatRecordDate — la fecha se muestra en la hora del estudio', () => {
  it('una versión guardada a las 03:00 UTC es todavía el día anterior en Costa Rica', () => {
    const shown = formatRecordDate('2026-10-18T03:00:00.000Z')
    expect(shown).toContain('17')
    expect(shown).toContain('2026')
  })
})
