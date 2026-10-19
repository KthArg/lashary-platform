import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { RECORD_LABELS, RecordLoadError, RecordView } from '@/features/clients'
import { RECORD_CHANGE_TEXTS } from '../constants/record-strings'
import { formatRecordDate } from '../record-history'
import { ALLERGY, SENSITIVITY } from '../../../domain/record/__tests__/record-fixtures'
import { ADDED_VIEW, INITIAL_VIEW } from './record-view-fixtures'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

beforeEach(() => vi.clearAllMocks())

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'

const sectionNamed = (heading: string) => screen.getByRole('heading', { name: heading }).closest('section') as HTMLElement

describe('RecordView — la pestaña Expediente (criterios 1, 2 y 4)', () => {
  it('muestra el estudio, la técnica recomendada y la fecha del registro inicial', () => {
    render(<RecordView clientId={CLIENT_ID} techniques={[]} categories={[]} imageUrls={{}} current={ADDED_VIEW} history={[ADDED_VIEW, INITIAL_VIEW]} />)
    expect(screen.getByRole('heading', { name: RECORD_LABELS.studyHeading })).toBeTruthy()
    expect(screen.getByText(RECORD_LABELS.initialRecordOn(formatRecordDate(INITIAL_VIEW.createdAt)))).toBeTruthy()
    expect(within(sectionNamed(RECORD_LABELS.initialStudyHeading)).getByText(ADDED_VIEW.studyText)).toBeTruthy()
    expect(within(sectionNamed(RECORD_LABELS.initialStudyHeading)).getByText('Clásicas')).toBeTruthy()
  })

  it('lista cada antecedente con su categoría', () => {
    render(<RecordView clientId={CLIENT_ID} techniques={[]} categories={[]} imageUrls={{}} current={ADDED_VIEW} history={[ADDED_VIEW, INITIAL_VIEW]} />)
    const items = within(sectionNamed(RECORD_LABELS.precautionsHeading)).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain(`${ALLERGY.categoryName}${ALLERGY.description}`)
    expect(items[1].textContent).toContain(`${SENSITIVITY.categoryName}${SENSITIVITY.description}`)
  })

  it('el historial va de lo más nuevo a lo más viejo, con fecha y qué cambió', () => {
    render(<RecordView clientId={CLIENT_ID} techniques={[]} categories={[]} imageUrls={{}} current={ADDED_VIEW} history={[ADDED_VIEW, INITIAL_VIEW]} />)
    const items = within(sectionNamed(RECORD_LABELS.historyHeading)).getAllByRole('listitem')
    expect(items[0].textContent).toContain(RECORD_CHANGE_TEXTS.precautionAdded(SENSITIVITY.categoryName, SENSITIVITY.description))
    expect(items[0].querySelector('time')?.getAttribute('dateTime')).toBe(ADDED_VIEW.createdAt)
    expect(items[1].textContent).toContain(RECORD_CHANGE_TEXTS.initial)
  })

  it('sin técnica, sin antecedentes y sin imágenes lo dice en vez de dejar huecos', () => {
    const bare = { ...INITIAL_VIEW, recommendedTechnique: null, precautions: [] }
    render(<RecordView clientId={CLIENT_ID} techniques={[]} categories={[]} imageUrls={{}} current={bare} history={[bare]} />)
    expect(screen.getByText(RECORD_LABELS.noRecommendedTechnique)).toBeTruthy()
    expect(screen.getByText(RECORD_LABELS.noPrecautions)).toBeTruthy()
    expect(screen.getByText(RECORD_LABELS.noImages)).toBeTruthy()
  })

  it('una clienta sin expediente ve el estado vacío', () => {
    render(<RecordView clientId={CLIENT_ID} techniques={[]} categories={[]} imageUrls={{}} current={null} history={[]} />)
    expect(screen.getByText(RECORD_LABELS.emptyRecord)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: RECORD_LABELS.historyHeading })).toBeNull()
  })
})

describe('RecordLoadError — el estado de error con reintento (UI-003)', () => {
  it('anuncia el error y Reintentar vuelve a pedir la página', () => {
    render(<RecordLoadError message={RECORD_LABELS.unexpectedError} />)
    expect(screen.getByRole('alert').textContent).toContain(RECORD_LABELS.unexpectedError)
    fireEvent.click(screen.getByRole('button', { name: RECORD_LABELS.retry }))
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('usa el reintento que le pasen, como el reset del límite de error', () => {
    const onRetry = vi.fn()
    render(<RecordLoadError message={RECORD_LABELS.unexpectedError} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: RECORD_LABELS.retry }))
    expect(onRetry).toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})
